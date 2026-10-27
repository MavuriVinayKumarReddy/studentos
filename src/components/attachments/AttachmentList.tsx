import { useEffect, useState } from 'react'
import { Download, Eye, FileIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dataStore } from '@/repositories'
import type { TaskAttachment } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PdfViewerModal } from '@/components/attachments/PdfViewerModal'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface AttachmentListProps {
  taskId: string
  attachments: TaskAttachment[]
  onChanged?: () => void
  className?: string
}

export function AttachmentList({
  taskId,
  attachments,
  onChanged,
  className,
}: AttachmentListProps) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [activePdf, setActivePdf] = useState<{
    open: boolean
    blobId?: string
    filename: string
  }>({
    open: false,
    filename: '',
  })

  useEffect(() => {
    let cancelled = false
    const created: string[] = []

    const load = async () => {
      const next: Record<string, string> = {}
      for (const att of attachments) {
        if (att.url) {
          next[att.id] = att.url
          continue
        }
        if (!att.blobId) continue
        const record = await dataStore.getFileBlob(att.blobId)
        if (record) {
          const url = URL.createObjectURL(record.blob)
          created.push(url)
          next[att.id] = url
        }
      }
      if (!cancelled) setUrls(next)
    }

    void load()
    return () => {
      cancelled = true
      created.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [attachments])

  if (!attachments.length) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        No attachments yet.
      </p>
    )
  }

  return (
    <>
      <ul className={cn('space-y-2', className)}>
        {attachments.map((att) => {
          const isPdf = att.filename.toLowerCase().endsWith('.pdf') || att.mimeType === 'application/pdf'
          return (
            <li
              key={att.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2"
            >
              <FileIcon className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{att.filename}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatSize(att.size)} · {att.mimeType || 'file'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {isPdf && att.blobId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    aria-label={`Open ${att.filename}`}
                    title="Open in viewer"
                    onClick={() =>
                      setActivePdf({
                        open: true,
                        blobId: att.blobId,
                        filename: att.filename,
                      })
                    }
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {urls[att.id] ? (
                  <a
                    href={urls[att.id]}
                    download={att.filename}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                    aria-label={`Download ${att.filename}`}
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  aria-label={`Remove ${att.filename}`}
                  onClick={async () => {
                    try {
                      await dataStore.removeTaskAttachment(taskId, att.id)
                      toast.success('Attachment removed')
                      onChanged?.()
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed to remove')
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <PdfViewerModal
        open={activePdf.open}
        onClose={() => setActivePdf((p) => ({ ...p, open: false }))}
        blobId={activePdf.blobId}
        filename={activePdf.filename}
      />
    </>
  )
}
