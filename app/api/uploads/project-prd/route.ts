import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "PRD must be a PDF." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "PDF too large (max 10MB)." },
      { status: 413 },
    );
  }

  const uploadDir = join(process.cwd(), "public", "uploads", "project-prds");
  await mkdir(uploadDir, { recursive: true });

  const ext = extname(file.name) || ".pdf";
  const fileName = `${randomUUID()}${ext}`;
  const absolutePath = join(uploadDir, fileName);
  const bytes = await file.arrayBuffer();
  await writeFile(absolutePath, Buffer.from(bytes));

  const url = `/uploads/project-prds/${fileName}`;
  return NextResponse.json({ url });
}

