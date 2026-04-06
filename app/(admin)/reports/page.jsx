'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MdAttachMoney, MdShoppingCart, MdTrendingUp,
  MdCreditCard, MdLocalAtm, MdBarChart,
  MdRefresh, MdReceiptLong, MdStar,
} from 'react-icons/md'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt   = (n) => `$${Number(n ?? 0).toFixed(2)}`
const fmtDt = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtTm = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }) {
  const cls = {
    green:  'bg-green-500/10  border-green-500/20  text-green-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    blue:   'bg-blue-500/10   border-blue-500/20   text-blue-400',
    amber:  'bg-amber-500/10  border-amber-500/20  text-amber-400',
  }[color]
  return (
    <div className={`${cls} border rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <Icon className={`text-xl ${cls.split(' ')[2]}`} />
      </div>
      <p className={`text-2xl font-bold ${cls.split(' ')[2]}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ data, range }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.revenue), 1)

  // Show fewer labels when range is large
  const showEvery = range <= 7 ? 1 : range <= 30 ? 5 : 10

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-semibold text-sm">Daily Revenue</h2>
          <p className="text-gray-500 text-xs mt-0.5">Last {range} days</p>
        </div>
        <MdTrendingUp className="text-purple-400 text-xl" />
      </div>

      <div className="flex items-end gap-1 h-36">
        {data.map((day, i) => {
          const pct     = max > 0 ? (day.revenue / max) * 100 : 0
          const isToday = i === data.length - 1
          const showLabel = i % showEvery === 0 || isToday

          return (
            <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-1 group relative min-w-0">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs whitespace-nowrap">
                  <p className="text-white font-medium">{fmt(day.revenue)}</p>
                  <p className="text-gray-400">{day.orders} orders</p>
                </div>
                <div className="w-2 h-2 bg-gray-800 border-r border-b border-gray-700 rotate-45 -mt-1" />
              </div>

              <div className="w-full flex items-end" style={{ height: '120px' }}>
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${isToday ? 'bg-purple-500' : 'bg-gray-700 group-hover:bg-purple-600/60'}`}
                  style={{ height: `${Math.max(pct, day.revenue > 0 ? 3 : 0)}%` }}
                />
              </div>

              {showLabel && (
                <span className={`text-xs truncate w-full text-center ${isToday ? 'text-purple-400 font-medium' : 'text-gray-600'}`}>
                  {day.label.split(' ')[0]}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Reports Page ────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [range,   setRange]   = useState('7')   // days
  const [error,   setError]   = useState(null)

  const fetchReports = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/reports?range=${range}`)
      const data = await res.json()
      if (data.success) setStats(data.stats)
      else setError(data.message)
    } catch {
      setError('Failed to load reports')
    } finally { setLoading(false) }
  }, [range])

  useEffect(() => { fetchReports() }, [fetchReports])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 text-sm mt-1">Sales analytics and revenue tracking</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
            {[['7', '7 Days'], ['30', '30 Days'], ['90', '90 Days']].map(([val, label]) => (
              <button key={val} onClick={() => setRange(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${range === val ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={fetchReports}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-900 border border-gray-800 px-3 py-2 rounded-xl transition-colors">
            <MdRefresh className="text-base" /> Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-5 py-4 rounded-2xl">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && stats && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Revenue"   value={fmt(stats.totalRevenue)}              sub={`${stats.totalOrders} orders`}   icon={MdAttachMoney}  color="green"  />
            <StatCard label="Total Orders"    value={stats.totalOrders}                    sub={`Avg ${fmt(stats.avgOrderValue)}`} icon={MdShoppingCart} color="purple" />
            <StatCard label="Tax Collected"   value={fmt(stats.totalTax)}                  sub="VAT / Tax"                        icon={MdBarChart}     color="blue"   />
            <StatCard label="Total Discounts" value={fmt(stats.totalDiscount)}             sub="Given to customers"               icon={MdTrendingUp}   color="amber"  />
          </div>

          {/* Payment breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                <MdLocalAtm className="text-green-400 text-xl" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium">Cash Orders</p>
                <p className="text-white text-xl font-bold mt-0.5">{stats.paymentBreakdown.cash.count}</p>
                <p className="text-green-400 text-xs">{fmt(stats.paymentBreakdown.cash.revenue)}</p>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                <MdCreditCard className="text-blue-400 text-xl" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium">Card Orders</p>
                <p className="text-white text-xl font-bold mt-0.5">{stats.paymentBreakdown.card.count}</p>
                <p className="text-blue-400 text-xs">{fmt(stats.paymentBreakdown.card.revenue)}</p>
              </div>
            </div>
          </div>

          {/* Chart + Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <BarChart data={stats.dailyChart} range={parseInt(range)} />
            </div>

            {/* Top Products */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold text-sm">Top Products</h2>
                <MdStar className="text-amber-400 text-xl" />
              </div>
              {stats.topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <MdBarChart className="text-3xl text-gray-700" />
                  <p className="text-gray-500 text-xs">No sales data yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.topProducts.map((p, i) => {
                    const maxRevenue = stats.topProducts[0].revenue
                    const pct = maxRevenue > 0 ? (p.revenue / maxRevenue) * 100 : 0
                    return (
                      <div key={p.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-gray-600 text-xs font-mono w-4 shrink-0">#{i + 1}</span>
                            <span className="text-white text-xs font-medium truncate">{p.name}</span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-purple-400 text-xs font-bold">{fmt(p.revenue)}</p>
                            <p className="text-gray-600 text-xs">{p.qty} sold</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full">
                          <div className="h-full bg-purple-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Recent Orders</h2>
              <span className="text-gray-500 text-xs">Last {stats.recentOrders.length} orders</span>
            </div>
            {stats.recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <MdReceiptLong className="text-3xl text-gray-700" />
                <p className="text-gray-500 text-sm">No orders in this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {['Order #', 'Items', 'Discount', 'Tax', 'Method', 'Date', 'Total'].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {stats.recentOrders.map(order => (
                      <tr key={order._id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-5 py-3 text-purple-400 text-sm font-medium font-mono">{order.orderNumber}</td>
                        <td className="px-5 py-3 text-sm text-gray-400">{order.itemCount}</td>
                        <td className="px-5 py-3 text-sm text-green-400">
                          {order.discount > 0 ? `-${fmt(order.discount)}` : '—'}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-400">{fmt(order.tax)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full border capitalize ${
                            order.paymentMethod === 'cash'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-blue-500/10  text-blue-400  border-blue-500/20'
                          }`}>
                            {order.paymentMethod}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-400">
                          {fmtDt(order.createdAt)}
                          <span className="text-gray-600 ml-1">{fmtTm(order.createdAt)}</span>
                        </td>
                        <td className="px-5 py-3 text-sm font-bold text-white">{fmt(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}