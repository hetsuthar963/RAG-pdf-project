import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { getAuth } from "@clerk/nextjs/server";
import { getS3PublicUrl } from "@/lib/db/s3";
import { loadS3IntoPinecone } from "@/lib/db/pinecone";
import { InferInsertModel } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("[CREATE-CHAT] ==== STARTING CREATE CHAT REQUEST ====");

  const { userId } = await getAuth(req);
  console.log("[CREATE-CHAT] User authenticated:", !!userId);

  if (!userId) {
    console.log("[CREATE-CHAT] Unauthorized - no userId");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[CREATE-CHAT] Parsing request body...");
    const body = await req.json();
    const { file_key, file_name } = body;
    console.log("[CREATE-CHAT] file_key:", file_key);
    console.log("[CREATE-CHAT] file_name:", file_name);

    if (!file_key || typeof file_key !== 'string') {
      console.log("[CREATE-CHAT] Invalid file_key:", typeof file_key);
      return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
    }

    console.log("[CREATE-CHAT] Getting S3 public URL...");
    const pdfUrl = getS3PublicUrl(file_key);
    console.log("[CREATE-CHAT] PDF URL:", pdfUrl);

    console.log("[CREATE-CHAT] Loading document into Pinecone...");
    await loadS3IntoPinecone(file_key);
    console.log("[CREATE-CHAT] Pinecone loading complete");

    console.log("[CREATE-CHAT] Inserting chat into database...");
    const newChat: InferInsertModel<typeof chats> = {
      pdfName: file_name,
      pdfUrl: pdfUrl,
      userId: userId,
      fileKey: file_key,
    };

    const inserted = await db.insert(chats).values(newChat).returning();
    const chat_id = inserted[0].id;
    console.log("[CREATE-CHAT] Chat created successfully with id:", chat_id);

    console.log("[CREATE-CHAT] ==== SUCCESS ====");
    return NextResponse.json({ chat_id }, { status: 200 });

  } catch (error) {
    console.error("[CREATE-CHAT] ERROR:", error);
    console.error("[CREATE-CHAT] Stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
