import { useState } from 'react'
import Button           from '../../components/ui/Button'
import IncomeCalculator from './IncomeCalculator'
import { supabase }     from '../../lib/supabase'
import { calcBatchFinancials } from '../../lib/utils'

/**
 * Add a sale batch to an existing market delivery.
 *
 * The live IncomeCalculator updates on every keystroke so the manager
 * can see exactly what the farmer will receive before saving.
 *
 * Computed columns (gross, commissions, VAT, net_income) are returned
 * by Supabase after INSERT because they are PostgreSQL GENERATED ALWAYS AS STORED
 * columns — we don't need to send them; the server computes them.
 *
 * Props:
 *   deliveryId    — UUID of the parent market_delivery
 *   nextBatchNum  — integer (count of existing batches + 1)
 *   onSaved       — (batch) => void — called with the saved + computed batch row
 *   onCancel      — () => void
 */
export default function BatchForm({ deliveryId, nextBatchNum, onSaved, onCancel }) {
  const [qtySold,      setQtySold]      = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [showRates,    setShowRates]    = useState(false)
  const [marketRate,   setMarketRate]   = useState('0.05')
  const [agentRate,    setAgentRate]    = useState('0.085')
  const [vatRate,      setVatRate]      = useState('0.15')
  const [bankCharge,   setBankCharge]   = useState('20.00')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error,        setError]        = useState(null)

  // Live financial preview (client-side, mirrors SQL formula)
  const financials = calcBatchFinancials({
    qty:        parseFloat(qtySold)      || 0,
    price:      parseFloat(pricePerUnit) || 0,
    marketRate: parseFloat(marketRate)   || 0.05,
    agentRate:  parseFloat(agentRate)    || 0.085,
    vatRate:    parseFloat(vatRate)      || 0.15,
    bankCharge: parseFloat(bankCharge)   || 20,
  })

  const hasValues = parseFloat(qtySold) > 0 && parseFloat(pricePerUnit) > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!hasValues) return

    setIsSubmitting(true)
    setError(null)

    const { data, error: supaError } = await supabase
      .from('market_batches')
      .insert({
        delivery_id:           deliveryId,
        batch_number:          nextBatchNum,
        quantity_sold:         parseFloat(qtySold),
        price_per_unit:        parseFloat(pricePerUnit),
        market_commission_rate: parseFloat(marketRate),
        agent_commission_rate:  parseFloat(agentRate),
        vat_rate:               parseFloat(vatRate),
        bank_charge:            parseFloat(bankCharge),
        sold_at:                new Date().toISOString(),
      })
      .select('*')  // Supabase returns all GENERATED columns in the SELECT
      .single()

    if (supaError) {
      setError(supaError.message)
      setIsSubmitting(false)
      return
    }

    onSaved(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <h3 className="text-sm font-semibold text-gray-700">
        Batch {nextBatchNum}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Qty Sold (kg / units)</label>
          <input
            type="number"
            min="0"
            step="0.001"
            className="field-input"
            value={qtySold}
            onChange={(e) => setQtySold(e.target.value)}
            placeholder="0"
            required
          />
        </div>
        <div>
          <label className="field-label">Price / unit (R)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="field-input"
            value={pricePerUnit}
            onChange={(e) => setPricePerUnit(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      {/* Live income preview */}
      {hasValues && (
        <IncomeCalculator {...financials} bankCharge={parseFloat(bankCharge) || 20} />
      )}

      {/* Advanced rates — collapsed by default */}
      <button
        type="button"
        onClick={() => setShowRates((v) => !v)}
        className="text-xs text-nebula-700 font-medium underline-offset-2 hover:underline"
      >
        {showRates ? '▲ Hide commission rates' : '▼ Edit commission rates'}
      </button>

      {showRates && (
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <RateInput
            label="Market comm"
            hint="(default 5%)"
            value={marketRate}
            onChange={setMarketRate}
          />
          <RateInput
            label="Agent comm"
            hint="(default 8.5%)"
            value={agentRate}
            onChange={setAgentRate}
          />
          <RateInput
            label="VAT rate"
            hint="(default 15%)"
            value={vatRate}
            onChange={setVatRate}
          />
          <div>
            <label className="field-label">
              Bank charge <span className="text-gray-400 font-normal">(R)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="field-input"
              value={bankCharge}
              onChange={(e) => setBankCharge(e.target.value)}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          fullWidth
          icon="💰"
          disabled={!hasValues || isSubmitting}
        >
          {isSubmitting ? 'Saving…' : `Save Batch ${nextBatchNum}`}
        </Button>
      </div>
    </form>
  )
}

function RateInput({ label, hint, value, onChange }) {
  return (
    <div>
      <label className="field-label">
        {label} <span className="text-gray-400 font-normal">{hint}</span>
      </label>
      <input
        type="number"
        min="0"
        max="1"
        step="0.001"
        className="field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
