'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { MdSave, MdRefresh, MdStore, MdLocationOn, MdPhone, MdDownload, MdUpload, MdCheckCircle, MdError } from 'react-icons/md'

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

  // Backup / Restore state
  const [exporting,      setExporting]      = useState(false)
  const [importing,      setImporting]      = useState(false)
  const [duplicateMode,  setDuplicateMode]  = useState('skip')
  const [importResult,   setImportResult]   = useState(null) // { success, message, results }
  const fileInputRef = useRef(null)

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

  // ── Export handler ─────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/export')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(data.message || 'Export failed', 'error')
        return
      }
      // Get filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition') || ''
      const nameMatch   = disposition.match(/filename="([^"]+)"/)
      const filename    = nameMatch?.[1] || 'barpos-backup.json'

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      showToast('Backup file downloaded successfully')
    } catch {
      showToast('Export failed. Check your connection.', 'error')
    } finally {
      setExporting(false)
    }
  }

  // ── Import handler ─────────────────────────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so same file can be re-selected
    if (!file) return

    let data
    try {
      const text = await file.text()
      data = JSON.parse(text)
    } catch {
      showToast('Invalid file — must be a valid BarPOS backup JSON', 'error')
      return
    }

    setImporting(true)
    setImportResult(null)
    try {
      const res  = await fetch('/api/admin/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data, duplicateMode }),
      })
      const result = await res.json()
      setImportResult(result)
      if (result.success) {
        showToast(result.message)
      } else {
        showToast(result.message || 'Import failed', 'error')
      }
    } catch {
      showToast('Import failed. Check your connection.', 'error')
    } finally {
      setImporting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">

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

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* LEFT — Bar Info + Save */}
        <div className="space-y-4">
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

          {/* Save Button — stays with Bar Info */}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            <MdSave className="text-lg" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* RIGHT — Data Backup & Restore */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-white font-semibold text-sm">Data Backup &amp; Restore</h2>
          <p className="text-gray-500 text-xs mt-1">
            Export this branch's products and orders as a JSON file, then import into another branch.
          </p>
        </div>

        {/* Export */}
        <div className="flex items-start justify-between gap-4 py-4 border-t border-gray-800">
          <div>
            <p className="text-white text-sm font-medium">Export Data</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Download all categories, products, and orders as a backup file.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 shrink-0 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <MdDownload className="text-base" />
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>

        {/* Import */}
        <div className="space-y-4 pt-1 border-t border-gray-800">
          <div className="pt-3">
            <p className="text-white text-sm font-medium">Import Data</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Upload a backup JSON file from another branch. Orders will be recorded at today's date.
            </p>
          </div>

          {/* Duplicate mode */}
          <div>
            <p className="text-gray-400 text-xs font-medium mb-2">If a product already exists in this branch:</p>
            <div className="flex gap-3">
              {[
                { value: 'skip',      label: 'Skip (keep existing)' },
                { value: 'overwrite', label: 'Overwrite (use imported data)' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateMode"
                    value={opt.value}
                    checked={duplicateMode === opt.value}
                    onChange={() => setDuplicateMode(opt.value)}
                    className="accent-purple-500"
                  />
                  <span className="text-sm text-gray-300">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <MdUpload className="text-base" />
            {importing ? 'Importing...' : 'Choose Backup File & Import'}
          </button>

          {/* Import result summary */}
          {importResult && (
            <div className={`rounded-xl border p-4 text-sm space-y-2 ${
              importResult.success
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="flex items-center gap-2">
                {importResult.success
                  ? <MdCheckCircle className="text-green-400 text-lg shrink-0" />
                  : <MdError        className="text-red-400   text-lg shrink-0" />
                }
                <span className={importResult.success ? 'text-green-300' : 'text-red-300'}>
                  {importResult.message}
                </span>
              </div>

              {importResult.success && importResult.results && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: 'Categories',  value: importResult.results.categories?.created ?? 0 },
                    { label: 'Products',    value: (importResult.results.products?.created ?? 0) + (importResult.results.products?.overwritten ?? 0) },
                    { label: 'Orders',      value: importResult.results.orders?.imported ?? 0 },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-800/60 rounded-lg px-3 py-2 text-center">
                      <p className="text-white font-bold text-lg">{s.value}</p>
                      <p className="text-gray-500 text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {importResult.results?.errors?.length > 0 && (
                <details className="text-xs text-gray-400 pt-1">
                  <summary className="cursor-pointer hover:text-gray-300">
                    {importResult.results.errors.length} warning(s)
                  </summary>
                  <ul className="mt-1 space-y-0.5 pl-2">
                    {importResult.results.errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
        </div>{/* end RIGHT card */}
      </div>{/* end two-column grid */}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}