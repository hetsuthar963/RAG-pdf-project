import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

console.log("[S3] ========== S3 MODULE INITIALIZED ==========");

const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "mydeproject01";
const REGION = process.env.S3_REGION || "us-east-1";

console.log("[S3] Configuration:");
console.log("[S3] - BUCKET_NAME:", BUCKET_NAME);
console.log("[S3] - REGION:", REGION);
console.log("[S3] - S3_ACCESS_KEY_ID set:", !!process.env.S3_ACCESS_KEY_ID);
console.log("[S3] - S3_SECRET_ACCESS_KEY set:", !!process.env.S3_SECRET_ACCESS_KEY);

function createS3Client(): S3Client {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.error("[S3] CRITICAL: AWS credentials not configured!");
    console.error("[S3] - accessKeyId:", accessKeyId ? "SET" : "MISSING");
    console.error("[S3] - secretAccessKey:", secretAccessKey ? "SET" : "MISSING");
    throw new Error("AWS credentials not configured. Please set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables.");
  }

  console.log("[S3] Creating S3 client with credentials:", accessKeyId.substring(0, 4) + "***");

  return new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });
}

export async function getPresignedUploadUrl(fileName: string, fileType: string) {
  console.log("[S3] ========== GET PRESIGNED UPLOAD URL ==========");
  console.log("[S3] Input:");
  console.log("[S3] - fileName:", fileName);
  console.log("[S3] - fileType:", fileType);
  console.log("[S3] - BUCKET_NAME:", BUCKET_NAME);
  console.log("[S3] - REGION:", REGION);

  const file_key = `uploads/${Date.now()}-${fileName}`;
  console.log("[S3] Generated file_key:", file_key);

  const s3Client = createS3Client();

  console.log("[S3] Creating PutObjectCommand...");
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: file_key,
    ContentType: fileType,
  });

  console.log("[S3] Generating signed URL with getSignedUrl...");
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  console.log("[S3] Signed URL generated:");
  console.log("[S3] - URL length:", uploadUrl.length);
  console.log("[S3] - URL starts with:", uploadUrl.substring(0, 60) + "...");

  console.log("[S3] ========== SUCCESS ==========");
  return { uploadUrl, file_key };
}

export async function getPresignedViewUrl(fileKey: string) {
  console.log("[S3] ========== GET PRESIGNED VIEW URL ==========");
  console.log("[S3] fileKey:", fileKey);

  const s3Client = createS3Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  console.log("[S3] View URL generated, length:", url.length);

  return url;
}

export function getS3PublicUrl(fileKey: string) {
  const url = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;
  console.log("[S3] Public URL:", url);
  return url;
}
