import { Mail, MapPin, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/get-dictionary";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata = { title: "Contact our concierge" };

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <div className="luxury-container pb-24 page-pad"><div className="grid gap-14 lg:grid-cols-2"><div><p className="text-[11px] uppercase tracking-[.24em] text-accent">Private concierge</p><h1 className="mt-3 font-display text-6xl">How may we assist?</h1><p className="mt-5 max-w-lg leading-7 text-muted-foreground">Whether you are seeking a particular reference or guidance for your first exceptional watch, our team responds with discretion.</p><div className="mt-10 space-y-5 text-sm"><a href={`mailto:${siteConfig.supportEmail}`} className="flex items-center gap-3 hover:text-accent"><Mail className="h-4 w-4" />{siteConfig.supportEmail}</a><a href={`tel:${siteConfig.supportPhone.replaceAll(" ", "")}`} className="flex items-center gap-3 hover:text-accent"><Phone className="h-4 w-4" />{siteConfig.supportPhone}</a><p className="flex items-center gap-3"><MapPin className="h-4 w-4" />Casablanca, Morocco</p></div></div><form action={`mailto:${siteConfig.supportEmail}`} method="post" encType="text/plain" className="border bg-card p-8"><h2 className="font-display text-3xl">Send an enquiry</h2><div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="Name" name="name" /><Field label="Email" name="email" type="email" /><div className="sm:col-span-2"><Field label="Subject" name="subject" /></div><div className="sm:col-span-2"><Label htmlFor="message">Message</Label><Textarea id="message" name="message" required className="mt-2 min-h-36" /></div></div><Button type="submit" size="lg" className="mt-6">Contact concierge</Button></form></div></div>;
}

function Field({ label, name, ...props }: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return <div><Label htmlFor={name}>{label}</Label><Input id={name} name={name} required className="mt-2" {...props} /></div>;
}
