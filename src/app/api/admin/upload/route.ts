import { authErrorResponse, requireAdminMutation } from "@/lib/auth-server";
import { adminStorage } from "@/lib/firebase-admin";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function safeName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .slice(0, 80) || "image"
  );
}

export async function POST(req: Request) {
  try {
    await requireAdminMutation(req);
    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "admin-uploads").replace(
      /[^a-z0-9/_-]+/gi,
      "",
    );

    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided." }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return Response.json(
        { error: "Only JPG, PNG, WebP or GIF images are allowed." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: "Image must be 5 MB or smaller." },
        { status: 400 },
      );
    }

    const bucket = adminStorage().bucket();
    const path = `${folder}/${Date.now()}-${safeName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await bucket.file(path).save(buffer, {
      metadata: { contentType: file.type },
      public: true,
    });
    const url = `https://storage.googleapis.com/${bucket.name}/${encodeURI(path)}`;
    return Response.json({ url, path }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdminMutation(req);
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    if (!path)
      return Response.json({ error: "Missing path." }, { status: 400 });
    // Only allow deleting files inside managed upload folders.
    if (!/^(admin-uploads|products|app-content)\//.test(path)) {
      return Response.json(
        { error: "This file cannot be deleted from here." },
        { status: 400 },
      );
    }
    await adminStorage()
      .bucket()
      .file(path)
      .delete()
      .catch(() => null);
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
