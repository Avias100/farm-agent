import { useState, useEffect, useCallback } from 'react'
import Layout       from '../../components/Layout'
import Button       from '../../components/ui/Button'
import DeliveryCard from './DeliveryCard'
import DeliveryForm from './DeliveryForm'
import { supabase, FARM_ID } from '../../lib/supabase'
import { formatZAR } from '../../lib/utils'

/**
 * Module 3: JHB Market Delivery & Batch Sales
 *
 * This is a manager-level module — no offline queue needed.
 * All data is read from and written to Supabase directly.
 *
 * Page layout:
 *   ┌───────────────────────────────┐
 *   │  This month summary banner    │  ← total net income, kg sold
 *   ├───────────────────────────────┤
 *   │  [+ New Delivery] button      │
 *   │  DeliveryForm (if open)       │
 *   ├───────────────────────────────┤
 *   │  DeliveryCard × N             │
 *   │    → collapsed: date/product/net│
 *   │    → expanded: batches detail  │
 *   └───────────────────────────────┘
 */
export default function MarketPage() {
  const [deliveries,       setDeliveries]       = useState([])
  const [isLoading,        setIsLoading]        = useState(true)
  const [showForm,         setShowForm]         = useState(false)
  const [error,            setError]            = useState(null)

  const loadDeliveries = useCallback(async () => {
    setError(null)
    const { data, error: supaError } = await supabase
      .from('market_deliveries')
      .select(`
        *,
        market_batches (
          id, batch_number, quantity_sold, price_per_unit,
          gross_amount, market_commission_amount, agent_commission_amount,
          vat_on_commissions, bank_charge, net_income,
          market_commission_rate, agent_commission_rate, vat_rate,
          sold_at
        )
      `)
      .eq('farm_id', FARM_ID)
      .order('delivery_date', { ascending: false })

    if (supaError) {
      setError('Could not load deliveries. Check your connection.')
    } else {
      // Sort batches within each delivery by batch_number
      const sorted = (data ?? []).map((d) => ({
        ...d,
        market_batches: [...(d.market_batches ?? [])].sort(
          (a, b) => a.batch_number - b.batch_number
        ),
      }))
      setDeliveries(sorted)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadDeliveries()
  }, [loadDeliveries])

  function handleDeliverySaved(delivery) {
    setShowForm(false)
    // Prepend the new delivery (it has an empty market_batches array)
    setDeliveries((prev) => [{ ...delivery, market_batches: [] }, ...prev])
  }

  // ── Month summary ─────────────────────────────────────────────
  const now       = new Date()
  const thisMonth = now.toLocaleString('en-ZA', { month: 'long', year: 'numeric' })

  const monthDeliveries = deliveries.filter((d) => {
    const dd = new Date(d.delivery_date)
    return dd.getMonth() === now.getMonth() && dd.getFullYear() === now.getFullYear()
  })

  const monthNetIncome = monthDeliveries
    .flatMap((d) => d.market_batches)
    .reduce((sum, b) => sum + (Number(b.net_income) || 0), 0)

  const monthKgSold = monthDeliveries
    .flatMap((d) => d.market_batches)
    .reduce((sum, b) => sum + (Number(b.quantity_sold) || 0), 0)

  // ── Render ────────────────────────────────────────────────────
  return (
    <Layout title="Market Deliveries">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* Month summary banner */}
        {!isLoading && monthDeliveries.length > 0 && (
          <div className="rounded-2xl bg-nebula-600 text-white p-4">
            <p className="text-nebula-200 text-xs font-semibold uppercase tracking-wide mb-1">
              {thisMonth}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold font-mono">{formatZAR(monthNetIncome)}</p>
                <p className="text-nebula-300 text-xs mt-0.5">
                  {monthKgSold.toFixed(0)} kg sold · {monthDeliveries.length} deliver{monthDeliveries.length === 1 ? 'y' : 'ies'}
                </p>
              </div>
              <span className="text-4xl opacity-40">📦</span>
            </div>
          </div>
        )}

        {/* New delivery trigger */}
        {!showForm && (
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon="🚛"
            onClick={() => setShowForm(true)}
          >
            Record New Delivery
          </Button>
        )}

        {/* New delivery form */}
        {showForm && (
          <DeliveryForm
            onSaved={handleDeliverySaved}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
            <button
              onClick={loadDeliveries}
              className="ml-2 underline font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm">Loading deliveries…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && deliveries.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">🌽</p>
            <p className="text-sm font-medium">No deliveries recorded yet</p>
            <p className="text-xs mt-1">Tap "Record New Delivery" to get started</p>
          </div>
        )}

        {/* Delivery cards */}
        {deliveries.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
              All Deliveries
            </h2>
            {deliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onUpdated={loadDeliveries}
              />
            ))}
          </section>
        )}
      </div>
    </Layout>
  )
}
