import { useState, useEffect, useCallback } from 'react'
import Layout      from '../../components/Layout'
import RevenueBar  from './RevenueBar'
import { supabase, FARM_ID } from '../../lib/supabase'
import { formatZAR, formatDate } from '../../lib/utils'

// ── Period helpers ─────────────────────────────────────────────────
const PERIODS = [
  { label: 'This Month',    key: 'this-month'    },
  { label: 'Last Month',    key: 'last-month'    },
  { label: 'Last 3 Months', key: 'last-3-months' },
  { label: 'This Year',     key: 'this-year'     },
]

function getPeriodRange(key) {
  const now   = new Date()
  const y     = now.getFullYear()
  const m     = now.getMonth()

  switch (key) {
    case 'this-month':
      return {
        start: new Date(y, m, 1).toISOString().slice(0, 10),
        end:   new Date(y, m + 1, 0).toISOString().slice(0, 10),
      }
    case 'last-month': {
      const lm = m === 0 ? 11 : m - 1
      const ly = m === 0 ? y - 1 : y
      return {
        start: new Date(ly, lm, 1).toISOString().slice(0, 10),
        end:   new Date(ly, lm + 1, 0).toISOString().slice(0, 10),
      }
    }
    case 'last-3-months':
      return {
        start: new Date(y, m - 2, 1).toISOString().slice(0, 10),
        end:   new Date(y, m + 1, 0).toISOString().slice(0, 10),
      }
    case 'this-year':
    default:
      return {
        start: `${y}-01-01`,
        end:   `${y}-12-31`,
      }
  }
}

/**
 * Module 7: Profitability per Section Dashboard
 *
 * Aggregates data from all modules into one at-a-glance view:
 *   – Revenue & income (market module)
 *   – Input costs    (inventory module)
 *   – Labour summary (activity module)
 *   – Field health   (scouting module)
 *   – Nursery status (nursery module)
 *   – Per-section breakdown
 */
export default function DashboardPage() {
  const [period,    setPeriod]    = useState('this-month')
  const [data,      setData]      = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const { start, end } = getPeriodRange(period)

    try {
      // Run all queries in parallel
      const [
        deliveriesRes,
        activitiesRes,
        scoutingRes,
        nurseryRes,
        inventoryUsageRes,
        inventoryRes,
        sectionsRes,
      ] = await Promise.all([
        // Market: deliveries + batches for the period
        supabase
          .from('market_deliveries')
          .select('product_name, market_batches(quantity_sold, net_income, gross_amount, market_commission_amount, agent_commission_amount, vat_on_commissions, bank_charge)')
          .eq('farm_id', FARM_ID)
          .gte('delivery_date', start)
          .lte('delivery_date', end),

        // Activities for the period
        supabase
          .from('activities')
          .select('section_id, task_type, duration_minutes, status, start_time, sections!inner(farm_id)')
          .eq('sections.farm_id', FARM_ID)
          .gte('start_time', `${start}T00:00:00`)
          .lte('start_time', `${end}T23:59:59`),

        // Open scouting observations (not period-filtered — always current)
        supabase
          .from('scouting_observations')
          .select('section_id, severity, sections!inner(farm_id)')
          .eq('sections.farm_id', FARM_ID)
          .eq('resolved', false),

        // Active nursery trays (no transplant date)
        supabase
          .from('nursery_trays')
          .select('section_id, tray_count, crop_name, sections!inner(farm_id)')
          .eq('sections.farm_id', FARM_ID)
          .is('actual_transplant_date', null),

        // Inventory usage for the period
        supabase
          .from('inventory_usage')
          .select('inventory_id, quantity_used, used_at, inventory!inner(farm_id)')
          .eq('inventory.farm_id', FARM_ID)
          .gte('used_at', `${start}T00:00:00`)
          .lte('used_at', `${end}T23:59:59`),

        // Inventory items (for cost_per_unit)
        supabase
          .from('inventory')
          .select('id, item_name, cost_per_unit')
          .eq('farm_id', FARM_ID),

        // Sections
        supabase
          .from('sections')
          .select('id, name')
          .eq('farm_id', FARM_ID)
          .order('name'),
      ])

      // Check for errors
      const errs = [deliveriesRes, activitiesRes, scoutingRes, nurseryRes,
                    inventoryUsageRes, inventoryRes, sectionsRes]
        .filter(r => r.error).map(r => r.error.message)
      if (errs.length) throw new Error(errs[0])

      // ── Aggregate market revenue by crop ──────────────────────────
      const cropRevenue = {}
      for (const d of deliveriesRes.data ?? []) {
        const crop = d.product_name
        if (!cropRevenue[crop]) cropRevenue[crop] = { netIncome: 0, kgSold: 0, grossAmount: 0 }
        for (const b of d.market_batches ?? []) {
          cropRevenue[crop].netIncome   += Number(b.net_income)   || 0
          cropRevenue[crop].kgSold      += Number(b.quantity_sold) || 0
          cropRevenue[crop].grossAmount += Number(b.gross_amount)  || 0
        }
      }

      const totalNetIncome  = Object.values(cropRevenue).reduce((s, c) => s + c.netIncome, 0)
      const totalKgSold     = Object.values(cropRevenue).reduce((s, c) => s + c.kgSold, 0)
      const totalGross      = Object.values(cropRevenue).reduce((s, c) => s + c.grossAmount, 0)
      const cropList        = Object.entries(cropRevenue)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.netIncome - a.netIncome)

      // ── Inventory cost ──────────────────────────────────────────
      const costMap = {}
      for (const item of inventoryRes.data ?? []) {
        costMap[item.id] = Number(item.cost_per_unit) || 0
      }
      const totalInputCost = (inventoryUsageRes.data ?? []).reduce((sum, u) => {
        return sum + (Number(u.quantity_used) || 0) * (costMap[u.inventory_id] || 0)
      }, 0)

      const estimatedProfit = totalNetIncome - totalInputCost

      // ── Activities ─────────────────────────────────────────────
      const acts = activitiesRes.data ?? []
      const totalActivities    = acts.length
      const completedActivities= acts.filter(a => a.status === 'Completed').length
      const totalMinutes       = acts.reduce((s, a) => s + (Number(a.duration_minutes) || 0), 0)

      // ── Per-section aggregation ───────────────────────────────
      const sections = sectionsRes.data ?? []
      const sectionMap = {}
      for (const s of sections) {
        sectionMap[s.id] = {
          id:             s.id,
          name:           s.name,
          activityCount:  0,
          minutesWorked:  0,
          openScouting:   0,
          highScouting:   0,
          activeTrays:    0,
        }
      }

      for (const a of acts) {
        if (sectionMap[a.section_id]) {
          sectionMap[a.section_id].activityCount++
          sectionMap[a.section_id].minutesWorked += Number(a.duration_minutes) || 0
        }
      }
      for (const o of scoutingRes.data ?? []) {
        if (sectionMap[o.section_id]) {
          sectionMap[o.section_id].openScouting++
          if (o.severity === 'High') sectionMap[o.section_id].highScouting++
        }
      }
      for (const t of nurseryRes.data ?? []) {
        if (sectionMap[t.section_id]) {
          sectionMap[t.section_id].activeTrays += Number(t.tray_count) || 0
        }
      }

      const sectionList = Object.values(sectionMap)
        .filter(s => s.activityCount > 0 || s.openScouting > 0 || s.activeTrays > 0)
        .sort((a, b) => b.activityCount - a.activityCount)

      // ── Scouting totals ───────────────────────────────────────
      const totalOpenScouting = (scoutingRes.data ?? []).length
      const highScouting      = (scoutingRes.data ?? []).filter(o => o.severity === 'High').length
      const totalActiveTrays  = (nurseryRes.data ?? []).reduce((s, t) => s + (Number(t.tray_count) || 0), 0)

      setData({
        start, end,
        totalNetIncome, totalKgSold, totalGross, totalInputCost, estimatedProfit,
        cropList,
        totalActivities, completedActivities, totalMinutes,
        sectionList,
        totalOpenScouting, highScouting,
        totalActiveTrays,
      })
    } catch (err) {
      setError(err.message || 'Could not load dashboard data.')
    }

    setIsLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Layout title="Dashboard">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* Period selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PERIODS.map(({ label, key }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={[
                'text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 transition-colors',
                period === key
                  ? 'bg-nebula-600 border-nebula-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-3xl mb-2 animate-pulse">📊</p>
            <p className="text-sm">Loading dashboard…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
            <button onClick={load} className="ml-2 underline font-medium">Retry</button>
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* ── Revenue & Profit banner ─────────────────────── */}
            <div className="rounded-2xl bg-nebula-600 text-white p-4 space-y-3">
              <p className="text-nebula-200 text-xs font-semibold uppercase tracking-wide">
                Revenue · {formatDate(data.start)} – {formatDate(data.end)}
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold font-mono">{formatZAR(data.totalNetIncome)}</p>
                  <p className="text-nebula-300 text-xs mt-0.5">
                    {data.totalKgSold.toFixed(0)} kg · gross {formatZAR(data.totalGross)}
                  </p>
                </div>
                <span className="text-4xl opacity-40">📊</span>
              </div>

              {/* Profit estimate */}
              <div className="border-t border-nebula-500 pt-3 grid grid-cols-2 gap-3">
                <StatChip
                  label="Input costs"
                  value={formatZAR(data.totalInputCost)}
                  sub="from inventory"
                  colour="text-red-200"
                />
                <StatChip
                  label="Est. profit"
                  value={formatZAR(data.estimatedProfit)}
                  sub="net − inputs"
                  colour={data.estimatedProfit >= 0 ? 'text-nebula-200' : 'text-red-200'}
                />
              </div>
            </div>

            {/* ── Crop revenue breakdown ──────────────────────── */}
            {data.cropList.length > 0 && (
              <div className="card space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">Revenue by Crop</h2>
                {data.cropList.map((crop, i) => (
                  <RevenueBar
                    key={crop.name}
                    label={crop.name}
                    value={crop.netIncome}
                    kgSold={crop.kgSold}
                    maxValue={data.cropList[0].netIncome}
                    rank={i}
                  />
                ))}
              </div>
            )}

            {/* ── Operations summary ──────────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
              <SummaryTile
                icon="⚡"
                value={data.totalActivities}
                label="Activities"
                sub={`${data.completedActivities} done`}
              />
              <SummaryTile
                icon="⏱️"
                value={Math.round(data.totalMinutes / 60)}
                label="Hours worked"
                sub={`${data.totalMinutes} min`}
              />
              <SummaryTile
                icon="🔍"
                value={data.totalOpenScouting}
                label="Open alerts"
                sub={data.highScouting > 0 ? `${data.highScouting} high` : 'none high'}
                alert={data.highScouting > 0}
              />
            </div>

            {/* Nursery */}
            {data.totalActiveTrays > 0 && (
              <div className="rounded-xl bg-nebula-50 border border-nebula-100 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-nebula-700 uppercase tracking-wide">Nursery</p>
                  <p className="text-2xl font-bold font-mono text-nebula-800 mt-0.5">{data.totalActiveTrays}</p>
                  <p className="text-xs text-nebula-600">active trays in nursery</p>
                </div>
                <span className="text-4xl opacity-50">🌿</span>
              </div>
            )}

            {/* ── Per-section breakdown ───────────────────────── */}
            {data.sectionList.length > 0 && (
              <div className="card space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">By Section</h2>
                <div className="divide-y divide-gray-100">
                  {data.sectionList.map((s) => (
                    <div key={s.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900 text-sm">Section {s.name}</p>
                        {s.highScouting > 0 && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            {s.highScouting} high alert{s.highScouting !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <MiniStat value={s.activityCount} label="activities" />
                        <MiniStat value={Math.round(s.minutesWorked / 60)} label="hrs worked" />
                        <MiniStat
                          value={s.openScouting}
                          label="open issues"
                          alert={s.openScouting > 0}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for no data */}
            {data.totalNetIncome === 0 && data.totalActivities === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">🌱</p>
                <p className="text-sm font-medium">No data for this period</p>
                <p className="text-xs mt-1">Record activities and market deliveries to see your dashboard</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

// ── Small reusable display components ─────────────────────────────

function StatChip({ label, value, sub, colour }) {
  return (
    <div>
      <p className="text-xs text-nebula-300 font-semibold">{label}</p>
      <p className={`text-lg font-bold font-mono ${colour}`}>{value}</p>
      <p className="text-nebula-400 text-xs">{sub}</p>
    </div>
  )
}

function SummaryTile({ icon, value, label, sub, alert }) {
  return (
    <div className={[
      'rounded-2xl p-3 text-center',
      alert ? 'bg-red-50 border border-red-100' : 'bg-gray-50',
    ].join(' ')}>
      <p className="text-2xl">{icon}</p>
      <p className={['text-xl font-bold font-mono mt-1', alert ? 'text-red-700' : 'text-gray-900'].join(' ')}>
        {value}
      </p>
      <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}

function MiniStat({ value, label, alert }) {
  return (
    <div className={['rounded-lg py-1.5 px-1', alert ? 'bg-red-50' : 'bg-gray-50'].join(' ')}>
      <p className={['text-sm font-bold', alert ? 'text-red-700' : 'text-gray-800'].join(' ')}>
        {value}
      </p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}
