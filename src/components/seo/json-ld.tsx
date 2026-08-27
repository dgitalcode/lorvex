import { serializeJsonLd } from "@/lib/json-ld";

export function JsonLd({ data }: { data: unknown }) {
  if (data == null) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
