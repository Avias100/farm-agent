/**
 * Full-width timer display shown while a task is In Progress.
 * Displays the elapsed time prominently and the section + task type.
 *
 * Props:
 *   timer       — object from useTimer()
 *   taskType    — string e.g. "Planting"
 *   sectionName — string e.g. "A"
 */
export default function TimerDisplay({ timer, taskType, sectionName }) {
  return (
    <div className="rounded-2xl bg-nebula-600 text-white p-5 text-center space-y-1">
      {/* Context */}
      <p className="text-nebula-200 text-sm font-medium tracking-wide uppercase">
        {taskType} · Section {sectionName}
      </p>

      {/* Elapsed clock — large and easy to read at a glance */}
      <p className="text-5xl font-mono font-bold tracking-widest tabular-nums">
        {timer.formatted}
      </p>

      {/* Status pill */}
      <div className="flex justify-center pt-1">
        <span className="inline-flex items-center gap-1.5 bg-nebula-500 rounded-full px-3 py-1 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot-pulse" />
          IN PROGRESS
        </span>
      </div>
    </div>
  )
}
