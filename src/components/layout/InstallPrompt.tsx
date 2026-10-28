import { Download, Share, Smartphone, X, PlusSquare, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePwa } from '@/context/PwaContext'
import { cn } from '@/lib/utils'

export function InstallPrompt() {
  const {
    isInstalled,
    isIos,
    promptInstall,
    openInstallDialog,
    setOpenInstallDialog,
    showBanner,
    dismissBanner,
  } = usePwa()

  if (isInstalled) return null

  return (
    <>
      {/* 1. Sleek, Non-Intrusive Mobile Install Banner (NO backdrop blur!) */}
      {showBanner && (
        <aside
          aria-label="Install StudentOS banner"
          className="fixed bottom-20 inset-x-3 z-30 mx-auto max-w-md rounded-2xl border border-primary/30 bg-card/95 p-3 shadow-lg backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-4 lg:hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <Smartphone className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-xs font-bold text-foreground truncate">
                  Install StudentOS App
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Offline access, instant load & full-screen
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                className="h-8 rounded-xl px-3 text-xs font-semibold shadow-xs"
                onClick={promptInstall}
              >
                <Download className="size-3.5 mr-1" /> Install
              </Button>
              <button
                type="button"
                onClick={dismissBanner}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition"
                aria-label="Dismiss install banner"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Step-by-Step Installation Modal (only appears when student taps Install) */}
      <Dialog open={openInstallDialog} onOpenChange={setOpenInstallDialog}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Smartphone className="size-5 text-primary" /> Install StudentOS
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1 text-xs">
            <p className="text-muted-foreground">
              Add StudentOS to your home screen for the full app experience: runs 100% offline, opens in full screen, and loads instantly.
            </p>

            {isIos ? (
              <div className="space-y-3 rounded-2xl bg-muted/40 p-3.5 border border-border/70 text-foreground">
                <p className="font-semibold text-xs flex items-center gap-1 text-primary">
                  How to install on iPhone & iPad (Safari):
                </p>
                <ol className="space-y-2.5 pl-1 list-none text-xs">
                  <li className="flex items-start gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                      1
                    </span>
                    <span>
                      Tap the <strong>Share</strong> button{' '}
                      <Share className="inline size-3.5 text-primary" /> in the bottom Safari toolbar.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                      2
                    </span>
                    <span>
                      Scroll down and tap{' '}
                      <strong className="inline-flex items-center gap-1">
                        &quot;Add to Home Screen&quot; <PlusSquare className="inline size-3.5" />
                      </strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                      3
                    </span>
                    <span>
                      Tap <strong>&quot;Add&quot;</strong> in the top-right corner. StudentOS icon will appear on your home screen!
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl bg-muted/40 p-3.5 border border-border/70 text-foreground">
                <p className="font-semibold text-xs flex items-center gap-1 text-primary">
                  How to install on Android (Chrome):
                </p>
                <ol className="space-y-2.5 pl-1 list-none text-xs">
                  <li className="flex items-start gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                      1
                    </span>
                    <span>
                      Tap the <strong>browser menu (⋮ 3 vertical dots)</strong> in the top-right corner of Chrome.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                      2
                    </span>
                    <span>
                      Select <strong>&quot;Install app&quot;</strong> (or <strong>&quot;Add to Home screen&quot;</strong>).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                      3
                    </span>
                    <span>
                      Confirm by tapping <strong>&quot;Install&quot;</strong>. The app will be added to your home screen and app drawer.
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOpenInstallDialog(false)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
            {!isIos && (
              <Button
                onClick={() => {
                  promptInstall()
                  setOpenInstallDialog(false)
                }}
                className="rounded-xl text-xs"
              >
                <Download className="size-3.5 mr-1" /> Try One-Click Install
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Standalone Install Button for Header & Settings */
export function InstallButton({ className }: { className?: string }) {
  const { isInstalled, promptInstall } = usePwa()

  if (isInstalled) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30', className)}>
        <CheckCircle2 className="size-3.5 text-emerald-600" />
        <span>Installed as App</span>
      </span>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-semibold text-xs h-8', className)}
      onClick={promptInstall}
    >
      <Download className="size-3.5 mr-1.5" />
      <span>Install App</span>
    </Button>
  )
}
