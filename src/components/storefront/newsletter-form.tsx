"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeNewsletter } from "@/server/actions/newsletter";
import type { Locale } from "@/config/site";
import { cn } from "@/lib/utils";

export function NewsletterForm({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={cn("flex flex-col gap-3 sm:flex-row", className)}
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await subscribeNewsletter({ email, locale });
          if (result.ok) {
            toast.success(
              locale === "ar"
                ? "تم الاشتراك بنجاح"
                : locale === "en"
                  ? "Subscribed successfully"
                  : "Inscription confirmée",
            );
            setEmail("");
          } else {
            toast.error(result.error);
          }
        });
      }}
    >
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="vous@email.com"
        className="sm:flex-1"
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "…" : "OK"}
      </Button>
    </form>
  );
}
