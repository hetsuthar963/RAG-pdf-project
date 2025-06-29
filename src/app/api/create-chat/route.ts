import { loadS3IntoPinecone } from "@/lib/db/pinecone";
import { NextResponse, NextRequest } from "next/server";
import { db } from '@/lib/db'
import { chats } from '@/lib/db/schema'
import { getS3Url } from "@/lib/db/s3";
import { getAuth } from "@clerk/nextjs/server"
import { InferInsertModel } from "drizzle-orm";

export async function POST(req: NextRequest) {
    const { userId } = await getAuth(req);
    if (!userId) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    try {
        const body = await req.json();
        const { file_key, file_name } = body;

        // Validate input parameters
        if (!file_key || typeof file_key !== 'string') {
            return NextResponse.json(
                { error: "Invalid file key" },
                { status: 400 }
            );
        }

        console.log("File key received:", file_key); // Debug log

        // Generate S3 URL
        const pdfUrl = getS3Url(String(file_key));

        console.log("Generated PDF URL:", pdfUrl); // Debug log

        if(!pdfUrl) {
            return NextResponse.json(
                { error: "Failed to generate PDF URL" },
                { status: 500 }
            );
        }

        // Process PDF
        await loadS3IntoPinecone(file_key);

        // Explicitly type the insert object using InferInsertModel
        const newChat: InferInsertModel<typeof chats> = {
            pdfName: file_name,
            pdfUrl: pdfUrl,
            userId: userId,
            fileKey: file_key
        };

        // Database insertion
        const [chat] = await db.insert(chats).values(newChat).returning({
            insertedId: chats.id,
        });

        return NextResponse.json(
            { chat_id: chat.insertedId },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error in create-chat endpoint:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}