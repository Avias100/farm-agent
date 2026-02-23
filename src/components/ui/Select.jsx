/**
 * Labelled select dropdown.
 *
 * Props:
 *   label       — string
 *   value       — string
 *   onChange    — (value: string) => void
 *   options     — Array<{ value: string, label: string }>
 *   placeholder — string (shown as disabled first option)
 *   required    — boolean
 *   disabled    — boolean
 *   error       — string (validation message)
 */
export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  required  = false,
  disabled  = false,
  error,
}) {
  return (
    <div>
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={[
          'field-input appearance-none cursor-pointer',
          'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")]',
          'bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25rem_1.25rem] pr-10',
          error ? 'border-red-400 focus:ring-red-500' : '',
        ].join(' ')}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
