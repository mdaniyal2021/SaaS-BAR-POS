'use client'

import { useEffect, useState, useCallback } from 'react'
import { MdAdd, MdEdit, MdDelete, MdClose, MdSearch, MdStorefront, MdToggleOn, MdToggleOff } from 'react-icons/md'

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

const EMPTY_FORM = { name: '', price: '', stock: '', unit: 'pcs', lowStockAlert: '5', categoryId: '', taxRate: '0' }

export default function ProductsPage() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [modalMode, setModalMode]   = useState(null) // 'add' | 'edit' | 'delete'
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [pRes, cRes] = await Promise.all([
      fetch('/api/admin/products'),
      fetch('/api/admin/categories'),
    ])
    const [pData, cData] = await Promise.all([pRes.json(), cRes.json()])
    if (pData.success) setProducts(pData.products)
    if (cData.success) setCategories(cData.categories)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setSelected(null)
    setModalMode('add')
  }

  const openEdit = (p) => {
    setForm({
      name: p.name,
      price: String(p.price),
      stock: String(p.stock),
      unit: p.unit,
      lowStockAlert: String(p.lowStockAlert),
      categoryId: p.category?._id || '',
      taxRate: String(p.taxRate ?? 0),
    })
    setSelected(p)
    setModalMode('edit')
  }

  const openDelete = (p) => { setSelected(p); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null) }

  const handleField = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.categoryId) return
    setSaving(true)

    const isEdit = modalMode === 'edit'
    const url    = isEdit ? `/api/admin/products/${selected._id}` : '/api/admin/products'
    const method = isEdit ? 'PATCH' : 'POST'

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:          form.name.trim(),
        price:         Number(form.price),
        stock:         Number(form.stock),
        unit:          form.unit.trim() || 'pcs',
        lowStockAlert: Number(form.lowStockAlert),
        categoryId:    form.categoryId,
        taxRate:       Number(form.taxRate) || 0,
      }),
    })
    const data = await res.json()

    if (data.success) {
      showToast(data.message)
      closeModal()
      fetchAll()
    } else {
      showToast(data.message, 'error')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    setSaving(true)
    const res  = await fetch(`/api/admin/products/${selected._id}`, { method: 'DELETE' })
    const data = await res.json()
    showToast(data.message, data.success ? 'success' : 'error')
    closeModal()
    if (data.success) fetchAll()
    setSaving(false)
  }

  const toggleAvailable = async (product) => {
    const res  = await fetch(`/api/admin/products/${product._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !product.isAvailable }),
    })
    const data = await res.json()
    if (data.success) {
      setProducts(prev => prev.map(p => p._id === product._id ? data.product : p))
    } else {
      showToast(data.message, 'error')
    }
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat    = filterCat ? p.category?._id === filterCat : true
    return matchSearch && matchCat
  })

  const formValid = form.name.trim() && form.price !== '' && form.categoryId

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your bar's product catalog</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <MdAdd className="text-lg" /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm w-56"
          />
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
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
                  {['Product', 'Category', 'Price', 'Tax %', 'Stock', 'Unit', 'Available', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <MdStorefront className="text-4xl text-gray-700 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">
                        {search || filterCat ? 'No products match your filters' : 'No products yet — add your first one'}
                      </p>
                    </td>
                  </tr>
                ) : filtered.map(p => {
                  const lowStock = p.stock <= p.lowStockAlert
                  return (
                    <tr key={p._id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-white">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {p.category?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-medium">${Number(p.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{p.taxRate ?? 0}%</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${lowStock ? 'text-red-400' : 'text-gray-300'}`}>
                          {p.stock}
                          {lowStock && <span className="ml-1 text-xs text-red-500">(low)</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{p.unit}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleAvailable(p)} className="text-2xl">
                          {p.isAvailable
                            ? <MdToggleOn className="text-green-400 hover:text-green-300 transition-colors" />
                            : <MdToggleOff className="text-gray-600 hover:text-gray-400 transition-colors" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <MdEdit className="text-sm" /> Edit
                          </button>
                          <button
                            onClick={() => openDelete(p)}
                            className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <MdDelete className="text-sm" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold">{modalMode === 'add' ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white"><MdClose className="text-xl" /></button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Product Name *</label>
                <input
                  name="name" value={form.name} onChange={handleField}
                  placeholder="e.g. Heineken"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Category *</label>
                <select
                  name="categoryId" value={form.categoryId} onChange={handleField}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm"
                >
                  <option value="">Select a category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              {/* Price + Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Price *</label>
                  <input
                    name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleField}
                    placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Stock</label>
                  <input
                    name="stock" type="number" min="0" value={form.stock} onChange={handleField}
                    placeholder="0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>
              </div>

              {/* Unit + Low Stock Alert */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Unit</label>
                  <input
                    name="unit" value={form.unit} onChange={handleField}
                    placeholder="pcs, bottle, glass..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Low Stock Alert</label>
                  <input
                    name="lowStockAlert" type="number" min="0" value={form.lowStockAlert} onChange={handleField}
                    placeholder="5"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>
              </div>

              {/* Tax Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Tax Rate (%)</label>
                <input
                  name="taxRate" type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={handleField}
                  placeholder="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                />
                <p className="text-gray-600 text-xs mt-1">Enter 0 for no tax. e.g. 5 for 5% tax</p>
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
                  disabled={saving || !formValid}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {saving ? 'Saving...' : modalMode === 'add' ? 'Add Product' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {modalMode === 'delete' && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Delete Product</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white"><MdClose className="text-xl" /></button>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              Are you sure you want to delete <span className="text-white font-medium">"{selected?.name}"</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
