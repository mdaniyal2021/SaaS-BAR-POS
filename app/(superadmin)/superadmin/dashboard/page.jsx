'use client'
import { useEffect, useState } from 'react'
import {
  MdStorefront,
  MdCheckCircle,
  MdCancel,
  MdWarning,
  MdPeople,
  MdRefresh,
} from 'react-icons/md'
import { FiClock } from 'react-icons/fi'

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors[color]}`}>
          <Icon className="text-xl" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-400 text-sm mt-0.5">{label}</p>
    </div>
  )
}

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

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/stats')
      const data = await res.json()
      if (data.success) setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">Overview</h2>
          <p className="text-gray-400 text-sm mt-0.5">All bars and system stats</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-xl transition-colors border border-gray-700"
        >
          <MdRefresh className="text-lg" />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MdStorefront} label="Total Bars" value={stats?.totalBars ?? 0} color="purple" />
        <StatCard icon={MdCheckCircle} label="Active Bars" value={stats?.activeBars ?? 0} color="green" />
        <StatCard icon={MdCancel} label="Expired" value={stats?.expiredBars ?? 0} color="red" />
        <StatCard icon={MdPeople} label="Total Staff" value={stats?.totalUsers ?? 0} color="blue" />
      </div>

      {/* Expiring Soon */}
      {stats?.expiringBars?.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MdWarning className="text-amber-400 text-xl" />
            <h3 className="text-amber-400 font-semibold text-sm">
              Subscriptions Expiring Soon ({stats.expiringBars.length})
            </h3>
          </div>
          <div className="space-y-2">
            {stats.expiringBars.map(bar => (
              <div key={bar._id} className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
                <span className="text-white text-sm font-medium">{bar.name}</span>
                <div className="flex items-center gap-1.5 text-amber-400 text-xs">
                  <FiClock />
                  <span>Expires {new Date(bar.subscription?.expiryDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent POS */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Recent POS</h3>
          <button
            onClick={() => window.location.href = '/superadmin/bars'}
            className="text-purple-400 hover:text-purple-300 text-xs transition-colors"
          >
            View All
          </button>
        </div>

        {stats?.recentBars?.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-500 text-sm">
            No bars created yet
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {stats?.recentBars?.map(bar => (
              <div key={bar._id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center">
                    <MdStorefront className="text-purple-400 text-sm" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{bar.name}</p>
                    <p className="text-gray-500 text-xs">{bar.email}</p>
                  </div>
                </div>
                <StatusBadge status={bar.isActive ? bar.subscription?.status : 'inactive'} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
