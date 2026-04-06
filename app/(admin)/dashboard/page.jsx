'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MdAttachMoney, MdShoppingCart, MdInventory,
  MdPeople, MdTrendingUp, MdWarning,
  MdCreditCard, MdLocalAtm, MdStorefront,
  MdCategory, MdRefresh,
} from 'react-icons/md'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n ?? 0)

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }) {
  const styles = {
    purple: { wrap: 'bg-purple-500/10 border-purple-500/20', icon: 'text-purple-400', val: 'text-purple-400' },
    green:  { wrap: 'bg-green-500/10  border-green-500/20',  icon: 'text-green-400',  val: 'text-green-400'  },
    blue:   { wrap: 'bg-blue-500/10   border-blue-500/20',   icon: 'text-blue-400',   val: 'text-blue-400'   },
    amber:  { wrap: 'bg-amber-500/10  border-amber-500/20',  icon: 'text-amber-400',  val: 'text-amber-400'  },
  }
  const s = styles[color] ?? styles.purple

  return (
    <div className={`${s.wrap} border rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${s.wrap} border flex items-center justify-center`}>
          <Icon className={`text-lg ${s.icon}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${s.val}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────
function WeeklyChart({ data }) {
  if (!data || data.length === 0) return null

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-semibold text-sm">Revenue — Last 7 Days</h2>
          <p className="text-gray-500 text-xs mt-0.5">Daily sales overview</p>
        </div>
        <MdTrendingUp className="text-purple-400 text-xl" />
      </div>

      <div className="flex items-end gap-2 h-32">
        {data.map((day, i) => {
          const heightPct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
          const isToday   = i === data.length - 1

          return (
            <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-1.5 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <p className="text-white font-medium">{fmt(day.revenue)}</p>
                  <p className="text-gray-400">{day.orders} orders</p>
                </div>
                <div className="w-2 h-2 bg-gray-800 border-r border-b border-gray-700 rotate-45 -mt-1" />
              </div>

              {/* Bar */}
              <div className="w-full flex items-end" style={{ height: '100px' }}>
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    isToday ? 'bg-purple-500' : 'bg-gray-700 group-hover:bg-purple-600/60'
                  }`}
                  style={{ height: `${Math.max(heightPct, day.revenue > 0 ? 4 : 0)}%` }}
                />
              </div>

              {/* Label */}
              <span className={`text-xs ${isToday ? 'text-purple-400 font-medium' : 'text-gray-500'}`}>
                {day.label.split(' ')[0]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/dashboard')
      const data = await res.json()
      if (data.success) setStats(data.stats)
      else setError(data.message)
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          <MdRefresh /> Try Again
        </button>
      </div>
    )
  }

  const { today, month, counts, weeklyChart, lowStock, recentOrders } = stats

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white bg-gray-900 border border-gray-800 hover:border-gray-700 px-3 py-2 rounded-xl transition-colors"
        >
          <MdRefresh className="text-base" /> Refresh
        </button>
      </div>

      {/* ── Today stat cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Revenue"
          value={fmt(today.revenue)}
          sub={`${today.orders} orders today`}
          icon={MdAttachMoney}
          color="green"
        />
        <StatCard
          label="Today's Orders"
          value={today.orders}
          sub={`Cash: ${today.cashOrders} · Card: ${today.cardOrders}`}
          icon={MdShoppingCart}
          color="purple"
        />
        <StatCard
          label="Month Revenue"
          value={fmt(month.revenue)}
          sub={`${month.orders} orders this month`}
          icon={MdTrendingUp}
          color="blue"
        />
        <StatCard
          label="Active Staff"
          value={counts.staff}
          sub={`${counts.products} products · ${counts.categories} categories`}
          icon={MdPeople}
          color="amber"
        />
      </div>

      {/* ── Payment method breakdown ─────────────────────────────────────────── */}
      {/* <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center shrink-0">
            <MdLocalAtm className="text-green-400 text-xl" />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium">Cash Orders Today</p>
            <p className="text-white text-xl font-bold mt-0.5">{today.cashOrders}</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
            <MdCreditCard className="text-blue-400 text-xl" />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium">Card Orders Today</p>
            <p className="text-white text-xl font-bold mt-0.5">{today.cardOrders}</p>
          </div>
        </div>
      </div> */}

      {/* ── Chart + Low Stock ────────────────────────────────────────────────── */}
      {/* 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="lg:col-span-2">
          <WeeklyChart data={weeklyChart} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Low Stock Alert</h2>
            <MdWarning className="text-amber-400 text-xl" />
          </div>

          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2">
              <MdInventory className="text-3xl text-gray-700" />
              <p className="text-gray-500 text-xs">All products well stocked</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStock.map(product => (
                <div key={product._id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{product.name}</p>
                    <p className="text-gray-500 text-xs">
                      Alert at {product.lowStockAlert} {product.unit}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    product.stock === 0
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {product.stock} {product.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Products', value: counts.products, icon: MdStorefront, color: 'purple' },
          { label: 'Categories', value: counts.categories, icon: MdCategory, color: 'blue' },
          { label: 'Active Cashiers', value: counts.staff, icon: MdPeople, color: 'green' },
        ].map(({ label, value, icon: Icon, color }) => {
          const cls = {
            purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      green: 'bg-green-500/10 border-green-500/20 text-green-400',
    }[color]

    return (
      <div key={label} className={`${cls} border rounded-2xl p-4 flex items-center gap-3`}>
        <Icon className="text-2xl shrink-0" />
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-lg font-bold text-white">{value}</p>
        </div>
      </div>
    )
  })}
</div>
*/}

      {/* ── Recent Orders ────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Recent Orders</h2>
          <span className="text-gray-500 text-xs">Last 5 orders</span>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <MdShoppingCart className="text-3xl text-gray-700" />
            <p className="text-gray-500 text-sm">No orders yet — start selling from POS</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Order #', 'Items', 'Cashier', 'Method', 'Time', 'Total'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentOrders.map(order => (
                  <tr key={order._id} className="hover:bg-gray-800/40 transition-colors">

                    {/* Order number */}
                    <td className="px-5 py-3">
                      <span className="text-purple-400 text-sm font-medium font-mono">
                        {order.orderNumber}
                      </span>
                    </td>

                    {/* Items count */}
                    <td className="px-5 py-3 text-sm text-gray-400">
                      {order.items?.length ?? 0} item{order.items?.length !== 1 ? 's' : ''}
                    </td>

                    {/* Cashier */}
                    <td className="px-5 py-3 text-sm text-gray-400">
                      {order.cashier?.name ?? '—'}
                    </td>

                    {/* Payment method */}
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border capitalize ${
                        order.paymentMethod === 'cash'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-blue-500/10  text-blue-400  border-blue-500/20'
                      }`}>
                        {order.paymentMethod}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="px-5 py-3 text-sm text-gray-400">
                      <span>{fmtDate(order.createdAt)}</span>
                      <span className="text-gray-600 ml-1">{fmtTime(order.createdAt)}</span>
                    </td>

                    {/* Total */}
                    <td className="px-5 py-3 text-sm font-semibold text-white">
                      {fmt(order.total)}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}