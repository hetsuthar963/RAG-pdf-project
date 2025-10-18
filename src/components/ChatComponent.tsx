// 




'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { Input } from "./ui/input";
import { Button } from './ui/button';
import MessageList from './MessageList';
import { Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { Message } from 'ai/react';

type Props = { chatId: string };

type DbMessage = {
  id: number;
  chatId: number;
  content: string;
  createdAt: string | Date | null;
  role: 'user' | 'system';
};

const ChatComponent = ({ chatId }: Props) => {
  // Fetch all persisted messages from DB
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const response = await axios.post<DbMessage[]>('/api/getMessages', { chatId });
      return response.data;
    }
  });

  // Local state for typing and error
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistedMessages = useMemo<DbMessage[]>(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  // Use fetched messages as source of truth
  const uiMessages = useMemo<Message[]>(() => {
    return persistedMessages.map((msg) => {
      const createdAtValue = msg.createdAt ? new Date(msg.createdAt) : undefined;
      const createdAt = createdAtValue && !Number.isNaN(createdAtValue.getTime()) ? createdAtValue : undefined;

      return {
        id: String(msg.id),
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
        ...(createdAt ? { createdAt } : {}),
      };
    });
  }, [persistedMessages]);

  const messageCount = persistedMessages.length;

  // Auto-scroll on new messages
  useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    if (messageContainer) {
      messageContainer.scrollTo({
        top: messageContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messageCount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;
    setError(null);
    setIsLoading(true);

    const outgoingHistory = [
      ...persistedMessages.map(({ role, content }) => ({ role, content })),
      { role: 'user', content: trimmedInput } as const,
    ];

    // Send the message (along with chatId) to API
    try {
      await fetch('/api/chat', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chatId,
          messages: outgoingHistory
        }),
      });
      setInput("");
      // Always refetch to reload all messages (user & assistant)
      await refetch();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className='relative max-h-screen overflow-scroll' id='message-container'>
      {/* Header */}
      <div className='sticky top-0 inset-x-0 p-2 bg-white h-fit z-10'>
        <h3 className='text-xl font-bold'>Chat</h3>
      </div>
      {/* Message list */}
      <MessageList messages={uiMessages} isLoading={isLoading || isFetching} />
      <form onSubmit={handleSubmit} className='sticky bottom-0 inset-x-0 px-2 py-4 bg-white'>
        <div className="flex">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask any question..."
            className="w-full"
            disabled={isLoading}
            autoFocus
          />
          <Button
            className='bg-blue-600 ml-2'
            type="submit"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? 'Sending...' : <Send className='h-4 w-4'/>}
          </Button>
        </div>
        {error && (
          <div className="text-red-500 text-sm mt-2">
            Error: {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatComponent;
