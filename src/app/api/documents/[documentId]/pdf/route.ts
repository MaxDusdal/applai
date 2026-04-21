import { headers } from "next/headers";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { PdfUploadService } from "@/server/services/pdf-upload";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { documentId } = await params;

  const doc = await db.document.findFirst({
    where: { id: documentId, userId: session.user.id },
    select: { pdfUrl: true, isUploadedPdf: true, name: true, type: true },
  });

  if (!doc) return new Response("Not found", { status: 404 });
  if (!doc.isUploadedPdf || !doc.pdfUrl) {
    return new Response("Not an uploaded PDF", { status: 400 });
  }

  const pdfService = new PdfUploadService();
  const response = await pdfService.stream(doc.pdfUrl);

  // Attach a friendly filename for downloads
  const filename = (doc.name ?? doc.type).replace(/[^a-zA-Z0-9_.-]/g, "_") + ".pdf";
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Content-Disposition", `inline; filename="${filename}"`);

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}
