import { db } from "@/lib/db";
import { chats, message as _message } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ChatOpenAI } from "@langchain/openai";
import { NextResponse, NextRequest } from "next/server";
import { getContext } from "@/lib/context";
import { getAuth } from "@clerk/nextjs/server";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

export const runtime = "nodejs";

console.log("[CHAT-API] ========== CHAT API MODULE INITIALIZED ==========");

const model = new ChatOpenAI({
  modelName: "deepseek-chat",
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: "https://api.deepseek.com/v1",
  },
  temperature: 0.7,
  streaming: true,
});

export async function POST(req: NextRequest) {
  console.log("[CHAT-API] ========== NEW CHAT REQUEST ==========");

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

    console.log("[CHAT-API] Generating LLM response...");
    const langchainMessages = [
      new SystemMessage(`
        You are a precision-oriented AI assistant. 
        RULES:
        1. ONLY answer using the provided context: ${context}
        2. If asked for a calendar or list of dates, ALWAYS use a Markdown Table.
        3. For holidays or special dates, wrap the date in bold and brackets like this: **[Date]**. 
        4. If the information is not in the context, state that you don't know.
        5. Format code using triple backticks.
      `),
      ...messages.slice(-6).map((m: { role: string; content: string }) =>
        m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
    ];

    const stream = await model.stream(langchainMessages);
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          console.log("[CHAT-API] Streaming response...");
          for await (const chunk of stream) {
            const content = chunk.content as string;
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
      },
    });

    console.log("[CHAT-API] ========== SUCCESS ==========");
    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Rag-Data": JSON.stringify(ragData),
      },
    });

  } catch (error) {
    console.error("[CHAT-API] ERROR:", error);
    console.error("[CHAT-API] Stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      { error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
