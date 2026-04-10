import { db } from "@/lib/db";
import { message } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse, NextRequest } from "next/server";

export const runtime = "edge";

export const POST = async(req: NextRequest) => {
    const { userId } = await getAuth(req);
    if (!userId) {
            return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }
    const {chatId} = await req.json();
    const _messages = await db.select().from(message).where(eq(message.chatId, chatId));

    return NextResponse.json(_messages);
}