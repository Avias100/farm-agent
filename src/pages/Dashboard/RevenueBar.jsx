import { formatZAR } from '../../lib/utils'

/**
 * Horizontal bar showing one crop's share of total revenue.
 *
 * Props:
 *   label     — crop name
 *   value     — net income for this crop (ZAR)
 *   kgSold    — kg sold
 *   maxValue  — largest value in the set (for scaling the bar)
 *   rank      — position 0-based (used for colour graduation)
 */
export default function RevenueBar({ label, value, kgSold, maxValue, rank }) {
  const pct = maxValue > 0 ? Math.max(4, (value / maxValue) * 100) : 4

  const COLOURS = [
    'bg-nebula-600',
    'bg-nebula-500',
    'bg-nebula-400',
    'bg-nebula-300',
    'bg-gray-300',
  ]
  const colour = COLOURS[Math.min(rank, COLOURS.length - 1)]

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-800">{label}</span>
        <span className="font-mono text-gray-600">{formatZAR(value)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">{kgSold.toFixed(0)} kg sold</p>
    </div>
  )
}
