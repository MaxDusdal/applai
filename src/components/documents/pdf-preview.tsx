"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { api } from "@/trpc/react";
import { Loader2, AlertCircle, ZoomIn, ZoomOut } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ZOOM_STEP = 0.15;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;

type PdfPreviewProps =
  | { source: string; yamlContent?: string; pdfUrl?: never }
  | { pdfUrl: string; source?: never; yamlContent?: never };

export function PdfPreview({ source, yamlContent, pdfUrl }: PdfPreviewProps) {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const compileMutation = api.document.compileSource.useMutation({
    onSuccess: (base64Pdf) => {
      const bytes = Uint8Array.from(atob(base64Pdf), (c) => c.charCodeAt(0));
      setPdfData(bytes);
      setError(null);
      setIsCompiling(false);
    },
    onError: (err) => {
      setError(err.message);
      setIsCompiling(false);
    },
  });

  // Load static PDF from URL
  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;
    setIsCompiling(true);
    fetch(pdfUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        if (!cancelled) {
          setPdfData(new Uint8Array(buf));
          setIsCompiling(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load PDF");
          setIsCompiling(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  const yamlRef = useRef(yamlContent);
  yamlRef.current = yamlContent;

  const compile = useCallback(
    (src: string) => {
      compileMutation.mutate({ source: src, yamlContent: yamlRef.current });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Compile from Typst source (only when not using pdfUrl)
  useEffect(() => {
    if (pdfUrl) return;
    const src = source ?? "";
    if (!src.trim()) {
      setError(null);
      setPdfData(null);
      setIsCompiling(false);
      return;
    }

    setIsCompiling(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      compile(src);
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [source, yamlContent, compile, pdfUrl]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const zoomIn = useCallback(
    () => setZoom((z) => Math.min(+(z + ZOOM_STEP).toFixed(2), ZOOM_MAX)),
    [],
  );
  const zoomOut = useCallback(
    () => setZoom((z) => Math.max(+(z - ZOOM_STEP).toFixed(2), ZOOM_MIN)),
    [],
  );
  const zoomReset = useCallback(() => setZoom(1), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        zoomReset();
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [zoomIn, zoomOut, zoomReset]);

  const file = useMemo(() => (pdfData ? { data: pdfData } : null), [pdfData]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
    },
    [],
  );

  const baseWidth = containerWidth ? containerWidth - 32 : undefined;

  if (error) {
    return (
      <div className="bg-destructive/10 flex h-full items-center justify-center rounded-lg border">
        <div className="max-w-md text-center">
          <AlertCircle className="text-destructive mx-auto mb-2 h-6 w-6" />
          <p className="text-destructive text-sm font-medium">
            {pdfUrl ? "Failed to load PDF" : "Compilation Error"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (isCompiling && !pdfData) {
    return (
      <div className="bg-muted flex h-full items-center justify-center rounded-lg border">
        <div className="flex items-center gap-2">
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          <p className="text-muted-foreground text-sm">
            {pdfUrl ? "Loading PDF..." : "Compiling..."}
          </p>
        </div>
      </div>
    );
  }

  if (!pdfData) {
    return (
      <div className="bg-muted flex h-full items-center justify-center rounded-lg border">
        <p className="text-muted-foreground text-sm">
          Write some Typst source to see the PDF preview.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Zoom controls */}
      <div className="bg-background/90 absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border px-1 py-1 shadow-sm backdrop-blur-sm">
        <button
          onClick={zoomOut}
          disabled={zoom <= ZOOM_MIN}
          className="hover:bg-muted rounded-full p-1.5 transition-colors disabled:opacity-40"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX}
          className="hover:bg-muted rounded-full p-1.5 transition-colors disabled:opacity-40"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>

      {isCompiling && (
        <div className="bg-background/80 absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded px-2 py-1">
          <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
          <span className="text-muted-foreground text-xs">Recompiling...</span>
        </div>
      )}
      <div ref={containerRef} className="bg-muted/50 h-full overflow-auto">
        <div className="flex flex-col items-center py-4">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
            error={null}
            noData={null}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <Page
                key={`${i}-${zoom}`}
                pageNumber={i + 1}
                width={baseWidth}
                scale={zoom}
                renderAnnotationLayer
                renderTextLayer
                loading={null}
                className="mb-4 shadow-md"
              />
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}
