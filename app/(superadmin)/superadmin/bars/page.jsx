'use client'

import { useEffect, useState } from 'react'
import {
  MdStorefront,
  MdAdd,
  MdClose,
  MdEdit,
  MdDelete,
  MdRefresh,
  MdSearch,
  MdToggleOn,
  MdToggleOff,
  MdPeople,
  MdPerson,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md'
import { FiAlertCircle, FiCheck } from 'react-icons/fi'

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-500/10 text-green-400 border border-green-500/20',
    inactive: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
    expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
    trial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  }
  return (
    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize ${styles[status] || styles.inactive}`}>
      {status}
    </span>
  )
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`
      fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium
      ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
    `}>
      {type === 'success' ? <FiCheck /> : <FiAlertCircle />}
      {message}
    </div>
  )
}

const emptyForm = {
  name: '', email: '', phone: '', address: '',
  adminName: '', adminEmail: '', adminPassword: '',
  plan: 'monthly', taxRate: 0,
}

const emptyStaffForm = { name: '', email: '', password: '' }

export default function BarsPage() {
  const [bars, setBars] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Staff management state
  const [staffBar, setStaffBar] = useState(null)         // bar whose staff panel is open
  const [barStaff, setBarStaff] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffForm, setStaffForm] = useState(emptyStaffForm)
  const [staffSubmitting, setStaffSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [staffDeleteConfirm, setStaffDeleteConfirm] = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchBars = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/bars')
      const data = await res.json()
      if (data.success) setBars(data.bars)
    } catch (error) {
      showToast('Failed to load bars', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBars() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/superadmin/bars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Bar created successfully')
        setShowModal(false)
        setForm(emptyForm)
        fetchBars()
      } else {
        showToast(data.message, 'error')
      }
    } catch {
      showToast('Failed to create bar', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (id) => {
    try {
      const res = await fetch(`/api/superadmin/bars/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message)
        fetchBars()
      }
    } catch {
      showToast('Failed to update bar', 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/superadmin/bars/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        showToast('Bar deleted successfully')
        setDeleteConfirm(null)
        fetchBars()
      }
    } catch {
      showToast('Failed to delete bar', 'error')
    }
  }

  // ── Staff management handlers ───────────────────────────────────────────────
  const openStaffPanel = async (bar) => {
    setStaffBar(bar)
    setStaffForm(emptyStaffForm)
    setStaffLoading(true)
    try {
      const res = await fetch(`/api/superadmin/bars/${bar._id}/staff`)
      const data = await res.json()
      if (data.success) setBarStaff(data.staff)
    } catch {
      showToast('Failed to load staff', 'error')
    } finally {
      setStaffLoading(false)
    }
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()
    setStaffSubmitting(true)
    try {
      const res = await fetch(`/api/superadmin/bars/${staffBar._id}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Cashier added successfully')
        setBarStaff(prev => [data.staff, ...prev])
        setStaffForm(emptyStaffForm)
        fetchBars()
      } else {
        showToast(data.message, 'error')
      }
    } catch {
      showToast('Failed to add cashier', 'error')
    } finally {
      setStaffSubmitting(false)
    }
  }

  const handleDeleteStaff = async (cashierId) => {
    try {
      const res = await fetch(`/api/superadmin/bars/${staffBar._id}/staff`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cashierId }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Cashier removed')
        setBarStaff(prev => prev.filter(s => s._id !== cashierId))
        setStaffDeleteConfirm(null)
        fetchBars()
      } else {
        showToast(data.message, 'error')
      }
    } catch {
      showToast('Failed to remove cashier', 'error')
    }
  }

  const filtered = bars.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">Bars</h2>
          <p className="text-gray-400 text-sm mt-0.5">Manage all registered bars</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBars} className="p-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors">
            <MdRefresh className="text-xl" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <MdAdd className="text-xl" />
            Add New Bar
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xl" />
        <input
          type="text"
          placeholder="Search bars by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <MdStorefront className="text-4xl text-gray-700 mb-2" />
            <p className="text-gray-500 text-sm">No bars found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">Bar</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5 hidden sm:table-cell">Plan</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5 hidden md:table-cell">Expiry</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5 hidden md:table-cell">Staff</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(bar => (
                  <tr key={bar._id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                          <MdStorefront className="text-purple-400 text-sm" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{bar.name}</p>
                          <p className="text-gray-500 text-xs">{bar.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-gray-300 text-sm capitalize">{bar.subscription?.plan}</span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={bar.isActive ? bar.subscription?.status : 'inactive'} />
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-gray-400 text-sm">
                        {bar.subscription?.expiryDate
                          ? new Date(bar.subscription.expiryDate).toLocaleDateString()
                          : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-gray-400 text-sm">{bar.staffCount ?? 0}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openStaffPanel(bar)}
                          className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-3 py-1.5 rounded-lg transition-colors"
                          title="Manage Staff"
                        >
                          <MdPeople className="text-sm" /> Staff
                        </button>
                        <button
                          onClick={() => handleToggle(bar._id)}
                          className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                          title={bar.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {bar.isActive
                            ? <MdToggleOn className="text-2xl text-green-400" />
                            : <MdToggleOff className="text-2xl text-gray-500" />}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(bar)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <MdDelete className="text-xl" />
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

      {/* Create Bar Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-white font-semibold">Add New Bar</h3>
              <button onClick={() => { setShowModal(false); setForm(emptyForm) }} className="text-gray-400 hover:text-white">
                <MdClose className="text-2xl" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bar Details</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-300 mb-1.5">Bar Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="The Rooftop Bar"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-300 mb-1.5">Bar Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="bar@example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 234 567 890"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.taxRate}
                    onChange={e => setForm(p => ({ ...p, taxRate: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-300 mb-1.5">Subscription Plan</label>
                  <select
                    value={form.plan}
                    onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Admin Account</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Admin Name *</label>
                    <input
                      type="text"
                      required
                      value={form.adminName}
                      onChange={e => setForm(p => ({ ...p, adminName: e.target.value }))}
                      placeholder="John Smith"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Admin Email *</label>
                    <input
                      type="email"
                      required
                      value={form.adminEmail}
                      onChange={e => setForm(p => ({ ...p, adminEmail: e.target.value }))}
                      placeholder="admin@bar.com"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Admin Password *</label>
                    <input
                      type="text"
                      required
                      value={form.adminPassword}
                      onChange={e => setForm(p => ({ ...p, adminPassword: e.target.value }))}
                      placeholder="Min. 6 characters"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(emptyForm) }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                  ) : 'Create Bar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MdDelete className="text-red-400 text-2xl" />
            </div>
            <h3 className="text-white font-semibold text-center mb-2">Delete Bar</h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              Are you sure you want to delete <span className="text-white font-medium">{deleteConfirm.name}</span>? This will also delete all staff accounts. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm._id)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Staff Management Modal ───────────────────────────────────────────── */}
      {staffBar && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
              <div>
                <h3 className="text-white font-semibold">Manage Staff</h3>
                <p className="text-gray-500 text-xs mt-0.5">{staffBar.name}</p>
              </div>
              <button onClick={() => { setStaffBar(null); setBarStaff([]) }} className="text-gray-400 hover:text-white">
                <MdClose className="text-2xl" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Add cashier form */}
              <form onSubmit={handleAddStaff} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add New Cashier</p>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={staffForm.name}
                  onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={staffForm.email}
                  onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password (min 6 chars)"
                    value={staffForm.password}
                    onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 pr-11 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPassword ? <MdVisibilityOff className="text-lg" /> : <MdVisibility className="text-lg" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={staffSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {staffSubmitting
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding...</>
                    : <><MdAdd className="text-base" /> Add Cashier</>}
                </button>
              </form>

              {/* Staff list */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Current Staff ({barStaff.length})
                </p>
                {staffLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                ) : barStaff.length === 0 ? (
                  <div className="text-center py-6">
                    <MdPeople className="text-3xl text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No cashiers yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {barStaff.map(member => (
                      <div key={member._id} className="flex items-center justify-between gap-3 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                            <MdPerson className="text-purple-400 text-sm" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{member.name}</p>
                            <p className="text-gray-500 text-xs truncate">{member.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setStaffDeleteConfirm(member)}
                          className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <MdDelete className="text-lg" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Delete Confirm */}
      {staffDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-white font-semibold text-center mb-2">Remove Cashier</h3>
            <p className="text-gray-400 text-sm text-center mb-5">
              Remove <span className="text-white font-medium">{staffDeleteConfirm.name}</span> from {staffBar?.name}?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStaffDeleteConfirm(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDeleteStaff(staffDeleteConfirm._id)} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}