import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileWarning,
  Loader2,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Button } from '@/components/ui/button'
import { dataStore } from '@/repositories'
import { toast } from 'sonner'

// Configure PDF.js worker using Vite asset URL for 100% offline support
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

interface PdfViewerModalProps {
  open: boolean
  onClose: () => void
  blobId?: string
  blob?: Blob | File
  filename: string
}

export function PdfViewerModal({
  open,
  onClose,
  blobId,
  blob: directBlob,
  filename,
}: PdfViewerModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [rendering, setRendering] = useState(false)
  const [resolvedBlob, setResolvedBlob] = useState<Blob | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const renderTaskRef = useRef<any>(null)

  // 1. Load document when modal opens
  useEffect(() => {
    if (!open) {
      setPdfDoc(null)
      setError(null)
      setNumPages(0)
      setCurrentPage(1)
      setResolvedBlob(null)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    async function loadPdf() {
      try {
        let fileBlob = directBlob
        if (!fileBlob && blobId) {
          const record = await dataStore.getFileBlob(blobId)
          if (!record) {
            throw new Error('PDF file could not be found in local storage.')
          }
          fileBlob = record.blob
        }

        if (!fileBlob) {
          throw new Error('No PDF file provided to view.')
        }

        if (isMounted) setResolvedBlob(fileBlob)

        const arrayBuffer = await fileBlob.arrayBuffer()
        if (!isMounted) return

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const doc = await loadingTask.promise

        if (!isMounted) return
        setPdfDoc(doc)
        setNumPages(doc.numPages)
        setCurrentPage(1)
        setLoading(false)
      } catch (err: any) {
        if (!isMounted) return
        console.error('PDF.js loading error:', err)
        setError(
          err?.message ||
            'Failed to open PDF. The file may be corrupted or unsupported.',
        )
        setLoading(false)
      }
    }

    void loadPdf()

    return () => {
      isMounted = false
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {
          /* ignore cancel error */
        }
      }
    }
  }, [open, blobId, directBlob])

  // 2. Render current page on canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !open) return

    let isCancelled = false
    setRendering(true)

    async function renderPage() {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {
            /* ignore */
          }
        }

        const page = await pdfDoc!.getPage(currentPage)
        if (isCancelled || !canvasRef.current) return

        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        const renderTask = page.render(renderContext as any)
        renderTaskRef.current = renderTask
        await renderTask.promise
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('PDF rendering error:', err)
        }
      } finally {
        if (!isCancelled) setRendering(false)
      }
    }

    void renderPage()

    return () => {
      isCancelled = true
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {
          /* ignore */
        }
      }
    }
  }, [pdfDoc, currentPage, scale, open])

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(3.0, Math.round((s + 0.25) * 100) / 100))
  const zoomOut = () => setScale((s) => Math.max(0.5, Math.round((s - 0.25) * 100) / 100))
  const fitWidth = () => {
    if (!containerRef.current || !pdfDoc) return
    pdfDoc.getPage(currentPage).then((page) => {
      const naturalViewport = page.getViewport({ scale: 1.0 })
      const containerWidth = containerRef.current?.clientWidth ?? 800
      const desiredScale = Math.max(0.6, (containerWidth - 64) / naturalViewport.width)
      setScale(Math.round(desiredScale * 100) / 100)
    })
  }

  // Download action
  const handleDownload = () => {
    if (!resolvedBlob) {
      toast.error('File data not ready for download')
      return
    }
    const url = URL.createObjectURL(resolvedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'document.pdf'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 20_000)
    toast.success('Download started')
  }

  // Share action
  const handleShare = async () => {
    if (!resolvedBlob) return
    if (!navigator.share) {
      toast.error('Sharing is not supported on this browser')
      return
    }
    try {
      const file = new File([resolvedBlob], filename || 'document.pdf', {
        type: resolvedBlob.type || 'application/pdf',
      })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
        })
      } else {
        await navigator.share({
          title: filename,
          text: `PDF Document: ${filename}`,
        })
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to share document')
      }
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-viewer-title"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md text-white animate-in fade-in duration-200"
    >
      {/* Top Navigation Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 bg-slate-900/90">
        <div className="flex min-w-0 items-center gap-3">
          <h2 id="pdf-viewer-title" className="truncate text-sm font-semibold tracking-wide">
            {filename}
          </h2>
          {numPages > 0 && (
            <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-300">
              Page {currentPage} of {numPages}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-white/5 rounded-lg p-0.5 mr-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-200 hover:text-white hover:bg-white/10"
              onClick={zoomOut}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs px-1 text-slate-300 min-w-[3rem] text-center font-mono">
              {Math.round(scale * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-200 hover:text-white hover:bg-white/10"
              onClick={zoomIn}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-200 hover:text-white hover:bg-white/10"
              onClick={fitWidth}
              aria-label="Fit width"
              title="Fit to width"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Share */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-200 hover:text-white hover:bg-white/10"
              onClick={handleShare}
              aria-label="Share document"
              title="Share"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}

          {/* Download */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-200 hover:text-white hover:bg-white/10"
            onClick={handleDownload}
            aria-label="Download PDF"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </Button>

          {/* Close */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-200 hover:text-white hover:bg-white/10 ml-1"
            onClick={onClose}
            aria-label="Close viewer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        ref={containerRef}
        className="relative flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading PDF document…</p>
          </div>
        )}

        {error && (
          <div className="flex max-w-md flex-col items-center justify-center gap-3 text-center p-6 bg-slate-900 rounded-2xl border border-red-500/20">
            <FileWarning className="h-10 w-10 text-red-400" />
            <h3 className="text-base font-semibold text-red-200">Could not display PDF</h3>
            <p className="text-xs text-slate-400">{error}</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
              {resolvedBlob && (
                <Button size="sm" onClick={handleDownload}>
                  Download file
                </Button>
              )}
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col items-center">
            <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white">
              <canvas ref={canvasRef} className="block max-w-full h-auto" />
              {rendering && (
                <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Page Navigation Bar */}
      {!loading && !error && numPages > 1 && (
        <footer className="flex h-14 shrink-0 items-center justify-center gap-3 border-t border-white/10 px-4 bg-slate-900/90">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="border-white/20 text-slate-200 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-xs text-slate-300 font-medium">
            Page {currentPage} of {numPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            className="border-white/20 text-slate-200 hover:text-white hover:bg-white/10"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </footer>
      )}
    </div>
  )
}
