// import { openai } from '@ai-sdk/openai';
// import { streamText } from 'ai';

// export const runtime = 'edge';

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     console.log('Raw request body:', JSON.stringify(body, null, 2));
    
//     const { messages } = body as { messages: any[] };

//     // Input validation
//     if (!messages || !Array.isArray(messages)) {
//       console.log('Invalid messages format:', messages);
//       return Response.json({ error: 'Invalid messages format' }, { status: 400 });
//     }

//     // Check if API key is available
//     if (!process.env.OPENAI_API_KEY) {
//       console.log('No OpenAI API key found');
//       return Response.json(
//         { error: 'OpenAI API key not configured' },
//         { status: 500 }
//       );
//     }

//     console.log('Original messages:', JSON.stringify(messages, null, 2));

//     // Transform messages to the correct format
//     const transformedMessages = messages.map((msg: any) => {
//       // Handle messages with 'parts' array (like from Google AI format)
//       if (msg.parts && Array.isArray(msg.parts)) {
//         const content = msg.parts
//           .filter((part: any) => part.type === 'text')
//           .map((part: any) => part.text)
//           .join(' ');
        
//         console.log(`Transforming message with parts: ${JSON.stringify(msg)} -> content: "${content}"`);
        
//         return {
//           role: msg.role,
//           content: content || msg.content || ''
//         };
//       }
      
//       // Handle standard format
//       console.log(`Standard message: ${JSON.stringify(msg)}`);
//       return {
//         role: msg.role,
//         content: msg.content || ''
//       };
//     });

//     console.log('Transformed messages for OpenAI:', JSON.stringify(transformedMessages, null, 2));

//     // Validate transformed messages
//     const validMessages = transformedMessages.filter(msg => msg.content && msg.content.trim() !== '');
//     if (validMessages.length === 0) {
//       console.log('No valid messages after transformation');
//       return Response.json({ error: 'No valid messages found' }, { status: 400 });
//     }

//     console.log('Calling OpenAI with messages:', JSON.stringify(validMessages, null, 2));

//     /** Use streamText from AI SDK v4 */
//     const result = await streamText({
//       model: openai('gpt-3.5-turbo'),
//       messages: validMessages,
//     });

//     console.log('OpenAI response received, creating manual stream');

//     // Create a custom ReadableStream that should work with fetch
//     const stream = new ReadableStream({
//       async start(controller) {
//         try {
//           const encoder = new TextEncoder();
          
//           for await (const chunk of result.textStream) {
//             console.log('Streaming chunk:', chunk);
//             controller.enqueue(encoder.encode(chunk));
//           }
          
//           controller.close();
//           console.log('Stream completed');
//         } catch (error) {
//           console.error('Stream error:', error);
//           controller.error(error);
//         }
//       }
//     });

//     return new Response(stream, {
//       headers: {
//         'Content-Type': 'text/plain; charset=utf-8',
//         'Cache-Control': 'no-cache',
//         'Connection': 'keep-alive',
//       },
//     });
    
//   } catch (error: any) {
//     console.error('OpenAI API Error:', error);
    
//     // Handle specific OpenAI API errors
//     if (error?.status === 429 || error?.code === 'insufficient_quota') {
//       return Response.json(
//         { 
//           error: 'API quota exceeded. Please check your OpenAI billing or try again later.',
//           code: 'quota_exceeded'
//         },
//         { status: 429 }
//       );
//     }
    
//     if (error?.status === 401) {
//       return Response.json(
//         { 
//           error: 'Invalid API key. Please check your OpenAI API key configuration.',
//           code: 'invalid_api_key'
//         },
//         { status: 401 }
//       );
//     }
    
//     // Generic error handling
//     return Response.json(
//       { 
//         error: 'Failed to process request. Please try again.',
//         code: 'internal_error'
//       },
//       { status: 500 }
//     );
//   }
// }

// /* Optional guard so a direct GET shows 405 instead of 500 */
// export function GET() {
//   return Response.json(
//     { ok: false, message: 'POST only' },
//     { status: 405 },
//   );
// }


// import OpenAI from 'openai';

// // Use your OpenAI API key (should be set in your environment)
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { messages } = body;

//     // Validate input
//     if (!messages || !Array.isArray(messages)) {
//       return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
//         status: 400,
//         headers: { "Content-Type": "application/json" }
//       });
//     }

//     // Call OpenAI
//     const response = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo", // or "gpt-4o" if you have access
//       messages, // [{ role: 'user', content: 'your prompt' }, ...]
//       // stream: false, // default is non-streaming
//     });

//     // Return just the answer text
//     const text = response.choices[0]?.message?.content || "";
//     return new Response(JSON.stringify({ text }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" }
//     });
//   } catch (error: any) {
//     console.error('[OpenAI API Error]', error);
//     return new Response(JSON.stringify({
//       error: 'Internal Server Error',
//       message: error.message,
//       stack: error.stack,
//     }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" }
//     });
//   }
// }




import { db } from "@/lib/db";
import { chats, message as _message } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getContext } from "@/lib/context";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

    // Build user message block
    const userMessages = messages
      .filter((m: any) => m.role === "user")
      .map((m: any) => m.content || m.parts?.[0]?.text || "")
      .join("\n");

    // Build the final prompt for Gemini
    const prompt = `${systemPrompt}\n\n${userMessages}`;
    console.log(`[PROMPT] Sending prompt to Gemini: (first 500 chars)\n`, prompt.slice(0, 500));

    // Send to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    let text = "";
    try {
      const result = await model.generateContent(prompt);
      text = result.response.text();
      console.log(`[Gemini] Gemini response received. Text length: ${text.length}`);
    } catch (err: any) {
      console.error(`[Gemini API ERROR]`, err?.message || err);
      throw err;
    }

    // Save both messages in order
    await db.insert(_message).values({
      chatId,
      content: lastMessage.content,
      role: 'user'
    });
    await db.insert(_message).values({
      chatId,
      content: text,
      role: 'system'
    });

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    // Structured error logs
    console.error('[API ERROR] Unexpected error:', error?.message || error, error?.stack);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error?.message,
      stack: error?.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}