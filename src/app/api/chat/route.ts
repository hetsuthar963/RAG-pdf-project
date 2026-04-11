


import { db } from "@/lib/db";
import { chats, message as _message } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ChatOpenAI } from "@langchain/openai";
import { NextResponse, NextRequest } from "next/server";
import { getContext } from "@/lib/context";
import { getAuth } from "@clerk/nextjs/server";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

export const runtime = "nodejs";

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
  const { userId } = await getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { chatId: rawChatId, messages } = body;
    const chatId = typeof rawChatId === "string" ? parseInt(rawChatId, 10) : rawChatId;

    if (!chatId || isNaN(chatId)) {
      return NextResponse.json({ error: "Invalid Chat ID" }, { status: 400 });
    }

    const _chats = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

    if (_chats.length !== 1) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    const fileKey = _chats[0].fileKey;

    const lastMessage = messages[messages.length - 1];
    const startTime = Date.now();
    
    // 1. Get Context Object
    const contextResult = await getContext(lastMessage.content, fileKey);
    const context = contextResult.text;
    const executionTimeMs = Date.now() - startTime;

    // 2. Sanitize Headers
    const headerSafe = (str: string) => {
      return str.replace(/[^\x00-\x7F]/g, "").replace(/[\n\r\t]/g, " ").replace(/"/g, "'");
    };

    const safeMatches = contextResult.matches.slice(0, 3).map((m: any) => ({
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

    // 3. HARD SHORT-CIRCUIT: If context is empty, return immediately
    if (!context || context.trim() === "") {
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
      // ✅ RETURN 1
      return new Response(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Rag-Data': JSON.stringify(ragData) }
      });
    }

    // 4. NORMAL LLM FLOW: If context exists, continue to model
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
      ...messages.slice(-6).map((m: any) =>
        m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
    ];

    const stream = await model.stream(langchainMessages);
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          for await (const chunk of stream) {
            const content = chunk.content as string;
            if (content) {
              fullText += content;
              controller.enqueue(encoder.encode(content));
            }
          }

          await db.insert(_message).values({ chatId, content: lastMessage.content, role: "user" });
          await db.insert(_message).values({ chatId, content: fullText, role: "assistant" });
        } catch (e) {
          console.error("Streaming error:", e);
          controller.error(e);
        } finally {
          controller.close();
        }
      },
    });

    // 🚨 THIS WAS LIKELY MISSING: The final return for the successful LLM stream
    // ✅ RETURN 2
    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Rag-Data": JSON.stringify(ragData),
      },
    });

  } catch (error) {
    console.error("[API ERROR]:", error);
    // ✅ RETURN 3 (Error Fallback)
    return NextResponse.json(
      { error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}