

// "use client";

// import { useState, useRef } from "react";
// import { Send, Paperclip, Bot, User, Loader2, Copy, Check, FileText } from "lucide-react";
// import { useRouter } from "next/navigation";
// import toast from "react-hot-toast";
// import axios from "axios";
// import { TextShimmer } from "@/components/ui/text-shimmer";
// import { getPresignedUploadUrl } from "@/lib/db/s3";
// import { 
//   ChatContainerRoot, 
//   ChatContainerContent 
// } from "@/components/ui/chat-container"; 
// import { RagProcessTracker } from "./ui/ragProcessTracker";
// // import { Message } from "@/components/ui/message";
// import { 
//   PromptInput, 
//   PromptInputTextarea 
// } from "@/components/ui/prompt-input";
// import { ScrollButton } from "@/components/ui/scroll-button";

// export type RagMetadata = {
//   namespace: string;
//   contextLength: number;
//   contextSnippet: string;
//   executionTimeMs: number;
// };

// export type AppMessage = {
//   id: string;
//   role: "user" | "assistant" | "system";
//   content: string;
//   ragData?: RagMetadata; // <-- Added to store the actual metadata
// };

// export default function ChatComponent({ 
//   chatId, 
//   initialMessages = []
// }: {
//   chatId: string | number; 
//   initialMessages?: AppMessage[]; 
// }) {
//   const router = useRouter();
//   const fileInputRef = useRef<HTMLInputElement>(null);
  
//   const [input, setInput] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [isUploadingDoc, setIsUploadingDoc] = useState(false); // Tracks new document upload state
  
//   const [messages, setMessages] = useState<AppMessage[]>(
//     initialMessages.length > 0 
//       ? initialMessages 
//       : [{ id: "system-1", role: "assistant", content: "System initialized. Document loaded." }]
//   );

//   // --- NEW: Document Upload Logic (Ports your UploadComponent logic) ---
//   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     if (file.size > 10 * 1024 * 1024) {
//       toast.error("File Too large! Please upload under 10MB.");
//       if (fileInputRef.current) fileInputRef.current.value = "";
//       return;
//     }

//     try {
//       setIsUploadingDoc(true);
//       toast.loading("Grilling your paper...", { id: "upload-toast" });

//       // 1. Get AWS Presigned URL
//       const { uploadUrl, file_key } = await getPresignedUploadUrl(file.name, file.type);
//       if (!file_key || !uploadUrl) {
//         throw new Error("Failed to get presigned URL");
//       }

//       // 2. Upload directly to S3
//       const uploadResponse = await fetch(uploadUrl, {
//         method: "PUT",
//         body: file,
//         headers: { "Content-Type": file.type },
//       });

//       if (!uploadResponse.ok) {
//         throw new Error("Failed to upload file to S3");
//       }

//       // 3. Trigger Pinecone vectorization and DB chat creation
//       const response = await axios.post('/api/create-chat', { 
//         file_key, 
//         file_name: file.name 
//       });

//       // 4. Redirect to the newly created chat
//       toast.success("New Chat Created!", { id: "upload-toast" });
//       router.push(`/chat/${response.data.chat_id}`);

//     } catch (error) {
//       console.error("Upload pipeline error:", error);
//       toast.error("Error creating chat!", { id: "upload-toast" });
//     } finally {
//       setIsUploadingDoc(false);
//       if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
//     }
//   };

//   // --- Standard Chat Submission Logic ---
//   const handleSubmit = async () => {
//     if (!input.trim() || isLoading) return;
    
//     // 1. Create user message
//     const userMessage: AppMessage = { 
//       id: Date.now().toString(), 
//       role: "user", 
//       content: input 
//     };
        
//     // 2. Update UI immediately to show the user's message and loading state
//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");
//     setIsLoading(true);

//     try {
//       // // 3. Make the actual network request
//       // const response = await fetch("/api/chat", {
//       //   method: "POST",
//       //   headers: { "Content-Type": "application/json" },
//       //   body: JSON.stringify({ chatId, messages: [...messages, userMessage] })
//       // });
      
//       // if (!response.ok) throw new Error(`API error: ${response.status}`);
      
//       // // 4. Parse the response ONLY AFTER the fetch is complete
      
      
//       const response = await fetch("/api/chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ chatId, messages: [...messages, userMessage] })
//       });

//       // 1. Get Metadata from Headers
//       const ragData = JSON.parse(response.headers.get('X-Rag-Data') || '{}');
      
//       // 2. Setup Assistant Message Placeholder
//       const assistantId = (Date.now() + 1).toString();
//       setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", ragData }]);

//       // 3. READ STREAM
//       const reader = response.body?.getReader();
//       const decoder = new TextDecoder();

//       while (true) {
//         const { done, value } = await reader!.read();
//         if (done) break;
//         const chunk = decoder.decode(value, { stream: true });
        
//         setMessages((prev) => prev.map(m => 
//           m.id === assistantId ? { ...m, content: m.content + chunk } : m
//         ));
//       }

//       // 5. Update UI with the AI's response and the RAG metadata
//       // setMessages((prev) => [...prev, { 
//       //   id: Date.now().toString(), 
//       //   role: "assistant", 
//       //   content: data.text,
//       //   ragData: data.ragData // Capture the metadata here
//       // }]);
//     } catch (error) {
//       console.error("Transmission error:", error);
//     } finally {
//       // 6. Stop loading state regardless of success or failure
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="flex flex-col h-full w-full relative bg-slate-50">
//       <ChatContainerRoot className="flex-1 overflow-y-auto p-4 md:p-8">
//         <ChatContainerContent className="max-w-4xl mx-auto flex flex-col gap-6">
//           {messages.map((msg, idx) => (
//             <div key={msg.id} className={`flex flex-col gap-2 w-full ${msg.role === "user" ? "items-end" : "items-start"}`}>
//               {/* Vertical Stack: Tracker above Bubble */}
//               {msg.role === "assistant" && msg.ragData && idx > 0 && (
//                 <div className="w-full pl-12 pr-4">
//                   <RagProcessTracker ragData={msg.ragData} />
//                 </div>
//               )}
              
//               <div className={`flex gap-4 w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
//                 {msg.role === "assistant" && (
//                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 shrink-0 mt-1 shadow-sm"><Bot size={18} className="text-blue-600" /></div>
//                 )}
//                 <div className={`px-5 py-3.5 max-w-[85%] text-sm md:text-base shadow-sm ${msg.role === "user" ? "bg-slate-800 text-white rounded-2xl rounded-tr-sm" : "bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm"}`}>
//                   {msg.content === "" && isLoading ? (
//                     <TextShimmer className="text-sm font-medium">
//                       Synthesizing answer...
//                     </TextShimmer>
//                     ) : (
//                     msg.content
//                   )}
//                 </div>
//                 {msg.role === "user" && (
//                   <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300 shrink-0 mt-1 shadow-sm"><User size={18} className="text-slate-600" /></div>
//                 )}
//               </div>
//             </div>
//           ))}
//         </ChatContainerContent>
//         <ScrollButton />
//       </ChatContainerRoot>

//       <div className="w-full p-4 bg-slate-50 border-t border-slate-200">
//         <div className="max-w-4xl mx-auto flex items-end gap-2 bg-white p-2 rounded-2xl border border-slate-300 shadow-sm focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100 transition-all">
          
//           {/* NEW: Hidden File Input configured for PDFs */}
//           <input 
//             type="file" 
//             accept=".pdf"
//             ref={fileInputRef}
//             className="hidden"
//             onChange={handleFileUpload}
//           />

//           {/* NEW: Upload Trigger Button */}
//           <button 
//             type="button"
//             onClick={() => fileInputRef.current?.click()}
//             className="p-3 text-slate-400 hover:text-slate-800 transition-colors shrink-0 disabled:opacity-50"
//             disabled={isLoading || isUploadingDoc}
//             title="Upload new PDF"
//           >
//             {isUploadingDoc ? (
//               <Loader2 size={20} className="animate-spin text-blue-600" />
//             ) : (
//               <Paperclip size={20} />
//             )}
//           </button>

//           <div className="flex-1 relative">
//             <PromptInput 
//               value={input}
//               onValueChange={setInput}
//               onSubmit={handleSubmit}
//               disabled={isLoading || isUploadingDoc}
//             >
//               <PromptInputTextarea 
//                 placeholder={isUploadingDoc ? "Creating new chat..." : "Ask about this document..."} 
//                 className="w-full min-h-[44px] max-h-[200px] py-3 pr-12 bg-transparent resize-none outline-none focus:outline-none focus:ring-0 border-none text-slate-900 placeholder:text-slate-400 shadow-none disabled:opacity-50" 
//               />
//             </PromptInput>

//             <button
//               onClick={handleSubmit}
//               disabled={!input.trim() || isLoading || isUploadingDoc}
//               className="absolute right-1 bottom-1 p-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all"
//             >
//               <Send size={18} />
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Bot, User, Copy, Check, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";

// --- Prompt-Kit UI Imports (Only the ones we know you have) ---
import { TextShimmer } from "@/components/ui/text-shimmer";
import { Markdown } from "@/components/ui/markdown";
import { Loader } from "@/components/ui/loader";
import { 
  ChatContainerRoot, 
  ChatContainerContent 
} from "@/components/ui/chat-container"; 
import { PromptInput, PromptInputTextarea } from "@/components/ui/prompt-input";
import { ScrollButton } from "@/components/ui/scroll-button";

// --- Local Imports ---
import { RagProcessTracker } from "@/components/ui/ragProcessTracker";
import { getPresignedUploadUrl } from "@/lib/db/s3";

export type RagMetadata = {
  namespace: string;
  contextLength: number;
  contextSnippet: string;
  executionTimeMs: number;
  matches?: { score: number; text: string }[];
};

export type AppMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  ragData?: RagMetadata;
};

export default function ChatComponent({ 
  chatId, 
  initialMessages = []
}: {
  chatId: string | number; 
  initialMessages?: AppMessage[]; 
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<AppMessage[]>(
    initialMessages.length > 0 ? initialMessages : []
  );

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      toast("Generation stopped", { icon: "🛑" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingDoc(true);
      const { uploadUrl, file_key } = await getPresignedUploadUrl(file.name, file.type);
      
      const uploadResponse = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type }});
      if (!uploadResponse.ok) throw new Error("S3 Upload Failed");

      const response = await axios.post('/api/create-chat', { file_key, file_name: file.name });
      router.push(`/chat/${response.data.chat_id}`);
      toast.success("Document analyzed!");
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    
    abortControllerRef.current = new AbortController();
    const userMessage: AppMessage = { id: Date.now().toString(), role: "user", content: input };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, messages: [...messages, userMessage] }),
        signal: abortControllerRef.current.signal, 
      });

      // 🚨 CRITICAL FIX: If the backend crashes, throw an error to prevent the app from reading bad JSON as a stream
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const ragData = JSON.parse(response.headers.get('X-Rag-Data') || '{}');
      const assistantId = (Date.now() + 1).toString();
      
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", ragData }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          
          setMessages((prev) => prev.map(m => 
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          ));
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      toast.error(error.message || "Error generating response");
      // Remove the empty assistant message if it failed to stream
      setMessages(prev => prev.filter(m => m.content !== "" || m.role === "user"));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-50 overflow-hidden">
      
      <ChatContainerRoot className="flex-1 overflow-y-auto">
        <ChatContainerContent className="max-w-4xl mx-auto flex flex-col gap-8 p-4 md:p-8 pb-12">
          
          {messages.map((msg, idx) => {
            const isAssistant = msg.role === "assistant";

            return (
              <div key={msg.id} className={`flex flex-col gap-3 w-full ${isAssistant ? "items-start" : "items-end"}`}>
                
                {/* RAG Tracker */}
                {isAssistant && msg.ragData && idx > 0 && (
                  <div className="w-full pl-12 mb-2">
                    <RagProcessTracker ragData={msg.ragData} />
                  </div>
                )}

                {/* Standard Tailwind Flex Bubbles (Replaced prompt-kit Message to prevent crashes) */}
                <div className={`flex gap-4 w-full group ${isAssistant ? "justify-start" : "justify-end"}`}>
                  
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 shrink-0 mt-1 shadow-sm">
                      <Bot size={18} className="text-blue-600" />
                    </div>
                  )}

                  <div className="relative max-w-[85%] sm:max-w-[75%] flex flex-col gap-2">
                    {isAssistant ? (
                      <div className="bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm overflow-x-auto">
                        
                        {/* Loading State */}
                        {msg.content === "" && isLoading ? (
                          <div className="flex items-center gap-3">
                            <Loader className="size-4 text-blue-600 animate-spin" /> 
                            <TextShimmer className="text-sm font-medium [--shimmer-color:theme(colors.blue.600)]">
                              Reasoning...
                            </TextShimmer>
                          </div>
                        ) : (
                          <div className="prose prose-sm md:prose-base max-w-none">
                            <Markdown>{msg.content}</Markdown>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-800 text-white rounded-2xl rounded-tr-sm shadow-sm py-3 px-5 text-sm md:text-base">
                        {msg.content}
                      </div>
                    )}

                    {/* Copy Button */}
                    {isAssistant && msg.content !== "" && (
                      <button onClick={() => copyToClipboard(msg.content, msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity self-start p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-md shadow-sm">
                        {copiedId === msg.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>

                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0 mt-1 shadow-sm">
                      <User size={18} className="text-white" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        </ChatContainerContent>
        <ScrollButton />
      </ChatContainerRoot>

      {/* Input Dock */}
      <div className="w-full p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:bg-white focus-within:border-slate-300 focus-within:ring-4 focus-within:ring-slate-100 transition-all">
          
          <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-slate-800 transition-colors shrink-0" disabled={isLoading || isUploadingDoc}>
            {isUploadingDoc ? <Loader className="size-5 animate-spin text-blue-600" /> : <Paperclip size={20} />}
          </button>

          <div className="flex-1 relative">
            <PromptInput value={input} onValueChange={setInput} onSubmit={handleSubmit} disabled={isLoading || isUploadingDoc}>
              <PromptInputTextarea placeholder={isUploadingDoc ? "Processing PDF..." : "Ask a question..."} className="w-full min-h-[44px] max-h-[200px] py-3 pr-12 bg-transparent resize-none border-none outline-none focus:ring-0 text-slate-900" />
            </PromptInput>

            {isLoading ? (
               <button onClick={stopGeneration} className="absolute right-1 bottom-1 p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors" title="Stop generating">
                 <Square fill="currentColor" size={16} />
               </button>
            ) : (
              <button onClick={handleSubmit} disabled={!input.trim() || isUploadingDoc} className="absolute right-1 bottom-1 p-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-400">
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}