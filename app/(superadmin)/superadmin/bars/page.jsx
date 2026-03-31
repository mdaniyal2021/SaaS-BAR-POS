'use client'

import { useEffect, useState } from 'react'
import { MdAdd, MdSearch, MdDelete, MdCheckCircle, MdBlock, MdClose, MdStore } from 'react-icons/md'

function StatusBadge({ status }) {
  const map = {
    active:   'bg-green-500/10 text-green-400 border-green-500/20',
    trial:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
    expired:  'bg-red-500/10 text-red-400 border-red-500/20',
    inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${map[status] ?? map.inactive}`}>
      {status}
    </span>
  )
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  const colors = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
  }
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl ${colors[toast.type]}`}>
      {toast.message}
      <button onClick={onClose} className="opacity-60 hover:opacity-100"><MdClose /></button>
    </div>
  )
}

const emptyForm = { barName: '', barEmail: '', phone: '', taxRate: '10', plan: 'trial', adminName: '', adminEmail: '', adminPassword: '' }

export default function BarsPage() {
  const [bars, setBars] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchBars = async () => {
    setLoading(true)
    const res = await fetch('/api/superadmin/bars')
    const data = await res.json()
    if (data.success) setBars(data.bars)
    setLoading(false)
  }

  useEffect(() => { fetchBars() }, [])

  const filtered = bars.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/superadmin/bars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.success) {
      showToast('Bar created successfully.')
      setShowModal(false)
      setForm(emptyForm)
      fetchBars()
    } else {
      showToast(data.message, 'error')
    }
    setSubmitting(false)
  }

  const handleToggle = async (bar) => {
    const res = await fetch(`/api/superadmin/bars/${bar._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle' }),
    })
    const data = await res.json()
    if (data.success) { showToast(data.message); fetchBars() }
    else showToast(data.message, 'error')
  }

  const handleDelete = async () => {
    const res = await fetch(`/api/superadmin/bars/${deleteTarget._id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { showToast('Bar deleted successfully.'); setDeleteTarget(null); fetchBars() }
    else showToast(data.message, 'error')
  }

  const barFields = [
    { label: 'Bar Name', key: 'barName', type: 'text', required: true },
    { label: 'Bar Email', key: 'barEmail', type: 'email', required: true },
    { label: 'Phone', key: 'phone', type: 'text', required: false },
    { label: 'Tax Rate (%)', key: 'taxRate', type: 'number', required: false },
  ]

  const adminFields = [
    { label: 'Admin Name', key: 'adminName', type: 'text', required: true },
    { label: 'Admin Email', key: 'adminEmail', type: 'email', required: true },
    { label: 'Admin Password', key: 'adminPassword', type: 'password', required: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bars</h1>
          <p className="text-gray-400 text-sm mt-1">Manage all registered bars</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <MdAdd className="text-lg" /> Add New Bar
        </button>
      </div>

      <div className="relative max-w-sm">
        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bars..." className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Bar', 'Email', 'Plan', 'Status', 'Staff', 'Expires', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-500 text-sm py-12">
                    <MdStore className="text-3xl mx-auto mb-2 opacity-30" />No bars found.
                  </td></tr>
                )}
                {filtered.map(bar => (
                  <tr key={bar._id} className={`hover:bg-gray-800/40 transition-colors ${!bar.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-white">{bar.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{bar.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 capitalize">{bar.subscription?.plan}</td>
                    <td className="px-6 py-4"><StatusBadge status={bar.isActive ? bar.subscription?.status : 'inactive'} /></td>
                    <td className="px-6 py-4 text-sm text-gray-400">{bar.staffCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{bar.subscription?.expiryDate ? new Date(bar.subscription.expiryDate).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggle(bar)} title={bar.isActive ? 'Deactivate' : 'Activate'} className={`p-1.5 rounded-lg transition-colors ${bar.isActive ? 'text-amber-400 hover:bg-amber-500/10' : 'text-green-400 hover:bg-green-500/10'}`}>
                          {bar.isActive ? <MdBlock className="text-base" /> : <MdCheckCircle className="text-base" />}
                        </button>
                        <button onClick={() => setDeleteTarget(bar)} title="Delete" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                          <MdDelete className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">Add New Bar</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><MdClose className="text-xl" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bar Details</p>
              {barFields.map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={required} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Subscription Plan</label>
                <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500">
                  <option value="trial">Trial (30 days)</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Admin Account</p>
              {adminFields.map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={required} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  {submitting ? 'Creating...' : 'Create Bar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-white font-semibold mb-2">Delete Bar</h2>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete <span className="text-white font-medium">{deleteTarget.name}</span>? This will also delete all associated staff accounts. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
