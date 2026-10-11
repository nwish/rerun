import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Me } from './api'
import Avatar, { personName } from './Avatar'
import { FOCUSABLE } from './Modal'

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="14" y="12" width="7" height="9" rx="2" />
      <rect x="3" y="16" width="7" height="5" rx="2" />
    </svg>
  ),
  checklists: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 6 1.5 1.5L8 5" />
      <line x1="11" y1="6" x2="20" y2="6" />
      <path d="m4 12 1.5 1.5L8 11" />
      <line x1="11" y1="12" x2="20" y2="12" />
      <path d="m4 18 1.5 1.5L8 16" />
      <line x1="11" y1="18" x2="20" y2="18" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="20" x2="5" y2="13" />
      <line x1="12" y1="20" x2="12" y2="5" />
      <line x1="19" y1="20" x2="19" y2="10" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 6v6c0 4.6 3.2 7.9 8 9 4.8-1.1 8-4.4 8-9V6l-8-3Z" />
      <path d="m9.5 12 1.8 1.8L15 10" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  ),
  signOut: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 4v16" />
    </svg>
  )
}

type NavItem = { key: string; label: string; path: string; icon: ReactNode }

export default function AppShell({
  user,
  path,
  navigate,
  onSignOut,
  title,
  subtitle,
  children
}: {
  user: Me
  path: string
  navigate: (to: string) => void
  onSignOut: () => void
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  // Past the breakpoint the nav is always visible, so a resize that crosses it must not leave the
  // page scroll-locked behind a drawer the user can no longer see.
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 861px)')
    const close = () => setMenuOpen(false)
    wide.addEventListener('change', close)
    return () => wide.removeEventListener('change', close)
  }, [])

  // While the drawer is open it behaves like the dialog it replaces: Escape closes it, Tab stays
  // inside the nav, the page behind stops scrolling, and focus returns to the hamburger.
  useEffect(() => {
    if (!menuOpen) return
    const opener = document.activeElement as HTMLElement | null
    navRef.current?.querySelector<HTMLElement>('.nav-link')?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        return
      }
      if (e.key !== 'Tab' || !navRef.current) return
      const focusable = Array.from(navRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (!navRef.current.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      ;(hamburgerRef.current ?? opener)?.focus()
    }
  }, [menuOpen])

  const navItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', path: '/', icon: icons.dashboard },
    { key: 'checklists', label: 'Checklists', path: '/checklists', icon: icons.checklists },
    { key: 'history', label: 'History', path: '/history', icon: icons.history },
    { key: 'settings', label: 'Settings', path: '/settings', icon: icons.settings },
    ...(user.role === 'admin' ? [{ key: 'admin', label: 'Admin', path: '/admin', icon: icons.admin }] : [])
  ]

  function go(to: string) {
    navigate(to)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <div className="app-nav-bg" aria-hidden="true" />
      <div className="app-nav-top" ref={navRef}>
        <div className="nav-top-row">
          <div className="nav-brand">
            <img src="/rerun.svg" alt="" />
            <div className="brand-text">
              <strong>Rerun</strong>
              <span>Checklist workspace</span>
            </div>
          </div>
          <button
            ref={hamburgerRef}
            type="button"
            className="nav-hamburger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? icons.close : icons.menu}
          </button>
        </div>

        <div className={`nav-links${menuOpen ? ' open' : ''}`}>
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-link${path === item.path ? ' active' : ''}`}
              onClick={() => go(item.path)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {menuOpen && <div className="nav-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <main className="app-main">
        {/* Keyed by route so the view remounts and replays its entrance on every navigation. */}
        <div className="app-view" key={path}>
          <div className="app-topbar">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>

      <div className="app-nav-foot">
        <div className="nav-user-card">
          <button
            type="button"
            className={`nav-link nav-user${path === '/settings' ? ' active' : ''}`}
            onClick={() => go('/settings')}
            title="Settings"
            aria-label={`Settings — signed in as ${user.email}`}
          >
            <Avatar person={user} />
            <span className="email">{personName(user)}</span>
          </button>
          <button type="button" className="nav-signout" onClick={onSignOut} title="Sign out">
            {icons.signOut}
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
