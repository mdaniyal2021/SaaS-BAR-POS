'use client'

import { useEffect, useState, useCallback } from 'react'
import { MdSave, MdRefresh, MdStore, MdLocationOn, MdPhone } from 'react-icons/md'

function Toast({ toast, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl ${
      toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
    }`}>
      {toast.message}
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg">×</button>
    </div>
  )
}

export default function SettingsPage() {
  const [form,    setForm]    = useState({ name: '', phone: '', address: '', currency: 'USD' })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/settings')
      const data = await res.json()
      if (data.success) {
        const b = data.bar
        setForm({
          name:     b.name     || '',
          phone:    b.phone    || '',
          address:  b.address  || '',
          currency: b.currency || 'USD',
        })
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Bar name is required', 'error'); return }
    setSaving(true)
    try {
      const res  = await fetch('/api/admin/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      showToast(data.message, data.success ? 'success' : 'error')
    } catch { showToast('Something went wrong', 'error') }
    finally { setSaving(false) }
  }

  const field = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 text-sm mt-1">Bar profile and configuration</p>
        </div>
        <button onClick={fetchSettings}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-900 border border-gray-800 px-3 py-2 rounded-xl transition-colors">
          <MdRefresh className="text-base" /> Refresh
        </button>
      </div>

      {/* Bar Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MdStore className="text-purple-400 text-lg" />
          <h2 className="text-white font-semibold text-sm">Bar Information</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Bar Name <span className="text-red-400">*</span></label>
          <input value={form.name} onChange={e => field('name', e.target.value)}
            placeholder="e.g. The Rooftop Bar"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <span className="flex items-center gap-1.5"><MdPhone className="text-base" /> Phone</span>
            </label>
            <input value={form.phone} onChange={e => field('phone', e.target.value)}
              placeholder="+1 234 567 890"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Currency</label>
            <select value={form.currency} onChange={e => field('currency', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
              {[['USD','USD — US Dollar'],['GBP','GBP — British Pound'],['EUR','EUR — Euro'],['CAD','CAD — Canadian Dollar'],['AUD','AUD — Australian Dollar'],['PKR','PKR — Pakistani Rupee'],['AED','AED — UAE Dirham']].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <span className="flex items-center gap-1.5"><MdLocationOn className="text-base" /> Address</span>
          </label>
          <textarea value={form.address} onChange={e => field('address', e.target.value)}
            placeholder="123 Main Street, City, Country"
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm resize-none"
          />
          <p className="text-gray-600 text-xs mt-1">Appears on printed receipts</p>
        </div>
      </div>

      {/* Save Button */}
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors">
        <MdSave className="text-lg" />
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}