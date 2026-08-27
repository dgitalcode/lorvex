import type { MetadataRoute } from "next";
import { buildRobotsDocument } from "@/lib/seo-indexability";

export default function robots(): MetadataRoute.Robots {
  return buildRobotsDocument();
}
