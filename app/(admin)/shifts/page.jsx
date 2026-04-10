'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MdAccessTime, MdTrendingUp, MdTrendingDown, MdRemove,
  MdRefresh, MdClose, MdLocalAtm, MdCreditCard, MdReceipt,
  MdDiscount, MdAccountBalanceWallet, MdPeople,
} from 'react-icons/md'

const fmt    = (n) => `$${Number(n ?? 0).toFixed(2)}`
const fmtDT  = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
const fmtDuration = (start, end) => {
  if (!start || !end) return '—'
  const ms = new Date(end) - new Date(start)
  const h  = Math.floor(ms / 3600000)
  const m  = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

// ─── Z-Report Modal ────────────────────────────────────────────────────────────
function ZReportModal({ shiftId, onClose }) {
  const [shift,   setShift]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch(`/api/admin/shifts/${shiftId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setShift(data.shift)
        else setError(data.message || 'Failed to load shift')
        setLoading(false)
      })
      .catch(() => { setError('Network error'); setLoading(false) })
  }, [shiftId])

  const diff    = shift?.cashDifference ?? 0
  const isOver  = diff > 0
  const isShort = diff < 0

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <MdReceipt className="text-purple-400 text-xl" />
            <span className="text-white font-semibold">Z-Report</span>
            {shift && (
              <span className="text-xs text-gray-500 font-normal ml-1">
                — {shift.cashier?.name}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <MdClose className="text-xl" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm text-center py-10">{error}</p>
          ) : (
            <div className="space-y-4">

              {/* Shift info */}
              <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Shift Details</p>
                <Row label="Cashier"  value={shift.cashier?.name || '—'} />
                <Row label="Email"    value={shift.cashier?.email || '—'} sub />
                <Row label="Started"  value={fmtDT(shift.startTime)} />
                <Row label="Ended"    value={fmtDT(shift.endTime)} />
                <Row label="Duration" value={fmtDuration(shift.startTime, shift.endTime)} />
              </div>

              {/* Sales breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {/* Cash */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MdLocalAtm className="text-green-400 text-lg" />
                    <p className="text-green-400 text-xs font-semibold uppercase tracking-wider">Cash</p>
                  </div>
                  <p className="text-white text-xl font-bold">{fmt(shift.totalCashSales)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{shift.cashOrderCount ?? 0} orders</p>
                </div>
                {/* Card */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MdCreditCard className="text-blue-400 text-lg" />
                    <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Card</p>
                  </div>
                  <p className="text-white text-xl font-bold">{fmt(shift.totalCardSales)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{shift.cardOrderCount ?? 0} orders</p>
                </div>
              </div>

              {/* Revenue summary */}
              <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Revenue Summary</p>
                <Row label="Total Orders"  value={shift.totalOrders} />
                <Row label="Gross Sales"   value={fmt(shift.grossSales)}    valueClass="text-white" />
                {(shift.totalDiscount > 0) && (
                  <Row label="Total Discounts" value={`- ${fmt(shift.totalDiscount)}`} valueClass="text-amber-400" />
                )}
                <div className="border-t border-gray-700 pt-2 mt-1 flex justify-between">
                  <span className="text-gray-300 font-semibold">Net Sales</span>
                  <span className="text-purple-400 font-bold text-base">
                    {fmt((shift.totalCashSales || 0) + (shift.totalCardSales || 0))}
                  </span>
                </div>
              </div>

              {/* Cash reconciliation */}
              <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Cash Reconciliation</p>
                <Row label="Opening Cash"  value={fmt(shift.openingCash)}   valueClass="text-white" />
                <Row label="+ Cash Sales"  value={fmt(shift.totalCashSales)} valueClass="text-green-400" />
                <Row label="= Expected"    value={fmt(shift.expectedCash)}   valueClass="text-white" />
                <Row label="Closing Cash"  value={fmt(shift.closingCash)}    valueClass="text-white" />
                <div className="border-t border-gray-700 pt-2 mt-1 flex justify-between items-center">
                  <span className="text-gray-300 font-semibold">Difference</span>
                  <span className={`font-bold text-base flex items-center gap-1 ${isOver ? 'text-green-400' : isShort ? 'text-red-400' : 'text-gray-400'}`}>
                    {isOver ? <MdTrendingUp /> : isShort ? <MdTrendingDown /> : <MdRemove />}
                    {isOver ? '+' : ''}{fmt(diff)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {shift.notes && (
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Notes</p>
                  <p className="text-gray-300 text-sm">{shift.notes}</p>
                </div>
              )}

            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-800">
          <button onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, valueClass = 'text-gray-300', sub = false }) {
  return (
    <div className="flex justify-between">
      <span className={sub ? 'text-gray-600 text-xs' : 'text-gray-400'}>{label}</span>
      <span className={`${valueClass} ${sub ? 'text-xs' : ''}`}>{value}</span>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ShiftsPage() {
  const [shifts,       setShifts]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [from,         setFrom]         = useState('')
  const [to,           setTo]           = useState('')
  const [viewShiftId,  setViewShiftId]  = useState(null)

  const fetchShifts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to)   params.set('to',   to)
    const res  = await fetch(`/api/admin/shifts?${params}`)
    const data = await res.json()
    if (data.success) setShifts(data.shifts)
    setLoading(false)
  }, [from, to])

  useEffect(() => { fetchShifts() }, [fetchShifts])

  const activeShifts = shifts.filter(s => s.status === 'active').length
  const closedShifts = shifts.filter(s => s.status === 'closed')
  const totalSales   = closedShifts.reduce((s, sh) => s + sh.totalCashSales + sh.totalCardSales, 0)
  const totalOrders  = closedShifts.reduce((s, sh) => s + sh.totalOrders, 0)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Shift Reports</h1>
          <p className="text-gray-400 text-sm mt-1">Track cashier shifts and cash reconciliation</p>
        </div>
        <button onClick={fetchShifts}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-gray-900 border border-gray-800 px-3 py-2 rounded-xl transition-colors">
          <MdRefresh className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Active Shifts</p>
          <p className={`text-2xl font-bold ${activeShifts > 0 ? 'text-amber-400' : 'text-white'}`}>{activeShifts}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Total Shifts</p>
          <p className="text-2xl font-bold text-white">{shifts.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Total Sales</p>
          <p className="text-2xl font-bold text-green-400">{fmt(totalSales)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-purple-400">{totalOrders}</p>
        </div>
      </div>

      {/* Date filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo('') }}
            className="text-sm text-gray-400 hover:text-white transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <MdAccessTime className="text-4xl text-gray-700" />
            <p className="text-gray-500 text-sm">No shifts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Cashier','Start','End','Duration','Opening','Cash Sales','Card Sales','Discount','Net Sales','Expected','Difference','Orders','Status',''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {shifts.map(shift => {
                  const diff    = shift.cashDifference ?? 0
                  const isOver  = diff > 0
                  const isShort = diff < 0
                  const netSales = (shift.totalCashSales || 0) + (shift.totalCardSales || 0)
                  return (
                    <tr key={shift._id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                        {shift.cashier?.name || '—'}
                        <p className="text-gray-500 text-xs font-normal">{shift.cashier?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtDT(shift.startTime)}</td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtDT(shift.endTime)}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDuration(shift.startTime, shift.endTime)}</td>
                      <td className="px-4 py-3 text-gray-300">{fmt(shift.openingCash)}</td>
                      <td className="px-4 py-3 text-green-400 font-medium whitespace-nowrap">
                        {fmt(shift.totalCashSales)}
                        <span className="text-gray-600 text-xs ml-1">({shift.cashOrderCount ?? 0})</span>
                      </td>
                      <td className="px-4 py-3 text-blue-400 font-medium whitespace-nowrap">
                        {fmt(shift.totalCardSales)}
                        <span className="text-gray-600 text-xs ml-1">({shift.cardOrderCount ?? 0})</span>
                      </td>
                      <td className="px-4 py-3 text-amber-400 font-medium">
                        {shift.totalDiscount > 0 ? `- ${fmt(shift.totalDiscount)}` : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-purple-400 font-bold">{fmt(netSales)}</td>
                      <td className="px-4 py-3 text-gray-300">{fmt(shift.expectedCash)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {shift.status === 'active' ? (
                          <span className="text-gray-500">—</span>
                        ) : (
                          <span className={`flex items-center gap-1 font-semibold ${isOver ? 'text-green-400' : isShort ? 'text-red-400' : 'text-gray-400'}`}>
                            {isOver ? <MdTrendingUp className="text-base" />
                              : isShort ? <MdTrendingDown className="text-base" />
                              : <MdRemove className="text-base" />}
                            {isOver ? '+' : ''}{fmt(diff)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{shift.totalOrders}</td>
                      <td className="px-4 py-3">
                        {shift.status === 'active' ? (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Active</span>
                        ) : (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-700/50 text-gray-400 border border-gray-700">Closed</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {shift.status === 'closed' && (
                          <button
                            onClick={() => setViewShiftId(shift._id)}
                            className="text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Z-Report
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewShiftId && (
        <ZReportModal shiftId={viewShiftId} onClose={() => setViewShiftId(null)} />
      )}
    </div>
  )
}
