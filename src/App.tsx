import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { AppDataProvider } from '@/context/AppDataContext'
import { PwaProvider } from '@/context/PwaContext'
import { AppRouter } from '@/app/router'

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <PwaProvider>
          <AppRouter />
          <Toaster richColors position="top-center" closeButton />
        </PwaProvider>
      </AppDataProvider>
    </AuthProvider>
  )
}
