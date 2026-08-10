import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/server/services/security";

/**
 * Image search architecture endpoint.
 * Accepts an image URL or future multipart upload signature.
 * Returns a structured response ready for a vision provider
 * (Cloudinary AI / custom embeddings) without fake matches.
 */
const schema = z.object({
  imageUrl: z.string().url().optional(),
  publicId: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = await checkRateLimit({
    key: `image-search:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (!body.success || (!body.data.imageUrl && !body.data.publicId)) {
    return NextResponse.json(
      {
        status: "ready",
        message:
          "Image search architecture is ready. Provide imageUrl or Cloudinary publicId once a vision provider is configured.",
        pipeline: [
          "1. Client captures / uploads image",
          "2. Server normalizes via Cloudinary",
          "3. Embedding / visual tags generated",
          "4. Hybrid rank against catalog media",
        ],
        results: [],
        configured: Boolean(
          process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
        ),
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    status: "queued",
    message:
      "Image accepted. Connect a vision provider to return visual matches.",
    input: {
      imageUrl: body.data.imageUrl ?? null,
      publicId: body.data.publicId ?? null,
    },
    results: [],
    configured: Boolean(
      process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
    ),
  });
}
