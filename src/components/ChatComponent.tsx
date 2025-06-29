// 




'use client'
import React, { useState, useEffect } from 'react';
import { Input } from "./ui/input";
import { Button } from './ui/button';
import MessageList from './MessageList';
import { Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

type Message = { role: "user" | "assistant" | "system", content: string };
type Props = { chatId: string };

const ChatComponent = ({ chatId }: Props) => {
  // Fetch all persisted messages from DB
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const response = await axios.post<Message[]>('/api/getMessages', { chatId });
      return response.data;
    }
  });

  // Local state for typing and error
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use fetched messages as source of truth
  const messages = Array.isArray(data) ? data : [];

  // Auto-scroll on new messages
  useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    if (messageContainer) {
      messageContainer.scrollTo({
        top: messageContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setError(null);
    setIsLoading(true);

    // Send the message (along with chatId) to API
    try {
      await fetch('/api/chat', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chatId,
          messages: [...messages, { role: "user", content: input }]
        }),
      });
      setInput("");
      // Always refetch to reload all messages (user & assistant)
      await refetch();
    } catch (err: any) {
      setError(err.message || "Error");
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
      <MessageList messages={messages} isLoading={isLoading || isFetching} />
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