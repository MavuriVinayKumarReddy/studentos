import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaContextValue {
  isInstalled: boolean
  canInstall: boolean
  isIos: boolean
  promptInstall: () => Promise<void>
  openInstallDialog: boolean
  setOpenInstallDialog: (open: boolean) => void
  showBanner: boolean
  dismissBanner: () => void
}

const PwaContext = createContext<PwaContextValue | null>(null)

const BANNER_DISMISS_KEY = 'studentos-pwa-banner-dismissed'

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [openInstallDialog, setOpenInstallDialog] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return !!sessionStorage.getItem(BANNER_DISMISS_KEY)
    } catch {
      return false
    }
  })

  // Detect standalone / installed mode
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true
      setIsInstalled(isStandalone)
    }

    checkInstalled()
    const mq = window.matchMedia('(display-mode: standalone)')
    mq.addEventListener('change', checkInstalled)

    // Listen for appinstalled
    const onAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setOpenInstallDialog(false)
    }
    window.addEventListener('appinstalled', onAppInstalled)

    // Listen for beforeinstallprompt
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    return () => {
      mq.removeEventListener('change', checkInstalled)
      window.removeEventListener('appinstalled', onAppInstalled)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    }
  }, [])

  const isIos =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as any).MSStream

  const canInstall = !isInstalled && (!!deferredPrompt || isIos)

  const promptInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null)
          setOpenInstallDialog(false)
        }
      } catch {
        setOpenInstallDialog(true)
      }
    } else {
      // If deferred prompt is not available (e.g. iOS or manual install), open visual instructions dialog
      setOpenInstallDialog(true)
    }
  }

  const dismissBanner = () => {
    setBannerDismissed(true)
    try {
      sessionStorage.setItem(BANNER_DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const showBanner = !isInstalled && !bannerDismissed

  return (
    <PwaContext.Provider
      value={{
        isInstalled,
        canInstall,
        isIos,
        promptInstall,
        openInstallDialog,
        setOpenInstallDialog,
        showBanner,
        dismissBanner,
      }}
    >
      {children}
    </PwaContext.Provider>
  )
}

export function usePwa() {
  const ctx = useContext(PwaContext)
  if (!ctx) {
    throw new Error('usePwa must be used within a PwaProvider')
  }
  return ctx
}
