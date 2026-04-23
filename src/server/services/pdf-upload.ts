import { put, del, get } from "@vercel/blob";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buf: Buffer,
) => Promise<{ text: string }>;

export class PdfUploadService {
  async upload(
    pdfBuffer: Buffer,
    pathname: string,
  ): Promise<{ url: string; extractedText: string }> {
    const blob = await put(pathname, pdfBuffer, {
      access: "private",
      contentType: "application/pdf",
    });

    let extractedText = "";
    try {
      const parsed = await pdfParse(pdfBuffer);
      extractedText = parsed.text;
    } catch (e) {
      console.warn("PDF text extraction failed:", e);
    }

    return { url: blob.url, extractedText };
  }

  /** Stream a private blob through the server. Returns a Response ready to be forwarded. */
  async stream(url: string): Promise<Response> {
    const result = await get(url, { access: "private" });
    if (!result) return new Response("Not found", { status: 404 });
    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "application/pdf",
        "Content-Disposition": result.blob.contentDisposition,
      },
    });
  }

  async delete(url: string): Promise<void> {
    await del(url);
  }
}
