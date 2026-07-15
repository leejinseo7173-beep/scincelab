/**
 * 포물선 실험 전용: 추가된 공 목록 편집기.
 * ControlPanel의 { type: 'custom' } 파라미터로 렌더링된다.
 * value = 공 조건 배열 [{ free, v0, theta, h, g, k }], onChange로 배열을 교체하면
 * 프레임이 자동으로 시뮬레이션을 reset → 모든 공이 다시 동시 발사된다.
 */
const MAX_BALLS = 5
const BALL_COLORS = ['#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2']

const SLIDER_DEFS = [
  { key: 'v0', label: 'v₀', min: 5, max: 50, step: 1, unit: 'm/s', show: (b) => !b.free },
  { key: 'theta', label: 'θ', min: 0, max: 90, step: 1, unit: '°', show: (b) => !b.free },
  { key: 'h', label: 'h', min: 0, max: 30, step: 0.5, unit: 'm' },
  { key: 'g', label: 'g', min: 1, max: 25, step: 0.1, unit: 'm/s²' },
  { key: 'k', label: 'k', min: 0, max: 1, step: 0.01, unit: '/s' },
]

export default function ProjectileBallsEditor({ value: balls = [], onChange, params }) {
  const update = (i, patch) =>
    onChange(balls.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const remove = (i) => onChange(balls.filter((_, j) => j !== i))
  const add = () => {
    if (balls.length >= MAX_BALLS) return
    const free = params.mode === 'freefall'
    onChange([
      ...balls,
      {
        free,
        v0: free ? 0 : params.v0,
        theta: free ? 0 : params.theta,
        h: params.h,
        g: params.g,
        k: params.k,
      },
    ])
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-500">비교할 공 (동시 발사)</span>
        <button
          onClick={add}
          disabled={balls.length >= MAX_BALLS}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
        >
          ➕ 공 추가
        </button>
      </div>
      <p className="-mt-2 text-[11px] leading-snug text-slate-400">
        위 슬라이더는 공1(파랑)의 조건입니다. 공을 추가하면 아래에서 공마다 변인을 따로
        조절할 수 있어요.
      </p>

      {balls.map((b, i) => {
        const color = BALL_COLORS[i % BALL_COLORS.length]
        return (
          <div key={i} className="rounded-lg border border-slate-200 p-2.5" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: color }} />
              <span className="text-sm font-bold">공 {i + 2}</span>
              <select
                value={b.free ? 'freefall' : 'projectile'}
                onChange={(e) =>
                  update(i, e.target.value === 'freefall'
                    ? { free: true, v0: 0, theta: 0 }
                    : { free: false, v0: b.v0 || 20, theta: b.theta || 45 })
                }
                className="rounded border border-slate-200 px-1.5 py-0.5 text-xs"
              >
                <option value="projectile">포물선</option>
                <option value="freefall">자유낙하</option>
              </select>
              <button
                onClick={() => remove(i)}
                className="ml-auto text-slate-300 transition hover:text-red-500"
                title="이 공 삭제"
              >
                ✕
              </button>
            </div>
            {SLIDER_DEFS.filter((s) => !s.show || s.show(b)).map((s) => (
              <label key={s.key} className="flex items-center gap-2 py-0.5">
                <span className="w-4 text-xs font-medium text-slate-500">{s.label}</span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={b[s.key]}
                  onChange={(e) => update(i, { [s.key]: Number(e.target.value) })}
                  className="min-w-0 flex-1 accent-indigo-600"
                />
                <span className="w-16 text-right font-mono text-[11px] text-slate-600">
                  {b[s.key]}{s.unit}
                </span>
              </label>
            ))}
          </div>
        )
      })}
    </div>
  )
}
