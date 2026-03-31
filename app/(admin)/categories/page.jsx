'use client'

import { useEffect, useState, useCallback } from 'react'
import { MdAdd, MdEdit, MdDelete, MdClose, MdSearch, MdCategory } from 'react-icons/md'

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

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
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

export default function CategoriesPage() {
  const [categories, setCategories]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [modalMode, setModalMode]     = useState(null) // 'add' | 'edit' | 'delete'
  const [selected, setSelected]       = useState(null)
  const [nameInput, setNameInput]     = useState('')
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    if (data.success) setCategories(data.categories)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const openAdd = () => { setNameInput(''); setSelected(null); setModalMode('add') }
  const openEdit = (cat) => { setNameInput(cat.name); setSelected(cat); setModalMode('edit') }
  const openDelete = (cat) => { setSelected(cat); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null); setNameInput('') }

  const handleSave = async () => {
    if (!nameInput.trim()) return
    setSaving(true)

    const isEdit = modalMode === 'edit'
    const url    = isEdit ? `/api/admin/categories/${selected._id}` : '/api/admin/categories'
    const method = isEdit ? 'PATCH' : 'POST'

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.trim() }),
    })
    const data = await res.json()

    if (data.success) {
      showToast(data.message)
      closeModal()
      fetchCategories()
    } else {
      showToast(data.message, 'error')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    setSaving(true)
    const res  = await fetch(`/api/admin/categories/${selected._id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      showToast(data.message)
      closeModal()
      fetchCategories()
    } else {
      showToast(data.message, 'error')
      closeModal()
    }
    setSaving(false)
  }

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-gray-400 text-sm mt-1">Organise your products into categories</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <MdAdd className="text-lg" /> Add Category
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
        <input
          type="text"
          placeholder="Search categories..."
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
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Category Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Created</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12">
                      <MdCategory className="text-4xl text-gray-700 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">
                        {search ? 'No categories match your search' : 'No categories yet — add your first one'}
                      </p>
                    </td>
                  </tr>
                ) : filtered.map(cat => (
                  <tr key={cat._id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
                          <MdCategory className="text-purple-400 text-sm" />
                        </div>
                        <span className="text-white font-medium text-sm">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(cat.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(cat)}
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <MdEdit className="text-sm" /> Edit
                        </button>
                        <button
                          onClick={() => openDelete(cat)}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
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

      {/* Add / Edit Modal */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <Modal title={modalMode === 'add' ? 'Add Category' : 'Edit Category'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Category Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="e.g. Beer, Wine, Spirits"
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={closeModal}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !nameInput.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {saving ? 'Saving...' : modalMode === 'add' ? 'Add Category' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {modalMode === 'delete' && (
        <Modal title="Delete Category" onClose={closeModal}>
          <p className="text-gray-400 text-sm mb-5">
            Are you sure you want to delete <span className="text-white font-medium">"{selected?.name}"</span>?
            This cannot be undone.
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
