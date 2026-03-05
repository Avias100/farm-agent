import { formatZAR } from '../../lib/utils'

/**
 * Read-only financial breakdown panel.
 * Shows the full split from gross sale to farmer net income.
 * Used as a live preview inside BatchForm (recalculates on every keystroke)
 * and as a summary inside each saved DeliveryCard batch row.
 *
 * Props:
 *   gross       — number
 *   marketComm  — number
 *   agentComm   — number
 *   vatOnComm   — number (combined VAT on both commissions)
 *   bankCharge  — number
 *   netIncome   — number
 *   compact     — boolean (smaller layout for use inside DeliveryCard)
 */
export default function IncomeCalculator({
  gross,
  marketComm,
  agentComm,
  vatOnComm,
  bankCharge,
  netIncome,
  compact = false,
}) {
  const isPositive = netIncome > 0

  if (compact) {
    // Inline row used in saved batch summaries
    return (
      <div className="flex items-center justify-between text-sm py-1">
        <span className="text-gray-500">Net income</span>
        <span className={['font-bold font-mono', isPositive ? 'text-nebula-700' : 'text-red-600'].join(' ')}>
          {formatZAR(netIncome)}
        </span>
      </div>
    )
  }

  // Full breakdown — used in BatchForm live preview
  return (
    <div className="rounded-xl bg-nebula-50 border border-nebula-100 p-3 space-y-2">
      <p className="text-xs font-semibold text-nebula-800 uppercase tracking-wide">Sale Preview</p>

      {/* Gross */}
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-gray-700">Gross amount</span>
        <span className="font-mono">{formatZAR(gross)}</span>
      </div>

      {/* Deductions */}
      <div className="space-y-1 text-xs text-gray-600 border-t border-nebula-100 pt-2">
        <DeductionRow
          label={`Market commission`}
          amount={marketComm}
        />
        <DeductionRow
          label={`Agent commission`}
          amount={agentComm}
        />
        <DeductionRow
          label="VAT on commissions"
          amount={vatOnComm}
          note="(15% on mkt + agent comm)"
        />
        <DeductionRow
          label="Bank charge"
          amount={bankCharge}
        />
      </div>

      {/* Net income */}
      <div className={[
        'flex items-center justify-between font-bold text-base',
        'border-t-2 border-nebula-200 pt-2',
      ].join(' ')}>
        <span className="text-gray-900">Farmer net income</span>
        <span className={['font-mono', isPositive ? 'text-nebula-700' : 'text-red-600'].join(' ')}>
          {formatZAR(netIncome)}
        </span>
      </div>
    </div>
  )
}

function DeductionRow({ label, amount, note }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-gray-500">
        {label}
        {note && <span className="text-gray-400 ml-1">{note}</span>}
      </span>
      <span className="font-mono text-red-500 flex-shrink-0">− {formatZAR(amount)}</span>
    </div>
  )
}
