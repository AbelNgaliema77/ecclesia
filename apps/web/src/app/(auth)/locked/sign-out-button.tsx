"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      className="mt-8"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
    >
      {label}
    </Button>
  );
}
