'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdLock, MdEmail, MdVisibility, MdVisibilityOff } from 'react-icons/md'

export default function SuperAdminAccountPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    currentPassword: '',
    newEmail:        '',
    newPassword:     '',
    confirmPassword: '',
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [message,     setMessage]     = useState(null) // { type: 'success'|'error', text }

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setMessage(null)

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }
    if (!form.newEmail && !form.newPassword) {
      setMessage({ type: 'error', text: 'Enter a new email or new password to update' })
      return
    }

    setLoading(true)
    try {
      const body = { currentPassword: form.currentPassword }
      if (form.newEmail.trim())    body.newEmail    = form.newEmail.trim()
      if (form.newPassword.trim()) body.newPassword = form.newPassword.trim()

      const res  = await fetch('/api/superadmin/change-credentials', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setForm({ currentPassword: '', newEmail: '', newPassword: '', confirmPassword: '' })
        // Logout after 2 seconds so user logs in with new credentials
        setTimeout(async () => {
          await fetch('/api/auth/logout', { method: 'POST' })
          router.push('/login')
        }, 2500)
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch {
      setMessage({ type: 'error', text: 'Server error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-white text-xl font-bold">Account Settings</h2>
        <p className="text-gray-400 text-sm mt-1">Change your superadmin email or password</p>
      </div>

      {message && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.text}
          {message.type === 'success' && (
            <span className="block text-xs mt-1 opacity-75">Logging you out in 3 seconds...</span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">

        {/* Current Password — always required */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-1.5">
            Current Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
            <input
              type={showCurrent ? 'text' : 'password'}
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              required
              placeholder="Enter current password"
              className="w-full bg-gray-800 text-white pl-10 pr-10 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showCurrent ? <MdVisibilityOff /> : <MdVisibility />}
            </button>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-5">
          <p className="text-gray-500 text-xs mb-4">Fill in what you want to change (email, password, or both)</p>

          {/* New Email */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-1.5">New Email</label>
            <div className="relative">
              <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
              <input
                type="email"
                name="newEmail"
                value={form.newEmail}
                onChange={handleChange}
                placeholder="Leave blank to keep current"
                className="w-full bg-gray-800 text-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>
          </div>

          {/* New Password */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-1.5">New Password</label>
            <div className="relative">
              <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
              <input
                type={showNew ? 'text' : 'password'}
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="Min 8 characters"
                className="w-full bg-gray-800 text-white pl-10 pr-10 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showNew ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Confirm New Password</label>
            <div className="relative">
              <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat new password"
                className="w-full bg-gray-800 text-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !form.currentPassword}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
