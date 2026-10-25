import { useEffect, useState } from 'react'
import { Download, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'studentos-install-dismissed'

export function InstallPrompt({
  open,
  onOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v)
    onOpenChange?.(v)
  }

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      try {
        if (!localStorage.getItem(DISMISS_KEY)) {
          // Soft prompt after first visit — only auto-open when uncontrolled
          if (!isControlled) setInternalOpen(true)
        }
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isControlled])

  const isIos =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent)

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt()
      await deferred.userChoice
      setDeferred(null)
    }
    setOpen(false)
  }

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogHeader onClose={dismiss}>
        <DialogTitle>Install StudentOS</DialogTitle>
      </DialogHeader>
      <DialogContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Add StudentOS to your home screen for a faster, app-like experience —
          offline-friendly and always one tap away.
        </p>
        {isIos ? (
          <ol className="list-decimal space-y-2 pl-5 text-foreground">
            <li>
              Tap the <Share className="inline h-4 w-4" /> Share button in Safari
            </li>
            <li>Choose &ldquo;Add to Home Screen&rdquo;</li>
            <li>Confirm by tapping Add</li>
          </ol>
        ) : deferred ? (
          <p className="text-foreground">
            Tap Install below to add StudentOS to your device.
          </p>
        ) : (
          <p>
            Use your browser menu → &ldquo;Install app&rdquo; or &ldquo;Add to
            Home Screen&rdquo; when available.
          </p>
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={dismiss}>
          Not now
        </Button>
        {!isIos && deferred ? (
          <Button onClick={handleInstall}>
            <Download className="h-4 w-4" />
            Install
          </Button>
        ) : (
          <Button onClick={dismiss}>Got it</Button>
        )}
      </DialogFooter>
    </Dialog>
  )
}
