'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MdAdd, MdRemove, MdDelete, MdClose, MdCheck,
  MdLocalAtm, MdCreditCard, MdPrint, MdShoppingCart,
  MdSearch, MdReceiptLong, MdLocalBar, MdLogout,
} from 'react-icons/md'
import { useRouter } from 'next/navigation'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`

// ─── Numeric Keypad ───────────────────────────────────────────────────────────
function NumPad({ value, onChange, onClose, onConfirm, label }) {
  const press = (key) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1) || '0')
    } else if (key === '.') {
      if (!value.includes('.')) onChange(value + '.')
    } else {
      const next = value === '0' ? key : value + key
      onChange(next)
    }
  }
  const keys = ['1','2','3','4','5','6','7','8','9','.','0','⌫']
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xs p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-sm">{label}</p>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><MdClose className="text-xl" /></button>
        </div>
        <div className="bg-gray-800 rounded-xl px-4 py-3 mb-4 text-right">
          <p className="text-gray-500 text-xs mb-0.5">Amount</p>
          <p className="text-white text-2xl font-bold font-mono">${value}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {keys.map(k => (
            <button key={k} onClick={() => press(k)}
              className={`h-14 rounded-xl text-lg font-semibold transition-colors active:scale-95 ${
                k === '⌫'
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20'
                  : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
              }`}>
              {k}
            </button>
          ))}
        </div>
        <button onClick={onConfirm} className="w-full h-14 bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg rounded-xl transition-colors">
          Confirm
        </button>
      </div>
    </div>
  )
}

// ─── Receipt Modal ────────────────────────────────────────────────────────────
function ReceiptModal({ receipt, onNewOrder }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm">
        <div className="text-center p-6 border-b border-gray-800">
          <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <MdCheck className="text-green-400 text-2xl" />
          </div>
          <h2 className="text-white font-bold text-lg">Order Complete!</h2>
          <p className="text-gray-400 text-sm mt-1">{receipt.orderNumber}</p>
        </div>
        <div className="p-5 space-y-3 max-h-72 overflow-y-auto">
          <div className="text-center">
            <p className="text-white font-semibold">{receipt.barName}</p>
            <p className="text-gray-500 text-xs mt-0.5">{new Date(receipt.createdAt).toLocaleString('en-GB')}</p>
          </div>
          <div className="border-t border-dashed border-gray-700" />
          <div className="space-y-2">
            {receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-300">{item.name} <span className="text-gray-500">×{item.quantity}</span></span>
                <span className="text-white font-medium">{fmt(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-gray-700" />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{fmt(receipt.subtotal)}</span></div>
            <div className="flex justify-between text-gray-400"><span>Tax ({receipt.taxRate}%)</span><span>{fmt(receipt.tax)}</span></div>
            <div className="flex justify-between text-white font-bold text-base mt-1"><span>Total</span><span>{fmt(receipt.total)}</span></div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Payment</span>
            <span className={`font-medium capitalize ${receipt.paymentMethod === 'cash' ? 'text-green-400' : 'text-blue-400'}`}>{receipt.paymentMethod}</span>
          </div>
        </div>
        <div className="p-5 border-t border-gray-800 flex gap-3">
          <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-3 rounded-xl transition-colors">
            <MdPrint /> Print
          </button>
          <button onClick={onNewOrder} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold py-3 rounded-xl transition-colors">
            <MdShoppingCart /> New Order
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Cashier POS ─────────────────────────────────────────────────────────
export default function CashierPOSPage() {
  const router = useRouter()

  const [categories,     setCategories]     = useState([])
  const [products,       setProducts]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search,         setSearch]         = useState('')
  const [cart,           setCart]           = useState([])
  const [notes,          setNotes]          = useState('')
  const [payModal,       setPayModal]       = useState(false)
  const [payMethod,      setPayMethod]      = useState('cash')
  const [cashInput,      setCashInput]      = useState('0')
  const [showNumPad,     setShowNumPad]     = useState(false)
  const [placing,        setPlacing]        = useState(false)
  const [receipt,        setReceipt]        = useState(null)
  const [error,          setError]          = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/categories'),
      ])
      const [pData, cData] = await Promise.all([pRes.json(), cRes.json()])
      if (pData.success) setProducts(pData.products)
      if (cData.success) setCategories(cData.categories)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const addToCart = (product) => {
    if (product.stock <= 0) return
    setCart(prev => {
      const existing = prev.find(i => i.product._id === product._id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map(i => i.product._id === product._id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const changeQty = (productId, delta) =>
    setCart(prev => prev.map(i => i.product._id === productId ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0))

  const removeFromCart = (productId) =>
    setCart(prev => prev.filter(i => i.product._id !== productId))

  const clearCart = () => { setCart([]); setNotes(''); setError('') }

  const cartCount    = cart.reduce((s, i) => s + i.quantity, 0)
  const subtotal     = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const cashPaid     = parseFloat(cashInput) || 0
  const changeAmt    = Math.max(0, cashPaid - subtotal)

  const filteredProducts = products.filter(p => {
    if (!p.isAvailable) return false
    const matchCat = activeCategory === 'all' || p.category?._id === activeCategory
    const matchQ   = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchQ
  })

  const placeOrder = async () => {
    if (cart.length === 0) return
    setPlacing(true)
    setError('')
    try {
      const res  = await fetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.product._id, quantity: i.quantity })),
          paymentMethod: payMethod,
          notes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setReceipt(data.receipt)
        setPayModal(false)
        clearCart()
        loadData()
      } else {
        setError(data.message)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">

      {/* LEFT — Products */}
      <div className="flex-1 flex flex-col min-w-0 p-4 gap-3">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center shrink-0">
              <MdLocalBar className="text-white text-sm" />
            </div>
            <span className="text-white font-bold text-lg">BarPOS</span>
          </div>
          <div className="relative flex-1 max-w-sm">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
            <input
              type="text" placeholder="Search products..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 bg-gray-900 border border-gray-800 px-3 py-2.5 rounded-xl transition-colors ml-auto">
            <MdLogout className="text-base" /> Logout
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setActiveCategory('all')}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeCategory === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
            All
          </button>
          {categories.map(cat => (
            <button key={cat._id} onClick={() => setActiveCategory(cat._id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeCategory === cat._id ? 'bg-purple-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-4">
              {filteredProducts.map(product => {
                const inCart     = cart.find(i => i.product._id === product._id)
                const outOfStock = product.stock <= 0
                const lowStock   = product.stock > 0 && product.stock <= product.lowStockAlert
                return (
                  <button key={product._id} onClick={() => addToCart(product)} disabled={outOfStock}
                    className={`relative bg-gray-900 border rounded-2xl p-4 text-left transition-all active:scale-95 ${
                      outOfStock ? 'border-gray-800 opacity-40 cursor-not-allowed'
                        : inCart ? 'border-purple-500/60 bg-purple-500/5'
                        : 'border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 cursor-pointer'
                    }`}>
                    {inCart && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-purple-600 rounded-full text-white text-xs font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                    <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center mb-3 text-lg">🍺</div>
                    <p className="text-white text-sm font-semibold leading-tight line-clamp-2 mb-1">{product.name}</p>
                    <p className="text-purple-400 font-bold text-sm">{fmt(product.price)}</p>
                    <p className={`text-xs mt-1 ${outOfStock ? 'text-red-400' : lowStock ? 'text-amber-400' : 'text-gray-600'}`}>
                      {outOfStock ? 'Out of stock' : lowStock ? `Low: ${product.stock} left` : `${product.stock} ${product.unit}`}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Cart */}
      <div className="w-80 shrink-0 flex flex-col bg-gray-900 border-l border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <MdReceiptLong className="text-purple-400 text-lg" />
            <span className="text-white font-semibold text-sm">Current Order</span>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300 transition-colors">Clear</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
              <MdShoppingCart className="text-4xl text-gray-700" />
              <p className="text-gray-500 text-sm text-center">Tap a product to add it</p>
            </div>
          ) : cart.map(item => (
            <div key={item.product._id} className="bg-gray-800 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-white text-sm font-medium leading-tight flex-1">{item.product.name}</p>
                <button onClick={() => removeFromCart(item.product._id)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                  <MdDelete className="text-base" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => changeQty(item.product._id, -1)}
                    className="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors active:scale-90">
                    <MdRemove className="text-sm" />
                  </button>
                  <span className="text-white font-bold text-sm w-6 text-center">{item.quantity}</span>
                  <button onClick={() => changeQty(item.product._id, 1)} disabled={item.quantity >= item.product.stock}
                    className="w-7 h-7 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center text-white transition-colors active:scale-90">
                    <MdAdd className="text-sm" />
                  </button>
                </div>
                <span className="text-purple-400 font-bold text-sm">{fmt(item.product.price * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="px-3 pb-2">
            <input type="text" placeholder="Order notes (optional)..."
              value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-xs"
            />
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
            <span className="text-gray-400">Subtotal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-xs">Tax added at checkout</span>
            <span className="text-white font-bold text-lg">{fmt(subtotal)}</span>
          </div>
        </div>

        <div className="p-3 border-t border-gray-800">
          <button onClick={() => { setPayModal(true); setError('') }} disabled={cart.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-bold text-base py-4 rounded-xl transition-colors active:scale-95">
            {cart.length === 0 ? 'Add Items to Order' : `Charge ${fmt(subtotal)}`}
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">Payment</h2>
              <button onClick={() => { setPayModal(false); setError('') }} className="text-gray-400 hover:text-white"><MdClose className="text-xl" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">Amount Due</p>
                <p className="text-white text-3xl font-bold">{fmt(subtotal)}</p>
                <p className="text-gray-500 text-xs mt-1">+ tax will be added</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium mb-2">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPayMethod('cash')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border transition-colors ${payMethod === 'cash' ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                    <MdLocalAtm className="text-xl" /> Cash
                  </button>
                  <button onClick={() => setPayMethod('card')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border transition-colors ${payMethod === 'card' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                    <MdCreditCard className="text-xl" /> Card
                  </button>
                </div>
              </div>
              {payMethod === 'cash' && (
                <div>
                  <p className="text-gray-400 text-xs font-medium mb-2">Cash Received</p>
                  <button onClick={() => setShowNumPad(true)}
                    className="w-full bg-gray-800 border border-gray-700 hover:border-purple-500 rounded-xl px-4 py-3 text-left transition-colors">
                    <p className="text-gray-500 text-xs">Tap to enter amount</p>
                    <p className="text-white text-xl font-bold font-mono">${cashInput}</p>
                  </button>
                  {cashPaid > 0 && (
                    <div className={`mt-2 rounded-xl px-4 py-2.5 flex justify-between text-sm ${cashPaid >= subtotal ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <span className={cashPaid >= subtotal ? 'text-green-400' : 'text-red-400'}>
                        {cashPaid >= subtotal ? 'Change Due' : 'Amount Short'}
                      </span>
                      <span className={`font-bold ${cashPaid >= subtotal ? 'text-green-400' : 'text-red-400'}`}>
                        {cashPaid >= subtotal ? fmt(changeAmt) : fmt(subtotal - cashPaid)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}
              <button onClick={placeOrder} disabled={placing}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold text-base py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                {placing ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                ) : (
                  <><MdCheck className="text-xl" /> Confirm {payMethod === 'cash' ? 'Cash' : 'Card'} Payment</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNumPad && (
        <NumPad value={cashInput} onChange={setCashInput} onClose={() => setShowNumPad(false)} onConfirm={() => setShowNumPad(false)} label="Enter cash received" />
      )}

      {receipt && (
        <ReceiptModal receipt={receipt} onNewOrder={() => setReceipt(null)} />
      )}
    </div>
  )
}