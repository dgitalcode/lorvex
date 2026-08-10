"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutUser } from "@/server/actions/auth";
import type { Locale } from "@/config/site";

export function SignOutButton({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  return (
    <form action={signOutUser}>
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="outline" size="sm" className="gap-2">
        <LogOut className="h-4 w-4" />
        {label}
      </Button>
    </form>
  );
}
