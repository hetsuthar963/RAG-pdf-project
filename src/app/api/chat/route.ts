import { db } from "@/lib/db";
import { chats, message as _message } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import OpenAI from "openai";
import { NextResponse, NextRequest } from "next/server";
import { getContext } from "@/lib/context";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

console.log("[CHAT-API] ========== CHAT API MODULE INITIALIZED ==========");

export async function POST(req: NextRequest) {
  console.log("[CHAT-API] ========== NEW CHAT REQUEST ==========");

  // Validate DeepSeek API key - support both naming conventions
  const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  console.log("[CHAT-API] Raw API_KEY:", deepseekKey ? `${deepseekKey.substring(0, 8)}...` : "NOT SET");
  console.log("[CHAT-API] Available env keys:", Object.keys(process.env).filter(k => k.includes("API") || k.includes("DEEPSEEK")).join(", "));
  
  if (!deepseekKey || deepseekKey.length < 10) {
    console.error("[CHAT-API] API key is missing or too short");
    return NextResponse.json({ 
      error: "DeepSeek API key is not configured properly. Please add DEEPSEEK_API_KEY to Vercel project settings." 
    }, { status: 500 });
  }

  // Create OpenAI client with DeepSeek
  const openai = new OpenAI({
    apiKey: deepseekKey,
    baseURL: "https://api.deepseek.com",
  });

  const { userId } = await getAuth(req);
  console.log("[CHAT-API] User authenticated:", !!userId);

  if (!userId) {
    console.log("[CHAT-API] Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[CHAT-API] Parsing request body...");
    const body = await req.json();
    const { chatId: rawChatId, messages } = body;
    console.log("[CHAT-API] chatId:", rawChatId);
    console.log("[CHAT-API] messages count:", messages?.length || 0);

    const chatId = typeof rawChatId === "string" ? parseInt(rawChatId, 10) : rawChatId;

    if (!chatId || isNaN(chatId)) {
      console.log("[CHAT-API] Invalid chatId:", rawChatId);
      return NextResponse.json({ error: "Invalid Chat ID" }, { status: 400 });
    }

    console.log("[CHAT-API] Looking up chat in database...");
    const _chats = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

    if (_chats.length !== 1) {
      console.log("[CHAT-API] Chat not found for user:", userId, "chatId:", chatId);
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const fileKey = _chats[0].fileKey;
    console.log("[CHAT-API] Found chat with fileKey:", fileKey);

    const lastMessage = messages[messages.length - 1];
    console.log("[CHAT-API] Last message:", lastMessage?.content?.substring(0, 50) || "empty");

    const startTime = Date.now();

    console.log("[CHAT-API] Getting context from Pinecone...");
    const contextResult = await getContext(lastMessage.content, fileKey);
    const context = contextResult.text;
    const executionTimeMs = Date.now() - startTime;
    console.log("[CHAT-API] Context length:", context.length, "execution time:", executionTimeMs, "ms");

    const headerSafe = (str: string) => {
      return str.replace(/[^\x00-\x7F]/g, "").replace(/[\n\r\t]/g, " ").replace(/"/g, "'");
    };

    interface Match {
      score: number;
      text: string;
    }

    const safeMatches: Match[] = contextResult.matches.slice(0, 3).map((m: Match) => ({
      score: m.score,
      text: headerSafe(m.text.substring(0, 150)) + "..."
    }));

    const ragData = {
      namespace: fileKey,
      contextLength: context.length,
      contextSnippet: context.length > 0 ? headerSafe(context.substring(0, 150)) : "No context found",
      matches: safeMatches,
      executionTimeMs,
    };

    if (!context || context.trim() === "") {
      console.log("[CHAT-API] No context found - returning fallback response");
      const fallbackText = "I'm sorry, but I don't have information about that in the provided document.";
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(fallbackText));
          await db.insert(_message).values({ chatId, content: lastMessage.content, role: 'user' });
          await db.insert(_message).values({ chatId, content: fallbackText, role: 'assistant' });
          controller.close();
        }
      });
      return new Response(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Rag-Data': JSON.stringify(ragData) }
      });
    }

    console.log("[CHAT-API] Generating LLM response with OpenAI SDK...");

    // Build messages for OpenAI
    const systemPrompt = `You are a precision-oriented AI assistant. 
RULES:
1. ONLY answer using the provided context: ${context}
2. If asked for a calendar or list of dates, ALWAYS use a Markdown Table.
3. For holidays or special dates, wrap the date in bold and brackets like this: **[Date]**. 
4. If the information is not in the context, state that you don't know.
5. Format code using triple backticks.`;

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-6).map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      }))
    ];

    // Use OpenAI SDK for streaming (DeepSeek uses OpenAI-compatible API)
    const stream = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: openaiMessages,
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          console.log("[CHAT-API] Streaming response...");
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullText += content;
              controller.enqueue(encoder.encode(content));
            }
          }
          console.log("[CHAT-API] Stream complete, saving to DB...");
          await db.insert(_message).values({ chatId, content: lastMessage.content, role: "user" });
          await db.insert(_message).values({ chatId, content: fullText, role: "assistant" });
          console.log("[CHAT-API] Messages saved to DB");
        } catch (e) {
          console.error("[CHAT-API] Streaming error:", e);
          controller.error(e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8', 
        'X-Rag-Data': JSON.stringify(ragData) 
      }
    });

  } catch (error) {
    console.error("[CHAT-API] ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
