


import { db } from "@/lib/db";
import { chats, message as _message } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ChatOpenAI } from "@langchain/openai";
import { NextResponse } from "next/server";
import { getContext } from "@/lib/context";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

// type Message = {
//   role: string;
//   content?: string;
//   parts?: { text: string }[];
// };

const model = new ChatOpenAI({
  modelName: "deepseek-chat",  // DeepSeek model
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: "https://api.deepseek.com/v1",
  },
  temperature: 0.7,
});

export async function POST(req: Request) {
  console.log(`[${new Date().toISOString()}] /api/chat POST hit`);
  try {
    const body = await req.json();
    const { messages, chatId } = body ?? {};

    console.log(`[API] Received body:`, JSON.stringify(body, null, 2));

    // Validation
    if (!chatId || !messages || !Array.isArray(messages)) {
      console.log(`[API] Missing chatId or invalid messages format`, { chatId, messages });
      return NextResponse.json({ error: 'Missing chatId or invalid messages format' }, { status: 400 });
    }

    // Verify API key is configured
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error(`[API] DEEPSEEK_API_KEY not configured`);
      return NextResponse.json(
        { error: 'AI service not configured. Please set DEEPSEEK_API_KEY.' },
        { status: 500 }
      );
    }

    // Fetch chat from DB
    console.log(`[DB] Looking up chatId:`, chatId);
    const _chats = await db.select().from(chats).where(eq(chats.id, chatId));
    if (_chats.length !== 1) {
      console.log(`[DB] Chat not found or multiple results for id:`, chatId);
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }
    const fileKey = _chats[0].fileKey;
    console.log(`[DB] Found fileKey:`, fileKey);

    // Get context for last message
    const lastMessage = messages[messages.length - 1];
    let context: string = "";
    try {
      console.log(`[Context] Getting context for lastMessage:`, lastMessage?.content);
      context = await getContext(lastMessage.content, fileKey);
      // Ensure context is string
      context = typeof context === "string" ? context : (context ? String(context) : "");
      console.log(`[Context] Context retrieved (${context.length} chars)`);
    } catch (err) {
      console.error(`[Context ERROR] Could not retrieve context:`, err);
      context = "";
    }

    console.log('[DEBUG] context:', JSON.stringify(context));

    // Build langchain message array
    const langchainMessages = [];

    // Build system prompt
    const systemPrompt = `
      AI assistant is a brand new, powerful, human-like artificial intelligence.
      The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
      AI is a well-behaved and well-mannered individual.
      AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
      AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
      AI assistant is a big fan of Pinecone and Vercel.
      START CONTEXT BLOCK
      ${context}
      END OF CONTEXT BLOCK
      AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
      If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
      AI assistant will not apologize for previous responses, but instead will indicate new information was gained.
      AI assistant will not invent anything that is not drawn directly from the context.
    `.trim();

    langchainMessages.push(new SystemMessage(systemPrompt));

    // Convert history messages to langchain format
    for (const m of messages) {
      const content = m.content || m.parts?.[0]?.text || "";
      if (!content.trim()) continue;

      if (m.role === "user") {
        langchainMessages.push(new HumanMessage(content));
      } else if (m.role === "assistant" || m.role === "system") {
        langchainMessages.push(new AIMessage(content));
      }
    }

    console.log(`[LLM] Sending ${langchainMessages.length} messages to model`);
    
    // Call DeepSeek via langChain
    const response = await model.invoke(langchainMessages);
    const text = response.content as string;

    console.log(`[LLM] Response received (${text.length} chars)`);
    console.log(`[LLM] Response preview: `, text.substring(0, 200));

    // Save messages to database
    await db.insert(_message).values({
      chatId,
      content: lastMessage.content,
      role: 'user'
    });

    await db.insert(_message).values({
      chatId,
      content: text,
      role: 'assistant'
    });

    return NextResponse.json({ text }, { status: 200 });

    // // Build user message block
    // const userMessages = messages
    //   .filter((m: Message) => m.role === "user")
    //   .map((m: Message) => m.content || m.parts?.[0]?.text || "")
    //   .join("\n");

    // // Build the final prompt for Gemini
    // const prompt = `${systemPrompt}\n\n${userMessages}`;
    // console.log(`[PROMPT] Sending prompt to Gemini: (first 500 chars)\n`, prompt.slice(0, 500));

    // Send to Gemini
    // const model = new OpenAI({ model: "deepseek-chat", temperature=0 });
    // let text = "";
    // try {
    //   const result = await model.generateContent(prompt);
    //   text = result.response.text();
    //   console.log(`[Gemini] Gemini response received. Text length: ${text.length}`);
    // } catch (err: unknown) {
    //   console.error(`[Gemini API ERROR]`, err instanceof Error ? err.message : err);
    //   throw err;
    // }

    // Save both messages in order
    // await db.insert(_message).values({
    //   chatId,
    //   content: lastMessage.content,
    //   role: 'user'
    // });
    // await db.insert(_message).values({
    //   chatId,
    //   content: text,
    //   role: 'system'
    // });

    // return new Response(JSON.stringify({ text }), {
    //   status: 200,
    //   headers: { "Content-Type": "application/json" }
    // });

  } catch (error) {
    // Structured error logs
    console.error('[API ERROR] Unexpected error:', error instanceof Error ? error.message : error, error instanceof Error ? error.stack : error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
