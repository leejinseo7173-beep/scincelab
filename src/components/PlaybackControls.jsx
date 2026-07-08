const SPEEDS = [0.5, 1, 2]

/** 재생/일시정지 · 초기화 · 배속 컨트롤 */
export default function PlaybackControls({ playing, speed, onTogglePlay, onReset, onSpeed }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white p-3 shadow">
      <button
        onClick={onTogglePlay}
        className={`rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition ${
          playing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {playing ? '⏸ 일시정지' : '▶ 재생'}
      </button>
      <button
        onClick={onReset}
        className="rounded-lg bg-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
      >
        ⟲ 초기화
      </button>
      <div className="ml-auto flex items-center gap-1">
        <span className="mr-1 text-xs text-slate-400">속도</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeed(s)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              speed === s
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
