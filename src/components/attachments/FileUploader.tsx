import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/constants'
import { dataStore } from '@/repositories'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface FileUploaderProps {
  taskId: string
  onUploaded?: () => void
  className?: string
}

export function FileUploader({
  taskId,
  onUploaded,
  className,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (!list.length) return

    setUploading(true)
    try {
      for (const file of list) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} exceeds ${MAX_FILE_SIZE / (1024 * 1024)} MB`)
          continue
        }
        if (
          file.type &&
          !(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
        ) {
          toast.error(`${file.name}: file type not allowed`)
          continue
        }
        await dataStore.addTaskAttachment(taskId, file)
      }
      toast.success('Attachment added')
      onUploaded?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center transition',
        dragOver && 'border-primary bg-primary/5',
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files)
      }}
    >
      <Upload className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
      <p className="mb-2 text-sm text-muted-foreground">
        Drop files here or browse (max {MAX_FILE_SIZE / (1024 * 1024)} MB)
      </p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Uploading…' : 'Choose files'}
      </Button>
    </div>
  )
}
