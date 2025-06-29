import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { chats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import ChatSideBar from '@/components/ChatSideBar';
import { getSignedViewUrl } from "@/lib/db/s3";
// import PDFViewerWrapper from '@/components/simple-pdf-viewer';
import PDFViewer from '@/components/PDFViewer';
import ChatComponentManual from '@/components/ChatComponentManual';
import ChatComponent from '@/components/ChatComponent';

type Props = {
  params:{  chatId: string }
};

const ChatPage = async ({ params }: Props) => {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const chatId = params.chatId;
  
  try {
    const userChats = await db.select().from(chats).where(eq(chats.userId, userId));
    const currentChat = userChats.find(chat => chat.id === parseInt(chatId));
    
    if (!currentChat) redirect('/');

    const signedPdfUrl = currentChat.pdfUrl 
      ? await getSignedViewUrl(currentChat.pdfUrl)
      : '';

    return (
      <div className="flex h-screen overflow-hidden">
        <div className="flex-[1] max-w-xs">
          <ChatSideBar chats={userChats} chatId={parseInt(chatId)} />
        </div>
        
       
          <div className="max-h-screen p-4 overflow-scroll flex-[5]">
            {signedPdfUrl ? (
              // <PDFViewerWrapper pdfUrl={signedPdfUrl} />
              <PDFViewer pdf_url={currentChat?.pdfUrl || ''}/>
            ) : (
              <div className="flex-center h-full text-gray-500">
                No PDF document available
              </div>
            )}
        </div>
        <div className='flex-[3] border-1-4 border-1-slate-200'>
            <ChatComponent chatId={chatId}/>
          </div>
      </div>
    );
  } catch (error) {
    console.error('Chat Page Error:', error);
    redirect('/');
  }
};


export default ChatPage;