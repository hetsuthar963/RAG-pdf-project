import AWS from 'aws-sdk'
// import { log } from 'console';
// import { access } from 'fs'
// import { Key } from 'lucide-react';
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import 'dotenv/config'


export const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET_NAME!;
const s3 = new S3Client({
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
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


export async function uploadToS3(file: File) {
    try { 
        AWS.config.update({
            accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
        });
        const s3 = new AWS.S3({
            params: {
                Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
            },
            region: "us-east-1"
        })

        const file_key = `uploads/${Date.now().toString()}-${file.name.replace(/\s+/g, '-')}`;

        const params = {
            Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME! ,
            Key: file_key,
            Body: file,
            ContentType: file.type
        }

        const upload = s3.putObject(params).on('httpUploadProgress', evt => {
            console.log('Uploading to S3... ⬆️', parseInt(((evt.loaded*100)/evt.total).toString())) + "%";
            
        }).promise()

        await upload.then(data => {
            console.log('Successfully Uploaded to S3', file_key)
        })

        return Promise.resolve({
            file_key,
            file_name: file.name,
        })

    } catch (error) {
        console.error('Error uploading to S3 : ', error);
        return Promise.reject(error);
    }
}

export function getS3Url(file_key: string) {

    
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
      
      return `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.amazonaws.com/${cleanFileKey}`;
}


// if (require.main === module) {
//   (async () => {
//     const key = 'uploads/Academic-Calendar Even 2024-25 BE ME.pdf';
//     console.log('SIGNED →', await getSignedViewUrl(key));
//   })();
// }