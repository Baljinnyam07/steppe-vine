import { lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// The admin window lives at /#/admin and is its own chunk: the public site never downloads it.
const Admin = lazy(() => import('./ui/Admin.jsx'))
const isAdminHash = () => window.location.hash.startsWith('#/admin')

function Root() {
  const [admin, setAdmin] = useState(isAdminHash)
  useEffect(() => {
    const on = () => setAdmin(isAdminHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return admin ? <Suspense fallback={null}><Admin /></Suspense> : <App />
}

createRoot(document.getElementById('root')).render(<Root />)
