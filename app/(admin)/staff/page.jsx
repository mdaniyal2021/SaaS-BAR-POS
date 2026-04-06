'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MdAdd, MdEdit, MdDelete, MdClose, MdSearch,
  MdPeople, MdToggleOn, MdToggleOff, MdVisibility,
  MdVisibilityOff, MdPerson, MdAccessTime,
} from 'react-icons/md'

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error:   'bg-red-500/10   border-red-500/30   text-red-400',
  }
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl ${colors[toast.type]}`}>
      {toast.message}
      <button onClick={onClose} className="opacity-60 hover:opacity-100"><MdClose /></button>
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <MdClose className="text-xl" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Password input with show/hide ────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder = '••••••••', name = 'password' }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
      >
        {show ? <MdVisibilityOff className="text-lg" /> : <MdVisibility className="text-lg" />}
      </button>
    </div>
  )
}

// ─── Empty form state ─────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', email: '', password: '' }

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const [staff, setStaff]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modalMode, setModalMode] = useState(null) // 'add' | 'edit' | 'delete'
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  // ── Fetch all cashiers ──────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/staff')
      const data = await res.json()
      if (data.success) setStaff(data.staff)
    } catch {
      showToast('Failed to load staff', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM)
    setSelected(null)
    setModalMode('add')
  }

  const openEdit = (member) => {
    setForm({ name: member.name, email: member.email, password: '' })
    setSelected(member)
    setModalMode('edit')
  }

  const openDelete = (member) => {
    setSelected(member)
    setModalMode('delete')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelected(null)
    setForm(EMPTY_FORM)
  }

  const handleField = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  // ── Save (Add or Edit) ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    if (modalMode === 'add' && form.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    setSaving(true)

    const isEdit = modalMode === 'edit'
    const url    = isEdit ? `/api/admin/staff/${selected._id}` : '/api/admin/staff'
    const method = isEdit ? 'PATCH' : 'POST'

    // For edit — only send password if it was changed
    const body = isEdit
      ? {
          name:     form.name.trim(),
          email:    form.email.trim(),
          ...(form.password ? { password: form.password } : {}),
        }
      : {
          name:     form.name.trim(),
          email:    form.email.trim(),
          password: form.password,
        }

    try {
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        showToast(data.message)
        closeModal()
        fetchStaff()
      } else {
        showToast(data.message, 'error')
      }
    } catch {
      showToast('Something went wrong', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setSaving(true)
    try {
      const res  = await fetch(`/api/admin/staff/${selected._id}`, { method: 'DELETE' })
      const data = await res.json()
      showToast(data.message, data.success ? 'success' : 'error')
      if (data.success) { closeModal(); fetchStaff() }
      else closeModal()
    } catch {
      showToast('Something went wrong', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle active/inactive ──────────────────────────────────────────────────
  const handleToggle = async (member) => {
    try {
      const res  = await fetch(`/api/admin/staff/${member._id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'toggle' }),
      })
      const data = await res.json()
      if (data.success) {
        setStaff(prev => prev.map(s => s._id === member._id ? { ...s, isActive: !s.isActive } : s))
        showToast(data.message)
      } else {
        showToast(data.message, 'error')
      }
    } catch {
      showToast('Something went wrong', 'error')
    }
  }

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount   = staff.filter(s => s.isActive).length
  const inactiveCount = staff.filter(s => !s.isActive).length

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff</h1>
          <p className="text-gray-400 text-sm mt-1">Manage cashier accounts for your bar</p>
        </div>
        {staff.length === 0 ? (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <MdAdd className="text-lg" /> Add Cashier
          </button>
        ) : (
          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl max-w-xs text-right">
            1 cashier limit reached. Contact superadmin to add more.
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Staff',    value: staff.length,  color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
          { label: 'Active',         value: activeCount,   color: 'text-green-400',  bg: 'bg-green-500/10  border-green-500/20'  },
          { label: 'Inactive',       value: inactiveCount, color: 'text-red-400',    bg: 'bg-red-500/10    border-red-500/20'    },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border rounded-2xl p-4`}>
            <p className="text-gray-400 text-xs font-medium mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
        />
      </div>

      {/* Table */}
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
                  {['Cashier', 'Email', 'Last Login', 'Status', 'Active', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14">
                      <MdPeople className="text-4xl text-gray-700 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">
                        {search
                          ? 'No staff match your search'
                          : 'No cashiers yet — add your first one'}
                      </p>
                    </td>
                  </tr>
                ) : filtered.map(member => (
                  <tr
                    key={member._id}
                    className={`hover:bg-gray-800/40 transition-colors ${!member.isActive ? 'opacity-50' : ''}`}
                  >
                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600/20 border border-purple-500/30 rounded-lg flex items-center justify-center shrink-0">
                          <MdPerson className="text-purple-400 text-sm" />
                        </div>
                        <span className="text-white font-medium text-sm">{member.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4 text-sm text-gray-400">{member.email}</td>

                    {/* Last Login */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <MdAccessTime className="text-base shrink-0" />
                        {member.lastLogin
                          ? new Date(member.lastLogin).toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })
                          : 'Never'}
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                        member.isActive
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-red-500/10   text-red-400   border-red-500/20'
                      }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Toggle */}
                    <td className="px-5 py-4">
                      <button onClick={() => handleToggle(member)} className="text-2xl">
                        {member.isActive
                          ? <MdToggleOn  className="text-green-400 hover:text-green-300 transition-colors" />
                          : <MdToggleOff className="text-gray-600  hover:text-gray-400 transition-colors" />
                        }
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(member)}
                          className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <MdEdit className="text-sm" /> Edit
                        </button>
                        <button
                          onClick={() => openDelete(member)}
                          className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <MdDelete className="text-sm" /> Delete
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

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <Modal
          title={modalMode === 'add' ? 'Add Cashier' : 'Edit Cashier'}
          onClose={closeModal}
        >
          <div className="space-y-4">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleField}
                placeholder="e.g. Ali Hassan"
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleField}
                placeholder="cashier@example.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
                {modalMode === 'edit' && (
                  <span className="text-gray-500 text-xs ml-2">(leave blank to keep current)</span>
                )}
                {modalMode === 'add' && <span className="text-red-400"> *</span>}
              </label>
              <PasswordInput
                value={form.password}
                onChange={handleField}
                placeholder={modalMode === 'edit' ? 'Leave blank to keep current' : 'Min 6 characters'}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={closeModal}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.email.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {saving
                  ? 'Saving...'
                  : modalMode === 'add' ? 'Create Cashier' : 'Save Changes'}
              </button>
            </div>

          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {modalMode === 'delete' && (
        <Modal title="Delete Cashier" onClose={closeModal}>
          <p className="text-gray-400 text-sm mb-2">
            Are you sure you want to delete{' '}
            <span className="text-white font-medium">"{selected?.name}"</span>?
          </p>
          <p className="text-gray-500 text-xs mb-5">
            This will permanently remove their account. Their past orders will remain in the system.
          </p>
          <div className="flex gap-3">
            <button
              onClick={closeModal}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {saving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}