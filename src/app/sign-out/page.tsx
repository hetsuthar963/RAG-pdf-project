"use client";

import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function SignOutPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    signOut(() => router.push("/"));
  }, [signOut, router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Signing out...</h1>
      <Button variant="outline" onClick={() => signOut(() => router.push("/"))}>
        Click to sign out
      </Button>
    </div>
  );
}