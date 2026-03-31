'use client'

import { useEffect, useState } from 'react'
import { MdStorefront, MdCheckCircle, MdError, MdPeople, MdWarning } from 'react-icons/md'

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green:  'bg-green-500/10  text-green-400  border-green-500/20',
    red:    'bg-red-500/10    text-red-400    border-red-500/20',
    blue:   'bg-blue-500/10   text-blue-400   border-blue-500/20',
  }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${colors[color]}`}>
          <Icon className="text-lg" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value ?? '—'}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    active:   'bg-green-500/10  text-green-400  border-green-500/20',
    trial:    'bg-amber-500/10  text-amber-400  border-amber-500/20',
    expired:  'bg-red-500/10    text-red-400    border-red-500/20',
    inactive: 'bg-gray-500/10   text-gray-400   border-gray-500/20',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${map[status] ?? map.inactive}`}>
      {status}
    </span>
  )
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/superadmin/stats')
      .then(r => r.json())
      .then(data => { if (data.success) setStats(data.stats) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Overview of all bars and subscriptions</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Bars"    value={stats?.totalBars}   icon={MdStorefront}   color="purple" />
        <StatCard label="Active Bars"   value={stats?.activeBars}  icon={MdCheckCircle}  color="green"  />
        <StatCard label="Expired Bars"  value={stats?.expiredBars} icon={MdError}        color="red"    />
        <StatCard label="Total Users"   value={stats?.totalUsers}  icon={MdPeople}       color="blue"   />
      </div>

      {/* Expiring soon */}
      {stats?.expiringBars?.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MdWarning className="text-amber-400 text-xl" />
            <h2 className="text-amber-400 font-semibold text-sm">Expiring Within 7 Days</h2>
          </div>
          <div className="space-y-2">
            {stats.expiringBars.map(bar => (
              <div key={bar._id} className="flex items-center justify-between text-sm">
                <span className="text-white">{bar.name}</span>
                <span className="text-amber-400">
                  {new Date(bar.subscription.expiryDate).toLocaleDateString('en-GB')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent bars */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Recent Bars</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Bar Name</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Email</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Plan</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {stats?.recentBars?.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 text-sm py-8">No bars yet.</td>
                </tr>
              )}
              {stats?.recentBars?.map(bar => (
                <tr key={bar._id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-white font-medium">{bar.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{bar.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-400 capitalize">{bar.subscription?.plan}</td>
                  <td className="px-6 py-4"><StatusBadge status={bar.subscription?.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(bar.createdAt).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
