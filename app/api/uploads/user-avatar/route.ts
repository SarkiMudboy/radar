import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image too large (max 2MB)." },
      { status: 413 },
    );
  }

  const uploadDir = join(process.cwd(), "public", "uploads", "user-avatars");
  await mkdir(uploadDir, { recursive: true });

  const ext = extname(file.name) || ".png";
  const fileName = `${randomUUID()}${ext}`;
  const absolutePath = join(uploadDir, fileName);
  const bytes = await file.arrayBuffer();
  await writeFile(absolutePath, Buffer.from(bytes));

  const url = `/uploads/user-avatars/${fileName}`;
  return NextResponse.json({ url });
}

