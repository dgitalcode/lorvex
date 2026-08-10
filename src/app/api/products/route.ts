import { NextResponse } from "next/server";
import { getProductCardsByIds } from "@/server/repositories/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (!ids.length) {
    return NextResponse.json({ products: [] });
  }

  const products = await getProductCardsByIds(ids);
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
