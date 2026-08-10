"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSiteSettings } from "@/server/actions/admin/system";
import type { UpdateSiteSettingsInput } from "@/server/validations/admin/system";

export type SiteSettingsFormValues = UpdateSiteSettingsInput;

export function SiteSettingsForm({
  settings,
}: {
  settings: SiteSettingsFormValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(settings);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateSiteSettings(form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Settings saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="System"
        title="Site settings"
        description="Global storefront configuration, branding and operational toggles."
      />

      <form onSubmit={handleSubmit} className="grid max-w-3xl gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="siteName">Site name</Label>
            <Input
              id="siteName"
              value={form.siteName}
              onChange={(e) => setForm((prev) => ({ ...prev, siteName: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={form.tagline ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={form.logoUrl ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoDarkUrl">Dark logo URL</Label>
            <Input
              id="logoDarkUrl"
              value={form.logoDarkUrl ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, logoDarkUrl: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faviconUrl">Favicon URL</Label>
            <Input
              id="faviconUrl"
              value={form.faviconUrl ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, faviconUrl: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={form.supportEmail ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, supportEmail: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportPhone">Support phone</Label>
            <Input
              id="supportPhone"
              value={form.supportPhone ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, supportPhone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">WhatsApp number</Label>
            <Input
              id="whatsappNumber"
              value={form.whatsappNumber ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultLocale">Default locale</Label>
            <Select
              value={form.defaultLocale}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  defaultLocale: value as SiteSettingsFormValues["defaultLocale"],
                }))
              }
            >
              <SelectTrigger id="defaultLocale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">Default currency</Label>
            <Input
              id="defaultCurrency"
              value={form.defaultCurrency}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultCurrency: e.target.value }))}
              maxLength={3}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="socialInstagram">Instagram</Label>
            <Input
              id="socialInstagram"
              value={form.socialInstagram ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, socialInstagram: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialFacebook">Facebook</Label>
            <Input
              id="socialFacebook"
              value={form.socialFacebook ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, socialFacebook: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialTikTok">TikTok</Label>
            <Input
              id="socialTikTok"
              value={form.socialTikTok ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, socialTikTok: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialYoutube">YouTube</Label>
            <Input
              id="socialYoutube"
              value={form.socialYoutube ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, socialYoutube: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-md border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="enableGuestCheckout">Guest checkout</Label>
              <p className="text-xs text-muted-foreground">Allow checkout without an account.</p>
            </div>
            <Switch
              id="enableGuestCheckout"
              checked={form.enableGuestCheckout}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, enableGuestCheckout: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="enableReviews">Product reviews</Label>
              <p className="text-xs text-muted-foreground">Enable review submissions on PDP.</p>
            </div>
            <Switch
              id="enableReviews"
              checked={form.enableReviews}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, enableReviews: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="maintenanceMode">Maintenance mode</Label>
              <p className="text-xs text-muted-foreground">Show maintenance experience to visitors.</p>
            </div>
            <Switch
              id="maintenanceMode"
              checked={form.maintenanceMode}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, maintenanceMode: checked }))
              }
            />
          </div>
        </div>

        <Button type="submit" disabled={pending}>
          Save settings
        </Button>
      </form>
    </div>
  );
}
