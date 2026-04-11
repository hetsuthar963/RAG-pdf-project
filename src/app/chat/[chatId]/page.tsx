import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { chats, message as _message } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import ChatSideBar from '@/components/ChatSideBar';
import ChatComponent from '@/components/ChatComponent';

type ChatPageProps = {
  params: Promise<{ chatId: string }>;
};


const ChatPage = async ({ params }: ChatPageProps) => {
  const { chatId } = await params;
  const { userId } = await auth();

  if (!userId) redirect('/sign-in');

  try {
    const userChats = await db.select().from(chats).where(eq(chats.userId, userId));
    const currentChat = userChats.find(chat => chat.id === parseInt(chatId));
    
    if (!currentChat) redirect('/');

    const chatHistory = await db
      .select()
      .from(_message)
      .where(eq(_message.chatId, parseInt(chatId)))
      .orderBy(asc(_message.createdAt));

    const formattedHistory = chatHistory.map(msg => ({
      id: msg.id.toString(),
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content
    }));

    // const signedPdfUrl = currentChat.pdfUrl 
    //   ? await getSignedViewUrl(currentChat.pdfUrl)
    //   : '';

    return (
      <div className="flex h-screen overflow-hidden bg-white">
        <div className="flex-[1] max-w-xs">
          <ChatSideBar chats={userChats} chatId={parseInt(chatId)} />
        </div>
        
       
          {/* <div className="max-h-screen p-4 overflow-scroll flex-[5]">
            {signedPdfUrl ? (
              // <PDFViewerWrapper pdfUrl={signedPdfUrl} />
              // <PDFViewer pdf_url={signedPdfUrl}/>
            ) : (
              <div className="flex-center h-full text-gray-500">
                No PDF document available
              </div>
            )}
        </div> */}
        <div className="flex-[3] flex flex-col h-full relative">
            <ChatComponent chatId={chatId} initialMessages={formattedHistory}/>
          </div>
      </div>
    );
  } catch (error) {
    console.error('Chat Page Error:', error);
    redirect('/');
  }
};


export default ChatPage;
