'use client'

import { useEffect, useState } from 'react'
import { MdRefresh, MdWarning, MdCheckCircle, MdError, MdHourglassEmpty, MdClose } from 'react-icons/md'

function StatusBadge({ status }) {
  const map = {
    active:   'bg-green-500/10 text-green-400 border-green-500/20',
    trial:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
    expired:  'bg-red-500/10 text-red-400 border-red-500/20',
    inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${map[status] ?? map.inactive}`}>
      {status}
    </span>
  )
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  const colors = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
  }
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl ${colors[toast.type]}`}>
      {toast.message}
      <button onClick={onClose} className="opacity-60 hover:opacity-100"><MdClose /></button>
    </div>
  )
}

function daysRemaining(expiryDate) {
  const diff = new Date(expiryDate) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const FILTERS = ['all', 'active', 'trial', 'expired', 'inactive']

export default function SubscriptionsPage() {
  const [bars, setBars] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [renewTarget, setRenewTarget] = useState(null)
  const [renewPlan, setRenewPlan] = useState('monthly')
  const [renewing, setRenewing] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchBars = async () => {
    setLoading(true)
    const res = await fetch('/api/superadmin/bars')
    const data = await res.json()
    if (data.success) setBars(data.bars)
    setLoading(false)
  }

  useEffect(() => { fetchBars() }, [])

  const getStatus = (bar) => bar.isActive ? bar.subscription?.status : 'inactive'

  const filtered = filter === 'all' ? bars : bars.filter(b => getStatus(b) === filter)

  const counts = {
    all:      bars.length,
    active:   bars.filter(b => getStatus(b) === 'active').length,
    trial:    bars.filter(b => getStatus(b) === 'trial').length,
    expired:  bars.filter(b => getStatus(b) === 'expired').length,
    inactive: bars.filter(b => getStatus(b) === 'inactive').length,
  }

  const handleRenew = async () => {
    setRenewing(true)
    const res = await fetch(`/api/superadmin/bars/${renewTarget._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'renew', plan: renewPlan }),
    })
    const data = await res.json()
    if (data.success) {
      showToast('Subscription renewed successfully.')
      setRenewTarget(null)
      fetchBars()
    } else {
      showToast(data.message, 'error')
    }
    setRenewing(false)
  }

  const statCards = [
    { label: 'Active',   key: 'active',   icon: MdCheckCircle,    color: 'text-green-400 bg-green-500/10 border-green-500/20' },
    { label: 'Trial',    key: 'trial',    icon: MdHourglassEmpty, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { label: 'Expired',  key: 'expired',  icon: MdError,          color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    { label: 'Inactive', key: 'inactive', icon: MdWarning,        color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="text-gray-400 text-sm mt-1">Monitor and manage bar subscription plans</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, key, icon: Icon, color }) => (
          <div key={key} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{label}</span>
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${color}`}>
                <Icon className="text-base" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{counts[key]}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-purple-600 text-white'
                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            {f} {f !== 'all' && <span className="ml-1 opacity-60">({counts[f]})</span>}
            {f === 'all' && <span className="ml-1 opacity-60">({counts.all})</span>}
          </button>
        ))}
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
                  {['POS', 'Plan', 'Status', 'Start Date', 'Expiry Date', 'Days Left', 'Action'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 text-sm py-10">No subscriptions found.</td>
                  </tr>
                )}
                {filtered.map(bar => {
                  const days = bar.subscription?.expiryDate ? daysRemaining(bar.subscription.expiryDate) : null
                  const status = getStatus(bar)
                  return (
                    <tr key={bar._id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">{bar.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{bar.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400 capitalize">{bar.subscription?.plan}</td>
                      <td className="px-6 py-4"><StatusBadge status={status} /></td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {bar.subscription?.startDate ? new Date(bar.subscription.startDate).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {bar.subscription?.expiryDate ? new Date(bar.subscription.expiryDate).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {days !== null ? (
                          <span className={`text-sm font-medium ${
                            days <= 0 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-gray-400'
                          }`}>
                            {days <= 0 ? 'Expired' : `${days}d`}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => { setRenewTarget(bar); setRenewPlan('monthly') }}
                          className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <MdRefresh className="text-sm" /> Renew
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Renew Modal */}
      {renewTarget && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Renew Subscription</h2>
              <button onClick={() => setRenewTarget(null)} className="text-gray-400 hover:text-white">
                <MdClose className="text-xl" />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-5">
              Renewing subscription for <span className="text-white font-medium">{renewTarget.name}</span>
            </p>

            <div className="space-y-3 mb-6">
              {[
                { value: 'monthly', label: 'Monthly', desc: '30 days access' },
                { value: 'yearly',  label: 'Yearly',  desc: '365 days access' },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    renewPlan === value
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={value}
                    checked={renewPlan === value}
                    onChange={() => setRenewPlan(value)}
                    className="accent-purple-500"
                  />
                  <div>
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRenewTarget(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenew}
                disabled={renewing}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {renewing ? 'Renewing...' : 'Confirm Renew'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
