import { BrowserRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from './features/auth/useSession'
import { SignIn } from './features/auth/SignIn'
import { TodayScreen } from './features/today/TodayScreen'
import { ActiveSessionScreen } from './features/session/ActiveSessionScreen'
import { FastScreen } from './features/fast/FastScreen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // gym network is flaky; don't hammer refetches on every focus flip
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const session = useSession()

  // Restoring persisted session — render nothing to avoid a sign-in flash.
  if (session === undefined) return null
  if (session === null) return <SignIn />

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TodayScreen />} />
          <Route path="/session/:id" element={<ActiveSessionScreen />} />
          <Route path="/fast" element={<FastScreen />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
