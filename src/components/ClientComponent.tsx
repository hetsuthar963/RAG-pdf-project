"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from '@clerk/nextjs';

const ClientComponent = () => {
  const { userId } = useAuth();
  const isAuth = !!userId;

  return (
    <div className="flex mt-2">
      {isAuth && <Button>Go to Ask</Button>}
    </div>
  );
};

export default ClientComponent;