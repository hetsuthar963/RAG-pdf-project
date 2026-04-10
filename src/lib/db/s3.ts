"use server"

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import { getRegion } from "@aws-sdk/region-provider";
import 'dotenv/config'


const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET_NAME!;

const s3 = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
});


// export async function getS3SignedUrl(file_key: string) {
//     if (!file_key) {
//         console.error("Empty fileKey provided to getS3SignedUrl");
//         return "";
//     }

//     // Clean up the file key if needed (for previously uploaded files)
//     const cleanFileKey = file_key.replace(/function toString\(\) \{ \[native code\] \}/, "");

//     const s3Client = new S3Client({
//         region: "us-east-1",
//         credentials: {
//             accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
//             secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
//         },
//     });

//     const command = new GetObjectCommand({
//         Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
//         Key: cleanFileKey,
//     });

//     const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // expiresIn is in seconds (here: 1 hour)

//     return signedUrl;
// }

function stripHostIfPresent(key: string) {
  // If caller passed full https://bucket.s3… URL, keep only the path
  const match = key.match(/^https?:\/\/[^/]+\/(.+)$/);
  return match ? match[1] : key;
}

// console.log(
//     await getSignedViewUrl('uploads/Academic-Calendar Even 2024-25 BE ME.pdf')
// );


/** 1️⃣  60-minute view URL for an existing object */
export async function getSignedViewUrl(
  key: string,
  expiresInSeconds = 60 * 60
) {
  if (!key) return '';

  const cleanKey = stripHostIfPresent(key);

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: cleanKey }),
    { expiresIn: expiresInSeconds },
  );

  return url;
}


export async function getPresignedUploadUrl(fileName: string, fileType: string) {
    try {
        const file_key = `uploads/${Date.now()}-${fileName.replace(/\s+/g, '-')}`;

        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: file_key,
            ContentType: fileType,
        });

        // This creates a secure, temporary URL (expires in 60s)
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

        return { uploadUrl, file_key };
    } catch (error) {
        console.error("Error generating URL:", error);
        throw new Error("Failed to generate upload URL");
    }
}

export async function getS3Url(file_key: string) {

    
    if (!file_key) {
        console.error("Empty fileKey provided to getS3Url");
        return "";
    }
      
    // Clean up the file key to remove any function toString representations
    const cleanFileKey = file_key.replace(/function toString\(\) \{ \[native code\] \}/, "");
      
    console.log("Building S3 URL with:", {
      bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
      key: cleanFileKey
    });
      
    return `https://${S3_BUCKET}.s3.amazonaws.com/${cleanFileKey}`;
}


// if (require.main === module) {
//   (async () => {
//     const key = 'uploads/Academic-Calendar Even 2024-25 BE ME.pdf';
//     console.log('SIGNED →', await getSignedViewUrl(key));
//   })();
// }
