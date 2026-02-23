/**
 * Reusable button component.
 * All variants meet the 44px minimum tap target height.
 *
 * Props:
 *   variant  — 'primary' | 'success' | 'danger' | 'ghost' | 'outline'
 *   size     — 'sm' | 'md' | 'lg'
 *   fullWidth — boolean
 *   icon     — string/emoji prepended to label
 *   disabled — boolean
 *   onClick  — handler
 */
const variants = {
  primary: 'bg-nebula-600 hover:bg-nebula-700 active:bg-nebula-800 text-white shadow-sm',
  success: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-sm',
  danger:  'bg-red-500   hover:bg-red-600   active:bg-red-700   text-white shadow-sm',
  outline: 'border-2 border-nebula-600 text-nebula-700 hover:bg-nebula-50 active:bg-nebula-100',
  ghost:   'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-sm min-h-[44px]',
  lg: 'px-5 py-3   text-base font-semibold min-h-[52px]',
}

export default function Button({
  variant  = 'primary',
  size     = 'md',
  fullWidth = false,
  icon,
  disabled = false,
  onClick,
  children,
  type = 'button',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
      ].join(' ')}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  )
}
