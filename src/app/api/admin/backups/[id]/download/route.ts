import { NextResponse } from "next/server";
import { getVerifiedBackupFile } from "@/server/backup/service";
import {
  authorizeAdminSensitivePost,
  methodNotAllowedGet,
} from "@/server/auth/admin-sensitive-post";

export const maxDuration = 60;

export async function GET() {
  return methodNotAllowedGet();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await authorizeAdminSensitivePost(request, "system.manage");
  if (!gate.ok) return gate.response;

  try {
    const { id } = await context.params;
    if (!id || id.length > 64 || !/^[a-z0-9]+$/i.test(id)) {
      return NextResponse.json({ error: "Invalid backup id." }, { status: 400 });
    }
    const file = await getVerifiedBackupFile(id, gate.user.id);
    return new Response(new Uint8Array(file.body), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Download failed." }, { status: 400 });
  }
}
