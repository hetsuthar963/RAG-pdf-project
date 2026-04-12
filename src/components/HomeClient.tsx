"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Upload, FileText } from "lucide-react";

export default function HomeClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      const urlResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: file.name, file_type: file.type })
      });

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        throw new Error(errorData.error || `Failed to get presigned URL: ${urlResponse.status}`);
      }

      const { uploadUrl, file_key } = await urlResponse.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      });

      if (!uploadRes.ok) {
        throw new Error(`S3 upload failed: ${uploadRes.status}`);
      }

      const response = await fetch('/api/create-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_key, file_name: file.name })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create chat: ${response.status}`);
      }

      const data = await response.json();
      router.push(`/chat/${data.chat_id}`);
      toast.success("Document analyzed!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        type="file"
        accept=".pdf"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileUpload}
      />

      <section className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:py-24">
        <div className="max-w-lg w-full text-center space-y-6 sm:space-y-8">
          <div className="space-y-4">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="bg-primary/10 p-3 sm:p-4 rounded-2xl">
                <FileText size={32} className="text-primary sm:hidden" />
                <FileText size={40} className="text-primary hidden sm:block" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Welcome back!
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg px-2 sm:px-0">
              Upload a PDF document and start chatting with it using AI
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <Button
              size="lg"
              className="gap-2 sm:gap-3 px-6 sm:px-8 h-10 sm:h-12 w-full sm:w-auto"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader className="size-4 sm:size-5 animate-spin" />
                  <span className="text-sm sm:text-base">Processing...</span>
                </>
              ) : (
                <>
                  <Upload size={18} className="sm:hidden" />
                  <Upload size={20} className="hidden sm:block" />
                  <span className="text-sm sm:text-base">Upload New Document</span>
                </>
              )}
            </Button>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <FileText size={14} className="sm:size-16" />
              <span>Supports PDF files only</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
