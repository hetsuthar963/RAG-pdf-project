import AWS from 'aws-sdk'
import * as fs from 'fs';

console.log("[S3-SERVER] ========== S3 SERVER MODULE INITIALIZED ==========");

export async function downloadFromS3(file_key: string) {
  console.log("[S3-SERVER] ========== DOWNLOAD FROM S3 ==========");
  console.log("[S3-SERVER] Input file_key:", file_key);

  const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  console.log("[S3-SERVER] Configuration:");
  console.log("[S3-SERVER] - BUCKET_NAME:", bucketName);
  console.log("[S3-SERVER] - S3_ACCESS_KEY_ID set:", !!accessKeyId);
  console.log("[S3-SERVER] - S3_SECRET_ACCESS_KEY set:", !!secretAccessKey);

  if (!bucketName || !accessKeyId || !secretAccessKey) {
    console.error("[S3-SERVER] CRITICAL: Missing AWS configuration!");
    console.error("[S3-SERVER] - bucketName:", bucketName ? "SET" : "MISSING");
    console.error("[S3-SERVER] - accessKeyId:", accessKeyId ? "SET" : "MISSING");
    console.error("[S3-SERVER] - secretAccessKey:", secretAccessKey ? "SET" : "MISSING");
    return null;
  }

  try {
    console.log("[S3-SERVER] Configuring AWS SDK...");
    AWS.config.update({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    });

    console.log("[S3-SERVER] Creating S3 instance...");
    const s3 = new AWS.S3({
      params: {
        Bucket: bucketName,
      },
      region: "us-east-1"
    });

    const params = {
      Bucket: bucketName!,
      Key: file_key,
    };

    console.log("[S3-SERVER] Downloading object from S3...");
    console.log("[S3-SERVER] - Bucket:", bucketName);
    console.log("[S3-SERVER] - Key:", file_key);

    const obj = await s3.getObject(params).promise();
    console.log("[S3-SERVER] Object downloaded successfully");
    console.log("[S3-SERVER] - ContentLength:", obj.ContentLength);
    console.log("[S3-SERVER] - ContentType:", obj.ContentType);

    const file_name = `/tmp/pdf-${Date.now()}.pdf`;
    console.log("[S3-SERVER] Writing to local file:", file_name);
    fs.writeFileSync(file_name, obj.Body as Buffer);

    console.log("[S3-SERVER] File written successfully");
    console.log("[S3-SERVER] ========== SUCCESS ==========");
    return file_name;

  } catch (error) {
    console.error("[S3-SERVER] ERROR:", error);
    console.error("[S3-SERVER] Stack:", error instanceof Error ? error.stack : "No stack trace");
    return null;
  }
}
