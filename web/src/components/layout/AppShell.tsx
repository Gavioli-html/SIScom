import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import './AppShell.css'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="appshell">
      <Sidebar drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {drawerOpen && (
        <div className="appshell-overlay" onClick={() => setDrawerOpen(false)} />
      )}
      <div className="appshell-main">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
        <main className="appshell-content">{children}</main>
      </div>
    </div>
  )
}
