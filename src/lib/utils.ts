import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import 'dotenv/config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertToAscii(inputString: string) {
  //remove non ASCII chars
  const asciiString = inputString.replace(/[^\x00-\x7F]+/g, "");
  return asciiString
}

export function getS3Url(file_key: string) {
    if (!file_key) return "";
    
    // We can't use process.env.S3_BUCKET_NAME here if this runs on client,
    // so we usually just hardcode the bucket name or pass it in.
    const bucket = process.env.NEXT_PUBLIC_S3_BUCKET_NAME!; 
    
    const cleanFileKey = file_key.replace(/function toString\(\) \{ \[native code\] \}/, "");
    return `https://${bucket}.s3.amazonaws.com/${cleanFileKey}`;
}