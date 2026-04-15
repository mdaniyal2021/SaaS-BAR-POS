'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiWifiOff, FiWifi } from 'react-icons/fi'
import { saveOfflineCredentials, setOfflineSession } from '@/lib/offline-db'

export default function LoginPage() {
  const router = useRouter()

  // ── Online login state ──
  const [formData,     setFormData]     = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  // ── Network status ──
  const [isOnline, setIsOnline] = useState(true)

  // ── Detect online / offline ──
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    update()
    window.addEventListener('online',  update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online',  update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // ─── ONLINE login ─────────────────────────────────────────────────────────
  const handleChange = (e) => {
    setError('')
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.message)
        setLoading(false)
        return
      }

      // Save session data for offline use (cashier only)
      // Wrapped separately so IndexedDB errors never block login
      if (data.user?.role === 'cashier') {
        try {
          await saveOfflineCredentials(data.user)
          await setOfflineSession(data.user)
        } catch {
          // Non-critical — offline caching failed but login proceeds
        }
      }

      router.push(data.redirectUrl)

    } catch {
      setError('Network error. Please check your internet connection.')
      setLoading(false)
    }
  }

  // ─── OFFLINE screen — no login allowed ───────────────────────────────────
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/10 via-gray-950 to-gray-950" />

        <div className="relative w-full max-w-sm text-center space-y-5">
          <img src="/icons/logo.png" alt="MyEasyTill" className="h-14 w-auto mx-auto object-contain" />

          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm px-4 py-2 rounded-full">
            <FiWifiOff />
            No Internet Connection
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-3">
            <p className="text-white font-semibold text-base">Login Not Available Offline</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              You need an active internet connection to login.
              Please connect to the internet and try again.
            </p>
          </div>

          <p className="text-gray-600 text-xs">© 2026 MyEasyTill — All rights reserved</p>
        </div>
      </div>
    )
  }

  // ─── ONLINE login screen ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-950 to-gray-950" />

      <div className="relative w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <img src="/icons/logo.png" alt="MyEasyTill" className="w-auto mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-white">MyEasyTill</h1>
          <p className="text-gray-400 text-sm mt-1">Bar Management System</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Welcome Back</h2>
              <p className="text-gray-400 text-sm">Sign in to your account</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
              <FiWifi className="text-sm" />
              Online
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                <FiAlertCircle className="text-base shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>

          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          © 2026 MyEasyTill — All rights reserved
        </p>
      </div>
    </div>
  )
}
