import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Zap, Shield, ArrowRight, LogOut } from "lucide-react";
import HomeClient from "@/components/HomeClient";

export const runtime = "nodejs";

const features = [
  {
    icon: FileText,
    title: "PDF Upload",
    description: "Upload any PDF document and start chatting with it instantly"
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    description: "Ask questions and get accurate answers from your documents"
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "Powered by DeepSeek AI for lightning-fast responses"
  },
  {
    icon: Shield,
    title: "Secure Storage",
    description: "Your documents are stored securely in S3 with vector embeddings"
  }
];

export default async function HomePage() {
  const { userId } = await auth();
  const isAuthenticated = !!userId;

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 size-8 sm:size-9 rounded-lg flex items-center justify-center">
              <FileText size={18} className="text-primary" />
            </div>
            <span className="font-semibold text-foreground">DocuChat AI</span>
          </div>

          {isAuthenticated ? (
            <Link href="/sign-out">
              <Button variant="ghost" size="sm" className="gap-2">
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {!isAuthenticated ? (
        <section className="flex-1 flex flex-col items-center justify-center py-12 sm:py-24 px-4">
          <div className="max-w-3xl w-full text-center space-y-6 sm:space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Chat with your PDF documents
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                Upload any PDF and get instant AI-powered answers.
                Extract insights, summarize content, and find information fast.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/sign-up">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  Get Started Free
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-8 sm:pt-12">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 sm:p-5 rounded-xl border bg-card text-card-foreground transition-colors hover:bg-accent"
                >
                  <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                    <feature.icon size={22} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold mb-1 text-sm">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <HomeClient />
      )}

      <footer className="border-t py-4 sm:py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>DocuChat AI - Powered by DeepSeek & Pinecone</p>
        </div>
      </footer>
    </main>
  );
}
