import { useCallback, useEffect, useRef, useState } from 'react'
import { experiments } from './experiments'
import SimulationCanvas from './components/SimulationCanvas'
import ControlPanel from './components/ControlPanel'
import PlaybackControls from './components/PlaybackControls'
import LiveChart from './components/LiveChart'
import DataTable from './components/DataTable'
import InfoPanel from './components/InfoPanel'

const SUBJECT_STYLE = {
  물리: 'bg-blue-100 text-blue-700',
  화학: 'bg-emerald-100 text-emerald-700',
  생물: 'bg-rose-100 text-rose-700',
  지구과학: 'bg-amber-100 text-amber-700',
}

const TABS = [
  { key: 'chart', label: '실시간 그래프' },
  { key: 'table', label: '데이터 표' },
  { key: 'info', label: '원리 설명' },
]

/** module.params의 기본값으로 params 객체 생성 */
function initParams(module) {
  return Object.fromEntries(module.params.map((p) => [p.key, p.value]))
}

export default function App() {
  const [moduleId, setModuleId] = useState(experiments[0].id)
  const module = experiments.find((e) => e.id === moduleId)

  const [params, setParams] = useState(() => initParams(module))
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [tab, setTab] = useState('chart')
  const [rows, setRows] = useState([])
  // 그래프 데이터 초기화 신호 (초기화 버튼 / 실험 교체 / 모드 전환 시 증가)
  const [chartVersion, setChartVersion] = useState(0)

  // 시뮬레이션 상태와 그래프 점 버퍼는 매 프레임 바뀌므로 ref로 관리 (리렌더 없음)
  const stateRef = useRef(module.reset(params))
  const pointsRef = useRef([])

  // rAF 프레임 콜백에서 최신 값을 읽기 위한 미러 ref
  const moduleRef = useRef(module)
  const paramsRef = useRef(params)
  const playingRef = useRef(playing)
  const speedRef = useRef(speed)
  moduleRef.current = module
  paramsRef.current = params
  playingRef.current = playing
  speedRef.current = speed

  const clearChart = useCallback(() => {
    pointsRef.current = []
    setChartVersion((v) => v + 1)
  }, [])

  /* ---------- 실험 교체 ---------- */
  useEffect(() => {
    const p = initParams(module)
    setParams(p)
    stateRef.current = module.reset(p)
    setRows([])
    clearChart()
    setPlaying(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId])

  /* ---------- 파라미터 변경: 시뮬레이션 자동 reset ---------- */
  const handleParamChange = (key, value) => {
    const next = { ...params, [key]: value }
    stateRef.current = module.reset(next)
    const ch = module.chart
    // 기본은 그래프도 초기화. clearOnParamChange:false인 실험(예: 기체법칙)은
    // 점을 누적하되, resetOn(params) 값이 바뀌면(모드 전환) 초기화한다.
    const resetKeyChanged = ch?.resetOn && ch.resetOn(next) !== ch.resetOn(params)
    if (ch?.clearOnParamChange !== false || resetKeyChanged) clearChart()
    setParams(next)
  }

  /* ---------- 재생 컨트롤 ---------- */
  const handleReset = () => {
    stateRef.current = module.reset(params)
    clearChart()
  }

  /* ---------- 측정(데이터 표) ---------- */
  const handleMeasure = () => {
    if (!module.table) return
    const row = module.table.sample(stateRef.current, params)
    setRows((r) => [...r, row])
  }

  /* ---------- 매 프레임: step → 그래프 점 기록 → draw ---------- */
  const handleFrame = useCallback((ctx, canvas, dt) => {
    const m = moduleRef.current
    const p = paramsRef.current

    if (playingRef.current) {
      const scaledDt = dt * speedRef.current
      stateRef.current = m.step(stateRef.current, p, scaledDt)

      if (m.chart?.getPoint) {
        const pt = m.chart.getPoint(stateRef.current, p)
        if (pt) {
          const pts = pointsRef.current
          const last = pts[pts.length - 1]
          // 값이 안 변했으면(정지 상태 등) 같은 점을 반복해 쌓지 않는다
          const changed = !last || Object.keys(pt).some((k) => pt[k] !== last[k])
          if (changed) {
            pts.push(pt)
            if (pts.length > 300) pts.shift() // 최대 300개 롤링
          }
        }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    m.draw(ctx, stateRef.current, p, canvas)
  }, [])

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-4 p-4">
      {/* ---------- 상단 헤더 ---------- */}
      <header className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-5 py-4 shadow">
        <span className="text-2xl">🔬</span>
        <h1 className="text-xl font-bold">{module.title}</h1>
        <span
          className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
            SUBJECT_STYLE[module.subject] ?? 'bg-slate-100 text-slate-600'
          }`}
        >
          {module.subject}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">실험 선택</span>
          <select
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium"
          >
            {experiments.map((e) => (
              <option key={e.id} value={e.id}>
                [{e.subject}] {e.title}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* ---------- 본문: 캔버스(좌) + 컨트롤(우) ---------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex h-[440px] flex-col lg:col-span-2">
          <SimulationCanvas onFrame={handleFrame} />
        </div>
        <div className="flex flex-col gap-4">
          <PlaybackControls
            playing={playing}
            speed={speed}
            onTogglePlay={() => setPlaying((p) => !p)}
            onReset={handleReset}
            onSpeed={setSpeed}
          />
          <ControlPanel module={module} params={params} onChange={handleParamChange} />
        </div>
      </div>

      {/* ---------- 하단 탭: 그래프 / 표 / 설명 ---------- */}
      <div className="rounded-xl bg-white shadow">
        <div className="flex border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-semibold transition ${
                tab === t.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'chart' && (
          <LiveChart module={module} params={params} pointsRef={pointsRef} version={chartVersion} />
        )}
        {tab === 'table' && (
          <DataTable
            module={module}
            rows={rows}
            onMeasure={handleMeasure}
            onDeleteRow={(i) => setRows((r) => r.filter((_, j) => j !== i))}
            onClear={() => setRows([])}
          />
        )}
        {tab === 'info' && <InfoPanel module={module} />}
      </div>
    </div>
  )
}
