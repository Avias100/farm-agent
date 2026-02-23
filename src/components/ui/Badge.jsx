/**
 * Status badge pill used in activity lists and status indicators.
 *
 * Props:
 *   variant — 'green' | 'amber' | 'blue' | 'red' | 'gray'
 *   dot     — boolean (show animated pulse dot before text)
 *   size    — 'sm' | 'md'
 */
const variants = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100   text-amber-800',
  blue:  'bg-blue-100    text-blue-800',
  red:   'bg-red-100     text-red-800',
  gray:  'bg-gray-100    text-gray-700',
}

const dotColors = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  blue:  'bg-blue-500',
  red:   'bg-red-500',
  gray:  'bg-gray-400',
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export default function Badge({ variant = 'gray', dot = false, size = 'sm', children }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variants[variant],
        sizes[size],
      ].join(' ')}
    >
      {dot && (
        <span
          className={['w-1.5 h-1.5 rounded-full status-dot-pulse', dotColors[variant]].join(' ')}
        />
      )}
      {children}
    </span>
  )
}
