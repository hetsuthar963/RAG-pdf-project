'use client'
import React, { useState } from 'react'
import { Input } from "./ui/input"
import { Button } from './ui/button'
import MessageList from './MessageList'
import { Send } from 'lucide-react'
import { Message } from 'ai/react'

const ChatComponentManual = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, userMessage]
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No reader available');
            }

            const assistantMessage: Message = {
                id: Date.now().toString() + '_assistant',
                role: 'assistant',
                content: 'Hello Hetjsklahc'
            };

            setMessages(prev => [...prev, assistantMessage]);

            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                
                if (value) {
                    const chunk = decoder.decode(value);
                    console.log('Received chunk:', chunk);
                    
                    // Update the assistant message with new content
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage.role === 'assistant') {
                            lastMessage.content += chunk;
                        }
                        return newMessages;
                    });
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString() + '_error',
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='relative max-h-screen overflow-scroll'>
            {/* Header */}
            <div className='sticky top-0 inset-x-0 p-2 bg-white h-fit'>
                <h3 className='text-xl font-bold'>
                    Chat (Manual)
                </h3>
            </div>

            {/* Message list */}
            <MessageList messages={messages} isLoading={isLoading}/>

            <form onSubmit={handleSubmit} className='sticky bottom-0 inset-x-0 px-2 py-4 bg-white'>
                <div className="flex">
                    <Input 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        placeholder="Ask any question..." 
                        className="w-full"
                        disabled={isLoading}
                    />
                    <Button 
                        className='bg-blue-600 ml-2' 
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Sending...' : <Send className='h-4 w-4'/>}
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default ChatComponentManual
