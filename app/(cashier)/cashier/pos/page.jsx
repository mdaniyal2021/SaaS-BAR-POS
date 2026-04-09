'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MdAdd, MdRemove, MdDelete, MdClose, MdCheck,
  MdLocalAtm, MdCreditCard, MdPrint, MdShoppingCart,
  MdSearch, MdReceiptLong, MdLocalBar, MdLogout,
} from 'react-icons/md'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`

// ─── Numeric Keypad ───────────────────────────────────────────────────────────
function NumPad({ value, onChange, onClose, onConfirm, label, prefix = '$' }) {
  const press = (key) => {
    if (key === '⌫') { onChange(value.slice(0, -1) || '0'); return }
    if (key === '.') { if (!value.includes('.')) onChange(value + '.'); return }
    onChange(value === '0' ? key : value + key)
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
          <p className="text-white text-2xl font-bold font-mono">{prefix}{value}</p>
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
  const fmtDateTime = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + '  ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 no-print">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm flex flex-col max-h-[90vh]">

        {/* Screen-only header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800 no-print">
          <div className="w-7 h-7 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center">
            <MdCheck className="text-green-400 text-base" />
          </div>
          <span className="text-white font-semibold text-sm">Order Complete</span>
        </div>

        {/* ── Printable slip ── */}
        <div id="receipt-slip" className="p-5 overflow-y-auto flex-1 font-mono text-xs space-y-3">

          {/* Header */}
          <div className="text-center space-y-0.5">
            <img src="/icons/logo.png" alt="logo" className="h-20 w-auto mx-auto mb-2 object-contain" />
            <p className="text-white font-bold text-base">{receipt.barName}</p>
            {receipt.barAddress && <p className="text-gray-400">{receipt.barAddress}</p>}
            {receipt.barPhone   && <p className="text-gray-400">{receipt.barPhone}</p>}
          </div>

          <div className="border-t border-dashed border-gray-600" />

          {/* Invoice info */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice #</span>
              <span className="text-white font-bold">{receipt.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date & Time</span>
              <span className="text-gray-300">{fmtDateTime(receipt.createdAt)}</span>
            </div>
            {receipt.cashier && (
              <div className="flex justify-between">
                <span className="text-gray-500">Cashier</span>
                <span className="text-gray-300">{receipt.cashier}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-600" />

          {/* Items table */}
          <div className="space-y-0.5">
            <div className="flex text-gray-500 text-xs pb-1">
              <span className="flex-1">Item</span>
              <span className="w-8 text-center">Qty</span>
              <span className="w-14 text-right">Price</span>
              <span className="w-16 text-right">Total</span>
            </div>
            {receipt.items.map((item, i) => (
              <div key={i} className="flex text-gray-300">
                <span className="flex-1 truncate pr-1">{item.name}</span>
                <span className="w-8 text-center">{item.quantity}</span>
                <span className="w-14 text-right">{fmt(item.price)}</span>
                <span className="w-16 text-right text-white">{fmt(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-600" />

          {/* Billing summary */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span><span>{fmt(receipt.subtotal)}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount {receipt.discountType === 'percent' ? `(${receipt.discountValue}%)` : '(fixed)'}</span>
                <span>- {fmt(receipt.discountAmount)}</span>
              </div>
            )}
            {receipt.tax > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Tax</span>
                <span>{fmt(receipt.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-sm border-t border-gray-600 pt-1 mt-1">
              <span>Grand Total</span><span>{fmt(receipt.total)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-600" />

          {/* Payment */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-400">
              <span>Payment</span>
              <span className={`capitalize font-medium ${receipt.paymentMethod === 'cash' ? 'text-green-400' : 'text-blue-400'}`}>
                {receipt.paymentMethod}
              </span>
            </div>
            {receipt.cashReceived > 0 && receipt.paymentMethod === 'cash' && (
              <>
                <div className="flex justify-between text-gray-400">
                  <span>Cash Received</span><span className="text-white">{fmt(receipt.cashReceived)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Change Returned</span>
                  <span className="text-green-400 font-medium">{fmt(Math.max(0, receipt.cashReceived - receipt.total))}</span>
                </div>
              </>
            )}
          </div>

          {receipt.notes && (
            <>
              <div className="border-t border-dashed border-gray-600" />
              <p className="text-gray-500 italic">Note: {receipt.notes}</p>
            </>
          )}

          <div className="border-t border-dashed border-gray-600" />

          {/* Footer */}
          <div className="text-center space-y-0.5 pb-1">
            <p className="text-white font-semibold">Thank you for your visit!</p>
            <p className="text-gray-500">Please come again</p>
          </div>

        </div>

        {/* Action buttons */}
        <div className="p-5 border-t border-gray-800 flex gap-3 no-print">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-3 rounded-xl transition-colors"
          >
            <MdPrint /> Print
          </button>
          <button
            onClick={onNewOrder}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold py-3 rounded-xl transition-colors"
          >
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
  const [discountType,   setDiscountType]   = useState('percent')
  const [discountValue,  setDiscountValue]  = useState('0')
  const [showNumPad,     setShowNumPad]     = useState(false)
  const [numPadTarget,   setNumPadTarget]   = useState('cash')
  const [payModal,       setPayModal]       = useState(false)
  const [payMethod,      setPayMethod]      = useState('cash')
  const [cashInput,      setCashInput]      = useState('0')
  const [placing,        setPlacing]        = useState(false)
  const [receipt,        setReceipt]        = useState(null)
  const [error,          setError]          = useState('')

  // Tax is calculated per-product using each product's own taxRate

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([fetch('/api/admin/products'), fetch('/api/admin/categories')])
      const [pData, cData] = await Promise.all([pRes.json(), cRes.json()])
      if (pData.success) setProducts(pData.products)
      if (cData.success) setCategories(cData.categories)
    } finally { setLoading(false) }
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

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.product._id !== id))

  const clearCart = () => { setCart([]); setNotes(''); setError(''); setDiscountValue('0'); setDiscountType('percent') }

  const cartCount      = cart.reduce((s, i) => s + i.quantity, 0)
  const subtotal       = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const discountRaw    = parseFloat(discountValue) || 0
  const discountAmount = discountType === 'percent' ? (subtotal * Math.min(discountRaw, 100)) / 100 : Math.min(discountRaw, subtotal)
  const afterDiscount  = subtotal - discountAmount
  const taxAmount      = cart.reduce((sum, i) => sum + (i.product.price * i.quantity * (i.product.taxRate || 0)) / 100, 0)
  const totalDisplay   = afterDiscount + taxAmount
  const cashPaid       = parseFloat(cashInput) || 0
  const changeAmt      = Math.max(0, cashPaid - totalDisplay)

  const filteredProducts = products.filter(p => {
    if (!p.isAvailable) return false
    const matchCat = activeCategory === 'all' || p.category?._id === activeCategory
    return matchCat && p.name.toLowerCase().includes(search.toLowerCase())
  })

  const openNumPad = (target) => { setNumPadTarget(target); setShowNumPad(true) }
  const handleNumPadChange = (val) => numPadTarget === 'cash' ? setCashInput(val) : setDiscountValue(val)

  const placeOrder = async () => {
    if (cart.length === 0) return
    setPlacing(true); setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.product._id, quantity: i.quantity })),
          paymentMethod: payMethod,
          cashReceived: payMethod === 'cash' ? cashPaid : 0,
          notes,
          discountType,
          discountValue: discountAmount,
          discountRawVal: discountRaw,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setReceipt({ ...data.receipt, cashReceived: payMethod === 'cash' ? cashPaid : 0 })
        setPayModal(false); clearCart(); setCashInput('0'); loadData()
      } else { setError(data.message) }
    } catch { setError('Network error. Please try again.') }
    finally { setPlacing(false) }
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">

      {/* LEFT — Products */}
      <div className="flex-1 flex flex-col min-w-0 p-4 gap-3">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src="/icons/logo.png" alt="BrewPOS" className="h-25 w-auto object-contain shrink-0" />
            {/* <span className="text-white font-bold text-lg">BrewPOS</span> */}
          </div>
          <div className="relative flex-1 max-w-sm">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
            <input type="text" placeholder="Search products..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 bg-gray-900 border border-gray-800 px-3 py-2.5 rounded-xl transition-colors ml-auto shrink-0">
            <MdLogout className="text-base" /> Logout
          </button>
        </div>

        {/* Category tabs */}
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
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <MdShoppingCart className="text-4xl text-gray-700" />
              <p className="text-gray-500 text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-4">
              {filteredProducts.map(product => {
                const inCart = cart.find(i => i.product._id === product._id)
                const outOfStock = product.stock <= 0
                const lowStock = product.stock > 0 && product.stock <= product.lowStockAlert
                return (
                  <button key={product._id} onClick={() => addToCart(product)} disabled={outOfStock}
                    className={`relative bg-gray-900 border rounded-2xl p-4 text-left transition-all active:scale-95 ${
                      outOfStock ? 'border-gray-800 opacity-40 cursor-not-allowed'
                      : inCart ? 'border-purple-500/60 bg-purple-500/5 shadow-sm shadow-purple-900/20'
                      : 'border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 cursor-pointer'
                    }`}>
                    {inCart && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-purple-600 rounded-full text-white text-xs font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                    {outOfStock && (
                      <span className="absolute top-2 left-2 bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-md border border-red-500/20">Out</span>
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
      <div className="w-80 shrink-0 flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden m-4 ml-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <MdReceiptLong className="text-purple-400 text-lg" />
            <span className="text-white font-semibold text-sm">Current Order</span>
          </div>
          {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300 transition-colors">Clear</button>}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
              <MdShoppingCart className="text-4xl text-gray-700" />
              <p className="text-gray-500 text-sm text-center">Tap a product to add it to the order</p>
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
                  <button onClick={() => changeQty(item.product._id, -1)} className="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors active:scale-90">
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

        {/* Summary + Discount */}
        <div className="px-4 py-3 border-t border-gray-800 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
            <span className="text-gray-400">{fmt(subtotal)}</span>
          </div>

          {cart.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-gray-500 text-xs font-medium">Discount</p>
              <div className="flex gap-2">
                <div className="flex bg-gray-800 border border-gray-700 rounded-xl p-0.5 shrink-0">
                  <button onClick={() => { setDiscountType('percent'); setDiscountValue('0') }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${discountType === 'percent' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>%</button>
                  <button onClick={() => { setDiscountType('fixed'); setDiscountValue('0') }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${discountType === 'fixed' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>$</button>
                </div>
                <button onClick={() => openNumPad('discount')}
                  className="flex-1 bg-gray-800 border border-gray-700 hover:border-purple-500 rounded-xl px-3 py-1.5 text-left transition-colors">
                  <p className="text-gray-500 text-xs">Tap to enter</p>
                  <p className="text-white text-sm font-bold font-mono">
                    {discountType === 'percent' ? `${discountValue === '0' ? '0' : discountValue}%` : `$${discountValue === '0' ? '0' : discountValue}`}
                  </p>
                </button>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-green-400">Discount ({discountType === 'percent' ? `${discountRaw}%` : 'fixed'})</span>
                  <span className="text-green-400 font-medium">- {fmt(discountAmount)}</span>
                </div>
              )}
            </div>
          )}

          {cart.length > 0 && (
            <div className="border-t border-gray-800 pt-2 space-y-1.5">
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-gray-500"><span>After discount</span><span>{fmt(afterDiscount)}</span></div>
              )}
              <div className="flex justify-between text-xs text-gray-500"><span>Tax</span><span>{fmt(taxAmount)}</span></div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-white font-bold text-sm">Total</span>
                <span className="text-white font-bold text-xl">{fmt(totalDisplay)}</span>
              </div>
            </div>
          )}
          {cart.length === 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs">Add items to start</span>
              <span className="text-white font-bold text-lg">{fmt(0)}</span>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-800">
          <button onClick={() => { setPayModal(true); setError('') }} disabled={cart.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-bold text-base py-4 rounded-xl transition-colors active:scale-95">
            {cart.length === 0 ? 'Add Items to Order' : `Charge ${fmt(totalDisplay)}`}
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
              <div className="bg-gray-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                {discountAmount > 0 && <>
                  <div className="flex justify-between text-xs text-green-400"><span>Discount ({discountType === 'percent' ? `${discountRaw}%` : 'fixed'})</span><span>- {fmt(discountAmount)}</span></div>
                  <div className="flex justify-between text-xs text-gray-500"><span>After discount</span><span>{fmt(afterDiscount)}</span></div>
                </>}
                <div className="flex justify-between text-xs text-gray-500"><span>Tax</span><span>{fmt(taxAmount)}</span></div>
                <div className="border-t border-gray-700 pt-2 text-center">
                  <p className="text-gray-400 text-xs mb-1">Total Due</p>
                  <p className="text-white text-3xl font-bold">{fmt(totalDisplay)}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium mb-2">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPayMethod('cash')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors border ${payMethod === 'cash' ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'}`}>
                    <MdLocalAtm className="text-xl" /> Cash
                  </button>
                  <button onClick={() => setPayMethod('card')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors border ${payMethod === 'card' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'}`}>
                    <MdCreditCard className="text-xl" /> Card
                  </button>
                </div>
              </div>
              {payMethod === 'cash' && (
                <div>
                  <p className="text-gray-400 text-xs font-medium mb-2">Cash Received</p>
                  <button onClick={() => openNumPad('cash')}
                    className="w-full bg-gray-800 border border-gray-700 hover:border-purple-500 rounded-xl px-4 py-3 text-left transition-colors">
                    <p className="text-gray-500 text-xs">Tap to enter amount</p>
                    <p className="text-white text-xl font-bold font-mono">${cashInput}</p>
                  </button>
                  {cashPaid > 0 && (
                    <div className={`mt-2 rounded-xl px-4 py-2.5 flex justify-between text-sm ${cashPaid >= totalDisplay ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <span className={cashPaid >= totalDisplay ? 'text-green-400' : 'text-red-400'}>{cashPaid >= totalDisplay ? 'Change Due' : 'Amount Short'}</span>
                      <span className={`font-bold ${cashPaid >= totalDisplay ? 'text-green-400' : 'text-red-400'}`}>
                        {cashPaid >= totalDisplay ? fmt(changeAmt) : fmt(totalDisplay - cashPaid)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <button onClick={placeOrder} disabled={placing || (payMethod === 'cash' && cashPaid > 0 && cashPaid < totalDisplay)}
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
        <NumPad
          value={numPadTarget === 'cash' ? cashInput : discountValue}
          onChange={handleNumPadChange}
          onClose={() => setShowNumPad(false)}
          onConfirm={() => setShowNumPad(false)}
          label={numPadTarget === 'cash' ? 'Enter cash received' : `Enter discount (${discountType === 'percent' ? 'percentage' : 'fixed amount'})`}
          prefix={numPadTarget === 'cash' ? '$' : (discountType === 'percent' ? '' : '$')}
        />
      )}

      {receipt && <ReceiptModal receipt={receipt} onNewOrder={() => setReceipt(null)} />}
    </div>
  )
}