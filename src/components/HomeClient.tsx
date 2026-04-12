"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Upload, FileText, CheckCircle, Circle, Loader2 } from "lucide-react";

type UploadStep = {
  id: number;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
};

const initialSteps: UploadStep[] = [
  { id: 1, label: "Generating upload URL", status: "pending" },
  { id: 2, label: "Uploading document", status: "pending" },
  { id: 3, label: "Processing with AI", status: "pending" },
  { id: 4, label: "Creating chat session", status: "pending" },
];

export default function HomeClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>(initialSteps);
  const [isUploading, setIsUploading] = useState(false);

  const updateStep = (id: number, status: UploadStep["status"]) => {
    setUploadSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, status } : step))
    );
  };

  const resetSteps = () => {
    setUploadSteps(initialSteps);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    resetSteps();

    try {
      // Step 1: Generate upload URL
      updateStep(1, "loading");
      const urlResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: file.name, file_type: file.type })
      });

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        updateStep(1, "error");
        throw new Error(errorData.error || `Failed to get presigned URL: ${urlResponse.status}`);
      }
      updateStep(1, "complete");

      const { uploadUrl, file_key } = await urlResponse.json();

      // Step 2: Upload to S3
      updateStep(2, "loading");
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      });

      if (!uploadRes.ok) {
        updateStep(2, "error");
        throw new Error(`S3 upload failed: ${uploadRes.status}`);
      }
      updateStep(2, "complete");

      // Step 3: Process with AI (Pinecone)
      updateStep(3, "loading");
      const processRes = await fetch('/api/create-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_key, file_name: file.name })
      });

      if (!processRes.ok) {
        const errorData = await processRes.json();
        updateStep(3, "error");
        throw new Error(errorData.error || `Failed to process document: ${processRes.status}`);
      }
      updateStep(3, "complete");

      // Step 4: Create chat session
      updateStep(4, "loading");
      const data = await processRes.json();
      updateStep(4, "complete");

      toast.success("Document analyzed successfully!");
      
      // Small delay to show completion
      setTimeout(() => {
        router.push(`/chat/${data.chat_id}`);
      }, 500);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      setIsUploading(false);
    } finally {
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

          {isUploading ? (
            <div className="bg-card border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Loader className="size-5 animate-spin text-primary" />
                <span className="font-medium">Processing your document...</span>
              </div>
              
              <div className="space-y-3 text-left">
                {uploadSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3">
                    {step.status === "loading" && (
                      <>
                        <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                        <span className="text-sm text-primary font-medium">{step.label}</span>
                      </>
                    )}
                    {step.status === "complete" && (
                      <>
                        <CheckCircle size={16} className="text-green-500 shrink-0" />
                        <span className="text-sm text-green-600 dark:text-green-400">{step.label}</span>
                      </>
                    )}
                    {step.status === "pending" && (
                      <>
                        <Circle size={16} className="text-muted-foreground/50 shrink-0" />
                        <span className="text-sm text-muted-foreground">{step.label}</span>
                      </>
                    )}
                    {step.status === "error" && (
                      <>
                        <Circle size={16} className="text-destructive shrink-0" />
                        <span className="text-sm text-destructive">{step.label} (failed)</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <Button
                size="lg"
                className="gap-2 sm:gap-3 px-6 sm:px-8 h-10 sm:h-12 w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={18} className="sm:hidden" />
                <Upload size={20} className="hidden sm:block" />
                <span className="text-sm sm:text-base">Upload New Document</span>
              </Button>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <FileText size={14} />
                <span>Supports PDF files only</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
