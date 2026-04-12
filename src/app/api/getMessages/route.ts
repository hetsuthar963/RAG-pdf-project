import { db } from "@/lib/db";
import { message, chats } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse, NextRequest } from "next/server";
// import { messagesValidation } from "@pinecone-database/pinecone/dist/assistant/data/chat";
// import { number } from "cohere-ai/core/schemas";

export const runtime = "nodejs";

export const POST = async(req: NextRequest) => {
    // Authentication
    const { userId } = await getAuth(req);
    if (!userId) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    // Validation
    let chatId;
    try {
        const body = await req.json();
        chatId = body.chatId;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if(!chatId || (typeof chatId !== "string" && typeof chatId !== "number")) {
        return NextResponse.json({ error:"Missing or invalid chatId" }, { status: 400 });
    }

    const numericChatId = typeof chatId === "string" ? parseInt(chatId, 10) : chatId;
    if (isNaN(numericChatId)) {
        return NextResponse.json({ error: "Invalid chatId format" }, { status: 400 });
    }

    try {
        const chatExists = await db
            .select({ id: chats.id })
            .from(chats)
            .where(and(eq(chats.id, numericChatId), eq(chats.userId, userId)))
            .limit(1);

        if (chatExists.length === 0) {
            return NextResponse.json({ error: "CHat not found" }, { status: 404 })
        }

        const messages = await db
            .select({
                id: message.id,
                chatId: message.chatId,
                content: message.content,
                role: message.role,
                createdAt: message.createdAt,
            })
            .from(message)
            .where(eq(message.chatId, numericChatId))
            .orderBy(asc(message.createdAt));

            return NextResponse.json(messages);

    } catch (error) {
        console.error("[GET_MESSAGES_ERROR]:", error);
        return NextResponse.json(
            { error: "Failed to fetch messages" },
            { status: 500 }
        );
    } 

    // const {chatId} = await req.json();
    // const jointedData = await db
    //     .select({
    //         id: message.id,
    //         chatId: message.chatId,
    //         content: message.content,
    //         role: message.role,
    //         createdAt: message.createdAt,
    //     })
    //     .from(message)
    //     .innerJoin(chats, eq(message.chatId, chats.id))
    //     .where(
    //         and(
    //             eq(message.chatId, numericChatId),
    //             eq(chats.userId, userId)
    //         )
    //     );

    //     // Response
    //     if (jointedData.length === 0) {
    //         // No messages found OR chat doesn't belong to user
    //         return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    //     }


    // return NextResponse.json(jointedData);
}