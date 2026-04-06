'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MdEdit, MdClose, MdSearch, MdInventory,
  MdWarning, MdCheckCircle, MdErrorOutline, MdRefresh,
} from 'react-icons/md'

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl ${
      toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
    }`}>
      {toast.message}
      <button onClick={onClose} className="opacity-60 hover:opacity-100"><MdClose /></button>
    </div>
  )
}

// ─── Stock status helper ──────────────────────────────────────────────────────
function StockBadge({ stock, lowStockAlert }) {
  if (stock === 0) return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
      <MdErrorOutline className="text-sm" /> Out of Stock
    </span>
  )
  if (stock <= lowStockAlert) return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
      <MdWarning className="text-sm" /> Low Stock
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
      <MdCheckCircle className="text-sm" /> In Stock
    </span>
  )
}

// ─── Edit Stock Modal ─────────────────────────────────────────────────────────
function EditModal({ product, onClose, onSave }) {
  const [stock,         setStock]         = useState(String(product.stock))
  const [lowStockAlert, setLowStockAlert] = useState(String(product.lowStockAlert))
  const [saving,        setSaving]        = useState(false)

  const handleSave = async () => {
    if (isNaN(stock) || Number(stock) < 0) return
    setSaving(true)
    await onSave(product._id, Number(stock), Number(lowStockAlert))
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Adjust Stock</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><MdClose className="text-xl" /></button>
        </div>

        {/* Product info */}
        <div className="bg-gray-800 rounded-xl p-3 mb-4">
          <p className="text-white font-medium text-sm">{product.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{product.category?.name} · {product.unit}</p>
        </div>

        <div className="space-y-4">
          {/* Current → New stock */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              New Stock Quantity
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number" min="0"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm"
                />
              </div>
              <span className="text-gray-500 text-sm">{product.unit}</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">Current: {product.stock} {product.unit}</p>
          </div>

          {/* Low stock alert */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Low Stock Alert At
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number" min="0"
                  value={lowStockAlert}
                  onChange={e => setLowStockAlert(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm"
                />
              </div>
              <span className="text-gray-500 text-sm">{product.unit}</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">Alert when stock falls to or below this</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || isNaN(stock) || Number(stock) < 0}
              className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              {saving ? 'Saving...' : 'Update Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [products,  setProducts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all') // 'all' | 'low' | 'out' | 'ok'
  const [editing,   setEditing]   = useState(null)
  const [toast,     setToast]     = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/inventory')
      const data = await res.json()
      if (data.success) setProducts(data.products)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleSave = async (productId, newStock, lowStockAlert) => {
    try {
      const res  = await fetch('/api/inventory', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId, newStock, lowStockAlert }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message)
        setEditing(null)
        fetchProducts()
      } else {
        showToast(data.message, 'error')
      }
    } catch {
      showToast('Something went wrong', 'error')
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalProducts  = products.length
  const outOfStock     = products.filter(p => p.stock === 0).length
  const lowStock       = products.filter(p => p.stock > 0 && p.stock <= p.lowStockAlert).length
  const inStock        = products.filter(p => p.stock > p.lowStockAlert).length

  // ── Filter + Search ────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.category?.name?.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'out' ? p.stock === 0 :
      filter === 'low' ? p.stock > 0 && p.stock <= p.lowStockAlert :
      filter === 'ok'  ? p.stock > p.lowStockAlert : true
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-gray-400 text-sm mt-1">Track and manage stock levels</p>
        </div>
        <button onClick={fetchProducts}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white bg-gray-900 border border-gray-800 hover:border-gray-700 px-3 py-2 rounded-xl transition-colors">
          <MdRefresh className="text-base" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: totalProducts, color: 'purple', icon: MdInventory },
          { label: 'In Stock',       value: inStock,       color: 'green',  icon: MdCheckCircle },
          { label: 'Low Stock',      value: lowStock,      color: 'amber',  icon: MdWarning },
          { label: 'Out of Stock',   value: outOfStock,    color: 'red',    icon: MdErrorOutline },
        ].map(({ label, value, color, icon: Icon }) => {
          const cls = {
            purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
            green:  'bg-green-500/10  border-green-500/20  text-green-400',
            amber:  'bg-amber-500/10  border-amber-500/20  text-amber-400',
            red:    'bg-red-500/10    border-red-500/20    text-red-400',
          }[color]
          return (
            <div key={label} className={`${cls} border rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm font-medium">{label}</span>
                <Icon className={`text-xl ${cls.split(' ')[2]}`} />
              </div>
              <p className={`text-2xl font-bold ${cls.split(' ')[2]}`}>{value}</p>
            </div>
          )
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
          <input type="text" placeholder="Search products..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm w-56"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'ok', 'low', 'out'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-purple-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
              }`}>
              {f === 'all' ? 'All' : f === 'ok' ? 'In Stock' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
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
                  {['Product', 'Category', 'Stock', 'Alert At', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14">
                      <MdInventory className="text-4xl text-gray-700 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">{search ? 'No products match your search' : 'No products found'}</p>
                    </td>
                  </tr>
                ) : filtered.map(product => (
                  <tr key={product._id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-white text-sm font-medium">{product.name}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{product.unit}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {product.category?.name || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-bold ${
                        product.stock === 0 ? 'text-red-400' :
                        product.stock <= product.lowStockAlert ? 'text-amber-400' : 'text-white'
                      }`}>
                        {product.stock}
                      </span>
                      <span className="text-gray-600 text-xs ml-1">{product.unit}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">
                      {product.lowStockAlert} {product.unit}
                    </td>
                    <td className="px-5 py-4">
                      <StockBadge stock={product.stock} lowStockAlert={product.lowStockAlert} />
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => setEditing(product)}
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors">
                        <MdEdit className="text-sm" /> Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditModal
          product={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}