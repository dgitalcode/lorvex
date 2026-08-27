import { permanentRedirect } from "next/navigation";
import { siteConfig } from "@/config/site";

export default function RootPage() {
  permanentRedirect(`/${siteConfig.localeDefault}`);
}
