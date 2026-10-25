import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { AppDataProvider } from '@/context/AppDataContext'
import { AppRouter } from '@/app/router'

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <AppRouter />
        <Toaster richColors position="top-center" closeButton />
      </AppDataProvider>
    </AuthProvider>
  )
}
