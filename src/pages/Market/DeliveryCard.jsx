import { useState } from 'react'
import Badge           from '../../components/ui/Badge'
import Button          from '../../components/ui/Button'
import BatchForm       from './BatchForm'
import IncomeCalculator from './IncomeCalculator'
import { formatZAR, formatDate } from '../../lib/utils'
import { supabase } from '../../lib/supabase'

/**
 * Expandable card for a single market delivery.
 *
 * Collapsed view (always visible):
 *   Date · Product · Qty sent/received
 *   Total net income across all batches
 *
 * Expanded view (tap to open):
 *   Gate stamp · Producer ref · Notes
 *   Each batch: qty × price → net income breakdown
 *   [+ Add Batch] button
 *
 * Props:
 *   delivery  — delivery row from Supabase (includes market_batches array)
 *   onUpdated — () => void — called after a new batch is added, triggers reload
 */
export default function DeliveryCard({ delivery, onUpdated }) {
  const [expanded,    setExpanded]    = useState(false)
  const [addingBatch, setAddingBatch] = useState(false)
  const [isDeleting,  setIsDeleting]  = useState(false)

  const batches       = delivery.market_batches ?? []
  const totalNetIncome = batches.reduce((s, b) => s + (Number(b.net_income) || 0), 0)
  const totalKgSold    = batches.reduce((s, b) => s + (Number(b.quantity_sold) || 0), 0)

  function handleBatchSaved(batch) {
    setAddingBatch(false)
    onUpdated()
  }

  async function handleDelete() {
    if (!confirm(`Delete delivery of ${delivery.product_name}? This will also delete all ${batches.length} batch(es). This cannot be undone.`)) return
    
    setIsDeleting(true)
    const { error } = await supabase
      .from('market_deliveries')
      .delete()
      .eq('id', delivery.id)
    
    if (error) {
      alert('Failed to delete: ' + error.message)
      setIsDeleting(false)
    } else {
      onUpdated()
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ── COLLAPSED HEADER ─────────────────────────────────── */}
      <button
        className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">
              {delivery.product_name}
              {delivery.variety ? ` (${delivery.variety})` : ''}
            </span>
            {batches.length > 0 && (
              <Badge variant="gray" size="sm">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</Badge>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(delivery.delivery_date)}
            {delivery.gate_stamp_number ? ` · Gate ${delivery.gate_stamp_number}` : ''}
          </p>

          {/* Quantities */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-600">
            {delivery.quantity_sent     != null && <span>Sent: <strong>{delivery.quantity_sent} kg</strong></span>}
            {delivery.quantity_received != null && <span>Rcvd: <strong>{delivery.quantity_received} kg</strong></span>}
            {delivery.quantity_unsold   != null && delivery.quantity_unsold > 0 && (
              <span className="text-amber-600">Unsold: {delivery.quantity_unsold} kg</span>
            )}
            {delivery.quantity_discarded != null && delivery.quantity_discarded > 0 && (
              <span className="text-red-500">Discarded: {delivery.quantity_discarded} kg</span>
            )}
          </div>
        </div>

        {/* Net income summary */}
        <div className="text-right flex-shrink-0">
          {batches.length > 0 ? (
            <>
              <p className={[
                'font-bold font-mono text-sm',
                totalNetIncome >= 0 ? 'text-nebula-700' : 'text-red-600',
              ].join(' ')}>
                {formatZAR(totalNetIncome)}
              </p>
              <p className="text-xs text-gray-400">net income</p>
            </>
          ) : (
            <span className="text-xs text-gray-400 italic">no sales yet</span>
          )}
          <span className={['text-xs text-gray-400 block mt-1', expanded ? 'rotate-180' : ''].join(' ')}>▾</span>
        </div>
      </button>

      {/* ── EXPANDED DETAIL ──────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-4">

          {/* Delivery metadata */}
          <div className="text-xs text-gray-500 space-y-0.5">
            <p><span className="font-medium">Agent:</span> {delivery.agent_name}</p>
            {delivery.producer_ref_number && (
              <p><span className="font-medium">Prod. ref:</span> {delivery.producer_ref_number}</p>
            )}
            {delivery.delivery_notes && (
              <p className="italic text-gray-400">{delivery.delivery_notes}</p>
            )}
          </div>

          {/* Batch list */}
          {batches.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Sale Batches
              </h3>
              {batches.map((batch) => (
                <BatchSummaryRow key={batch.id} batch={batch} onDeleted={onUpdated} />
              ))}

              {/* Grand total */}
              {batches.length > 1 && (
                <div className="border-t-2 border-gray-100 pt-2 flex justify-between text-sm font-bold">
                  <span>
                    Total · {totalKgSold.toFixed(2)} kg sold
                  </span>
                  <span className={totalNetIncome >= 0 ? 'text-nebula-700' : 'text-red-600'}>
                    {formatZAR(totalNetIncome)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Add batch form or button */}
          {addingBatch ? (
            <BatchForm
              deliveryId={delivery.id}
              nextBatchNum={batches.length + 1}
              onSaved={handleBatchSaved}
              onCancel={() => setAddingBatch(false)}
            />
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1"
                icon="+"
                onClick={() => setAddingBatch(true)}
              >
                Add Batch
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isDeleting ? '⏳' : '🗑️ Delete'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Read-only row showing a saved batch's financial summary.
 */
function BatchSummaryRow({ batch, onDeleted }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete Batch ${batch.batch_number}? This cannot be undone.`)) return
    
    setIsDeleting(true)
    const { error } = await supabase
      .from('market_batches')
      .delete()
      .eq('id', batch.id)
    
    if (error) {
      alert('Failed to delete: ' + error.message)
      setIsDeleting(false)
    } else {
      onDeleted()
    }
  }

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm relative">
      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 flex items-center justify-center text-xs z-10"
        title="Delete batch"
      >
        {isDeleting ? '⏳' : '🗑️'}
      </button>

      {/* Top: batch number + qty × price */}
      <button
        className="w-full flex items-center justify-between gap-2 pr-8"
        onClick={() => setDetailOpen((v) => !v)}
      >
        <span className="font-medium text-gray-700">
          Batch {batch.batch_number} · {batch.quantity_sold} kg @ {formatZAR(batch.price_per_unit)}/kg
        </span>
        <span className="text-gray-400 text-xs">{detailOpen ? '▲' : '▾'}</span>
      </button>

      {/* Always-visible net income */}
      <IncomeCalculator compact netIncome={batch.net_income} />

      {/* Full breakdown on demand */}
      {detailOpen && (
        <div className="border-t border-gray-200 mt-2 pt-2">
          <IncomeCalculator
            gross={batch.gross_amount}
            marketComm={batch.market_commission_amount}
            agentComm={batch.agent_commission_amount}
            vatOnComm={batch.vat_on_commissions}
            bankCharge={batch.bank_charge}
            netIncome={batch.net_income}
          />
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-400">
            <span>Mkt comm rate: {(batch.market_commission_rate * 100).toFixed(1)}%</span>
            <span>Agent rate: {(batch.agent_commission_rate * 100).toFixed(1)}%</span>
            <span>VAT: {(batch.vat_rate * 100).toFixed(0)}%</span>
            <span>Bank: {formatZAR(batch.bank_charge)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
