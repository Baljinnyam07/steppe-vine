import { lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css' // global styles first: the shop / admin stylesheets override them
import App from './App.jsx'

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
