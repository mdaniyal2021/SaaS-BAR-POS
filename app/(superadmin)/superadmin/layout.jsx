'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  MdLocalBar,
  MdDashboard,
  MdStorefront,
  MdSubscriptions,
  MdLogout,
  MdMenu,
  MdClose,
} from 'react-icons/md'
import { FiChevronRight } from 'react-icons/fi'

const navItems = [
  { label: 'Dashboard', href: '/superadmin/dashboard', icon: MdDashboard },
  { label: 'Bars', href: '/superadmin/bars', icon: MdStorefront },
  { label: 'Subscriptions', href: '/superadmin/subscriptions', icon: MdSubscriptions },
]

export default function SuperAdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-30
        flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <MdLocalBar className="text-white text-xl" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">BarPOS</p>
            <p className="text-purple-400 text-xs">Super Admin</p>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href
            return (
              <button
                key={href}
                onClick={() => { router.push(href); setSidebarOpen(false) }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left
                  ${active
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                `}
              >
                <Icon className="text-lg shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <FiChevronRight className="text-sm" />}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4 border-t border-gray-800 pt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <MdLogout className="text-lg" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 lg:px-6">
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <MdMenu className="text-2xl" />
          </button>
          <div>
            <h1 className="text-white font-semibold text-sm">
              {navItems.find(n => n.href === pathname)?.label || 'Super Admin'}
            </h1>
            <p className="text-gray-500 text-xs">BarPOS Control Panel</p>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
} 