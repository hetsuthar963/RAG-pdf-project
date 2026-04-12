"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import { cn } from "@/lib/utils";
import Link from "next/link";

import { DrizzleChat } from "@/lib/db/schema";

import {
  ArrowUp, Copy, Square, Plus, PlusIcon,
  Check, Home, LogOut, FileText
} from "lucide-react";

import { Markdown } from "@/components/ui/markdown";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuButton, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/ui/prompt-input";

import { RagProcessTracker } from "./ui/ragProcessTracker";

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

function ChatSidebar({ chats, currentChatId }: { chats: DrizzleChat[]; currentChatId: number }) {
  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <div className="bg-primary/10 size-8 rounded-md" />
          <div className="text-sm font-medium text-foreground">DocuChat</div>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <div className="px-4">
          <Link href="/" className="block">
            <Button variant="outline" className="mb-3 flex w-full items-center gap-2">
              <PlusIcon size={16} />
              <span>New Chat</span>
            </Button>
          </Link>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarMenu>
            {chats.length === 0 ? (
              <div className="px-4 py-4 text-sm text-muted-foreground">No documents</div>
            ) : (
              chats.map((chat) => (
                <SidebarMenuButton key={chat.id} isActive={chat.id === currentChatId} asChild>
                  <Link href={`/chat/${chat.id}`}>
                    <span>{chat.pdfName}</span>
                  </Link>
                </SidebarMenuButton>
              ))
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto border-t p-4">
        <div className="flex flex-col gap-2">
          <Link href="/" className="block">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Home size={16} />
              <span>Home</span>
            </Button>
          </Link>
          <Link href="/sign-out" className="block">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <LogOut size={16} />
              <span>Sign Out</span>
            </Button>
          </Link>
        </div>
      </div>
    </Sidebar>
  );
}

function ChatContent({ chatId, initialMessages = [] }: { chatId: number; initialMessages?: AppMessage[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AppMessage[]>(initialMessages);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setStreamingMessageId(null);
      toast("Generation stopped", { icon: "🛑" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingDoc(true);

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

      const response = await axios.post('/api/create-chat', { file_key, file_name: file.name });
      router.push(`/chat/${response.data.chat_id}`);
      toast.success("Document analyzed!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return;

    abortControllerRef.current = new AbortController();
    const userMessage: AppMessage = { id: Date.now().toString(), role: "user", content: prompt };
    const tempAssistantId = (Date.now() + 1).toString();

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsLoading(true);
    setStreamingMessageId(tempAssistantId);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, messages: [...messages, userMessage] }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const ragData = JSON.parse(response.headers.get('X-Rag-Data') || '{}');

      setMessages((prev) => [...prev, { id: tempAssistantId, role: "assistant", content: "", ragData }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          setMessages((prev) => prev.map(m =>
            m.id === tempAssistantId ? { ...m, content: fullText } : m
          ));
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error(error instanceof Error ? error.message : "Error generating response");
      setMessages(prev => prev.filter(m => m.content !== "" || m.role === "user"));
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-background z-10 flex h-14 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <span className="text-sm font-medium text-foreground">Document Chat</span>
        </div>
      </header>

      {/* Messages Area */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="bg-primary/10 mb-4 rounded-2xl p-4">
                <FileText size={32} className="text-primary" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Start a conversation</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Ask questions about your uploaded document and get instant AI-powered answers.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((message, index) => {
                const isAssistant = message.role === "assistant";
                const isLastAssistantMessage = isAssistant && index === messages.length - 1;
                const isStreaming = isLastAssistantMessage && streamingMessageId === message.id;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "mx-auto flex w-full max-w-3xl flex-col gap-2",
                      isAssistant ? "items-start" : "items-end"
                    )}
                  >
                    {isAssistant && message.ragData && index > 0 && (
                      <RagProcessTracker ragData={message.ragData} />
                    )}

                    {isAssistant ? (
                      <div className="flex w-full flex-col gap-1">
                        <div className="flex flex-1 items-start gap-3">
                          <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                            <FileText size={14} className="text-primary" />
                          </div>
                          <div className={cn(
                            "flex-1 rounded-lg bg-transparent p-0",
                            isStreaming ? "flex items-center gap-2" : ""
                          )}>
                            {isStreaming ? (
                              <Loader variant="loading-dots" size="sm" text="Generating" />
                            ) : (
                              <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert">
                                <Markdown>{message.content}</Markdown>
                              </div>
                            )}
                          </div>
                        </div>
                        {message.content && !isStreaming && (
                          <button
                            onClick={() => copyToClipboard(message.content, message.id)}
                            className="-ml-2 self-start p-1.5 text-muted-foreground hover:text-foreground"
                            title="Copy"
                          >
                            {copiedId === message.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <div className="bg-primary text-primary-foreground max-w-[85%] rounded-3xl px-5 py-2.5 text-sm sm:max-w-[75%]">
                          {message.content}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <div className="mx-auto max-w-3xl">
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          
          <PromptInput
            isLoading={isLoading}
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={isLoading ? stopGeneration : handleSubmit}
            className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 shadow-xs"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder="Ask a question..."
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3]"
              />

              <PromptInputActions className="mt-2 flex w-full items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="Upload PDF">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingDoc}
                    >
                      {isUploadingDoc ? (
                        <Loader className="size-4 animate-spin" />
                      ) : (
                        <Plus size={18} />
                      )}
                    </Button>
                  </PromptInputAction>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    disabled={!prompt.trim() && !isLoading}
                    className="size-9 rounded-full"
                    onClick={isLoading ? stopGeneration : handleSubmit}
                  >
                    {isLoading ? (
                      <Square size={16} fill="currentColor" />
                    ) : (
                      <ArrowUp size={18} />
                    )}
                  </Button>
                </div>
              </PromptInputActions>
            </div>
          </PromptInput>
        </div>
      </div>
    </main>
  );
}

export default function ChatComponent({
  chatId,
  initialMessages = [],
  userChats = []
}: {
  chatId: string | number;
  initialMessages?: AppMessage[];
  userChats?: DrizzleChat[];
}) {
  const numericChatId = typeof chatId === "string" ? parseInt(chatId, 10) : chatId;

  return (
    <SidebarProvider>
      <ChatSidebar chats={userChats} currentChatId={numericChatId} />
      <SidebarInset>
        <ChatContent chatId={numericChatId} initialMessages={initialMessages} />
      </SidebarInset>
    </SidebarProvider>
  );
}
