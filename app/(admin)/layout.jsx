'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  MdDashboard,
  MdPointOfSale,
  MdCategory,
  MdInventory,
  MdPeople,
  MdBarChart,
  MdSettings,
  MdLogout,
  MdMenu,
  MdLocalBar,
  MdClose,
  MdStorefront,
  MdSchedule,
} from 'react-icons/md'

const navItems = [
  { label: 'Dashboard',  href: '/dashboard',  icon: MdDashboard   },
  { label: 'POS',        href: '/pos',         icon: MdPointOfSale },
  { label: 'Products',   href: '/products',    icon: MdStorefront  },
  { label: 'Categories', href: '/categories',  icon: MdCategory    },
  { label: 'Inventory',  href: '/inventory',   icon: MdInventory   },
  // { label: 'Staff', href: '/staff', icon: MdPeople }, // Disabled — staff managed by superadmin only
  { label: 'Reports',    href: '/reports',     icon: MdBarChart    },
  { label: 'Shifts',     href: '/shifts',      icon: MdSchedule    },
  { label: 'Settings',   href: '/settings',    icon: MdSettings    },
]

export default function AdminLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
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
        fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-30 flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <img src="/icons/logo.png" alt="BrewPOS" className="h-25 w-auto object-contain" />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <Icon className="text-lg shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <MdLogout className="text-lg shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar (mobile only) */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-4 border-b border-gray-800 bg-gray-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <MdMenu className="text-2xl" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/icons/logo.png" alt="BrewPOS" className="h-7 w-auto object-contain" />
            <span className="text-white font-semibold text-sm">BrewPOS</span>
          </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
