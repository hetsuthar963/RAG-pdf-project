// // 




// 'use client'
// import React, { useState } from 'react';
// // import { Input } from "./ui/input";
// // import { Button } from './ui/button';
// // import MessageList from './MessageList';
// // import { Send } from 'lucide-react';
// // import { useQuery } from '@tanstack/react-query';
// // import axios from 'axios';
// // import type { Message } from 'ai/react';
// import { 
//   ChatContainerRoot, 
//   ChatContainerContent 
// } from "@/components/ui/chat-container"; 
// import { Message } from "@/components/ui/message";
// import { PromptInput } from "@/components/ui/prompt-input";
// import { ScrollButton } from "@/components/ui/scroll-button";
// import { ChatMessage } from '@langchain/core/messages';

// type Props = { chatId: string };

// type DbMessage = {
//   id: number;
//   chatId: number;
//   content: string;
//   createdAt: string | Date | null;
//   role: 'user' | 'system';
// };

// export default function ChatComponent({ chatId }: { chatId: string }) {
//   // Local state for typing and error
//   const [input, setInput] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [messages, setMessages] = useState<ChatMessage[]>([
//     { id: "system-1", role: "assistant", content: "System initialized. How can I assist you today?" }
//   ])

//   // // Fetch all persisted messages from DB
//   // const { data, refetch, isFetching } = useQuery({
//   //   queryKey: ["chat", chatId],
//   //   queryFn: async () => {
//   //     const response = await axios.post<DbMessage[]>('/api/getMessages', { chatId });
//   //     return response.data;
//   //   }
//   // });

  
//   // const [error, setError] = useState<string | null>(null);

//   // const persistedMessages = useMemo<DbMessage[]>(() => {
//   //   return Array.isArray(data) ? data : [];
//   // }, [data]);

//   // // Use fetched messages as source of truth
//   // const uiMessages = useMemo<Message[]>(() => {
//   //   return persistedMessages.map((msg) => {
//   //     const createdAtValue = msg.createdAt ? new Date(msg.createdAt) : undefined;
//   //     const createdAt = createdAtValue && !Number.isNaN(createdAtValue.getTime()) ? createdAtValue : undefined;

//   //     return {
//   //       id: String(msg.id),
//   //       role: msg.role === 'user' ? 'user' : 'assistant',
//   //       content: msg.content,
//   //       ...(createdAt ? { createdAt } : {}),
//   //     };
//   //   });
//   // }, [persistedMessages]);

//   // const messageCount = persistedMessages.length;

//   // // Auto-scroll on new messages
//   // useEffect(() => {
//   //   const messageContainer = document.getElementById("message-container");
//   //   if (messageContainer) {
//   //     messageContainer.scrollTo({
//   //       top: messageContainer.scrollHeight,
//   //       behavior: "smooth",
//   //     });
//   //   }
//   // }, [messageCount]);

//   const handleSubmit = async() => {
//     // e.preventDefault();
//     const trimmedInput = input.trim();
//     if (!trimmedInput || isLoading) return;
//     // setError(null);
//     // setIsLoading(true);

//     const userMessage: ChatMessage = {
//       id: Date.now().toString(),
//       role: "user",
//       content: input
//     }

//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");
//     setIsLoading(true);

//     // const outgoingHistory = [
//     //   ...persistedMessages.map(({ role, content }) => ({ role, content })),
//     //   { role: 'user', content: trimmedInput } as const,
//     // ];

//     // Send the message (along with chatId) to API
//     try {
//       // await fetch('/api/chat', {
//       //   method: "POST",
//       //   headers: { "Content-Type": "application/json" },
//       //   body: JSON.stringify({ 
//       //     chatId,
//       //     messages: outgoingHistory
//       //   }),
//       // });
//       // setInput("");
//       // // Always refetch to reload all messages (user & assistant)
//       // await refetch();


//       const response = await fetch("/api/chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json"},
//         body: JSON.stringify({
//           chatId,
//           prompt: userMessage.content
//         }) 
//       });

//       if (!response.ok) throw new Error("API request failed");

//       const data = await response.json();

//       setMessages((prev) => [...prev, {
//         id: Date.now().toString(),
//         role: "assistant",
//         content: data.reply
//       }]);

//     } catch (error) {
//       console.error("Transmission error: ", error);
//     } finally {
//       setIsLoading(false);
//     }
//   }

//   return (
//     <div className="flex flex-col h-full w-full relative">
//       {/* Scrollable Viewport */}
//       <ChatContainerRoot className="flex-1 p-4 md:p-6 pb-24">
//         {/* Message Wrapper */}
//         <ChatContainerContent>
//           {messages.map((msg) => (
//             <Message 
//               key={msg.id} 
//               role={msg.role} 
//               content={msg.content} 
//             />
//           ))}
//           {isLoading && (
//             <div className="text-sm text-slate-500 animate-pulse mt-2">
//               Processing request...
//             </div>
//           )}
//         </ChatContainerContent>
//       </ChatContainerRoot>
      
//       <ScrollButton />

//       {/* Input Field - Pinned to bottom */}
//       <div className="absolute bottom-0 left-0 w-full p-4 bg-white/80 backdrop-blur-sm border-t border-slate-200">
//         <div className="max-w-4xl mx-auto">
//           <PromptInput 
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onSubmit={handleSubmit}
//             placeholder="Enter your query..."
//             disabled={isLoading}
//           />
//         </div>
//       </div>
//     </div>
//   );

// };

"use client";

import { useState, useRef } from "react";
import { Send, Paperclip, Bot, User, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import { getPresignedUploadUrl } from "@/lib/db/s3";
import { 
  ChatContainerRoot, 
  ChatContainerContent 
} from "@/components/ui/chat-container"; 
import { Message } from "@/components/ui/message";
import { 
  PromptInput, 
  PromptInputTextarea 
} from "@/components/ui/prompt-input";
import { ScrollButton } from "@/components/ui/scroll-button";

type AppMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
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
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false); // Tracks new document upload state
  
  const [messages, setMessages] = useState<AppMessage[]>(
    initialMessages.length > 0 
      ? initialMessages 
      : [{ id: "system-1", role: "assistant", content: "System initialized. Document loaded." }]
  );

  // --- NEW: Document Upload Logic (Ports your UploadComponent logic) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File Too large! Please upload under 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setIsUploadingDoc(true);
      toast.loading("Grilling your paper...", { id: "upload-toast" });

      // 1. Get AWS Presigned URL
      const { uploadUrl, file_key } = await getPresignedUploadUrl(file.name, file.type);
      if (!file_key || !uploadUrl) {
        throw new Error("Failed to get presigned URL");
      }

      // 2. Upload directly to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to S3");
      }

      // 3. Trigger Pinecone vectorization and DB chat creation
      const response = await axios.post('/api/create-chat', { 
        file_key, 
        file_name: file.name 
      });

      // 4. Redirect to the newly created chat
      toast.success("New Chat Created!", { id: "upload-toast" });
      router.push(`/chat/${response.data.chat_id}`);

    } catch (error) {
      console.error("Upload pipeline error:", error);
      toast.error("Error creating chat!", { id: "upload-toast" });
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
    }
  };

  // --- Standard Chat Submission Logic ---
  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: AppMessage = { 
      id: Date.now().toString(), 
      role: "user", 
      content: input 
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, messages: updatedMessages })
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      setMessages((prev) => [...prev, { 
        id: Date.now().toString(), 
        role: "assistant", 
        content: data.text 
      }]);
    } catch (error) {
      console.error("Transmission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-slate-50">
      <ChatContainerRoot className="flex-1 p-4 md:p-8 pb-32">
        <ChatContainerContent className="max-w-4xl mx-auto flex flex-col gap-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 shrink-0 mt-1">
                  <Bot size={18} className="text-blue-600" />
                </div>
              )}

              <div className={`px-5 py-3.5 max-w-[85%] md:max-w-[75%] text-sm md:text-base leading-relaxed shadow-sm ${
                msg.role === "user" ? "bg-slate-800 text-white rounded-2xl rounded-tr-sm" : "bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm"
              }`}>
                {msg.content}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300 shrink-0 mt-1">
                  <User size={18} className="text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 w-full justify-start animate-pulse">
               <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
               <div className="h-10 w-24 bg-slate-200 rounded-2xl rounded-tl-sm" />
            </div>
          )}
        </ChatContainerContent>
        <ScrollButton />
      </ChatContainerRoot>

      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-10">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-white p-2 rounded-2xl border border-slate-300 shadow-sm focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100 transition-all">
          
          {/* NEW: Hidden File Input configured for PDFs */}
          <input 
            type="file" 
            accept=".pdf"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* NEW: Upload Trigger Button */}
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-400 hover:text-slate-800 transition-colors shrink-0 disabled:opacity-50"
            disabled={isLoading || isUploadingDoc}
            title="Upload new PDF"
          >
            {isUploadingDoc ? (
              <Loader2 size={20} className="animate-spin text-blue-600" />
            ) : (
              <Paperclip size={20} />
            )}
          </button>

          <div className="flex-1 relative">
            <PromptInput 
              value={input}
              onValueChange={setInput}
              onSubmit={handleSubmit}
              disabled={isLoading || isUploadingDoc}
            >
              <PromptInputTextarea 
                placeholder={isUploadingDoc ? "Creating new chat..." : "Ask about this document..."} 
                className="w-full min-h-[44px] max-h-[200px] py-3 pr-12 bg-transparent resize-none outline-none focus:outline-none focus:ring-0 border-none text-slate-900 placeholder:text-slate-400 shadow-none disabled:opacity-50" 
              />
            </PromptInput>

            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading || isUploadingDoc}
              className="absolute right-1 bottom-1 p-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}