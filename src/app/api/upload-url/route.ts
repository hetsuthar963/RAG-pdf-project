import { NextResponse, NextRequest } from "next/server";
import { getPresignedUploadUrl } from "@/lib/db/s3";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("[UPLOAD-URL] ==== STARTING UPLOAD URL REQUEST ====");

  const { userId } = await getAuth(req);
  console.log("[UPLOAD-URL] User authenticated:", !!userId);

  if (!userId) {
    console.log("[UPLOAD-URL] Unauthorized - no userId");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[UPLOAD-URL] Parsing request body...");
    const body = await req.json();
    const { file_name, file_type } = body;
    console.log("[UPLOAD-URL] file_name:", file_name);
    console.log("[UPLOAD-URL] file_type:", file_type);

    if (!file_name || !file_type) {
      console.log("[UPLOAD-URL] Missing required fields - file_name:", !!file_name, "file_type:", !!file_type);
      return NextResponse.json(
        { error: "Missing file_name or file_type" },
        { status: 400 }
      );
    }

    console.log("[UPLOAD-URL] Generating presigned URL...");
    const result = await getPresignedUploadUrl(file_name, file_type);
    console.log("[UPLOAD-URL] Presigned URL generated - file_key:", result.file_key);
    console.log("[UPLOAD-URL] URL length:", result.uploadUrl.length);

    console.log("[UPLOAD-URL] ==== SUCCESS ====");
    return NextResponse.json({ uploadUrl: result.uploadUrl, file_key: result.file_key }, { status: 200 });

  } catch (error) {
    console.error("[UPLOAD-URL] ERROR:", error);
    console.error("[UPLOAD-URL] Stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      { error: "Failed to generate upload URL", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
