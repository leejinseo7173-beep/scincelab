import { useCallback, useRef, useState } from 'react'
import SimulationCanvas from './SimulationCanvas'
import ControlPanel from './ControlPanel'
import PlaybackControls from './PlaybackControls'
import LiveChart from './LiveChart'
import DataTable from './DataTable'
import InfoPanel from './InfoPanel'

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

/**
 * 실험 화면. 부모(App)가 key={module.id}로 마운트하므로
 * module은 이 컴포넌트가 살아있는 동안 절대 바뀌지 않는다.
 */
export default function ExperimentLab({ module, experiments, onSwitch, onBack }) {
  const [params, setParams] = useState(() => initParams(module))
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [tab, setTab] = useState('chart')
  const [rows, setRows] = useState([])
  // 그래프 데이터 초기화 신호 (초기화 버튼 / 모드 전환 시 증가)
  const [chartVersion, setChartVersion] = useState(0)

  // 시뮬레이션 상태와 그래프 점 버퍼는 매 프레임 바뀌므로 ref로 관리 (리렌더 없음)
  const stateRef = useRef(module.reset(params))
  const pointsRef = useRef([])

  // rAF 프레임 콜백에서 최신 값을 읽기 위한 미러 ref
  const paramsRef = useRef(params)
  const playingRef = useRef(playing)
  const speedRef = useRef(speed)
  paramsRef.current = params
  playingRef.current = playing
  speedRef.current = speed

  const clearChart = useCallback(() => {
    pointsRef.current = []
    setChartVersion((v) => v + 1)
  }, [])

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

  /* ---------- 실험 전용 액션 버튼 (예: 공 추가) ---------- */
  const handleAction = (action) => {
    stateRef.current = action.apply(stateRef.current, params)
    clearChart()
  }

  /* ---------- 측정(데이터 표) ---------- */
  const handleMeasure = () => {
    if (!module.table) return
    const row = module.table.sample(stateRef.current, params)
    setRows((r) => [...r, row])
  }

  /* ---------- 매 프레임: step → 그래프 점 기록 → draw ---------- */
  const handleFrame = useCallback(
    (ctx, canvas, dt) => {
      const p = paramsRef.current

      if (playingRef.current) {
        const scaledDt = dt * speedRef.current
        stateRef.current = module.step(stateRef.current, p, scaledDt)

        if (module.chart?.getPoint) {
          const pt = module.chart.getPoint(stateRef.current, p)
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
      module.draw(ctx, stateRef.current, p, canvas)
    },
    [module],
  )

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-4 p-4">
      {/* ---------- 상단 헤더 ---------- */}
      <header className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-5 py-4 shadow">
        <button
          onClick={onBack}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          ← 실험 목록
        </button>
        <h1 className="text-xl font-bold">{module.title}</h1>
        <span
          className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
            SUBJECT_STYLE[module.subject] ?? 'bg-slate-100 text-slate-600'
          }`}
        >
          {module.subject}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">실험 바꾸기</span>
          <select
            value={module.id}
            onChange={(e) => onSwitch(e.target.value)}
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

      {/* ---------- 본문: 좌측(캔버스 + 그래프 탭) / 우측(컨트롤) ----------
           슬라이더를 조작하면서 시뮬레이션과 그래프의 변화를 동시에 볼 수 있게
           한 화면 안에 모두 들어오는 배치 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="h-[320px]">
            <SimulationCanvas onFrame={handleFrame} />
          </div>

          {/* 탭: 그래프 / 표 / 설명 */}
          <div className="rounded-xl bg-white shadow">
            <div className="flex border-b border-slate-200">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm font-semibold transition ${
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
              <LiveChart
                module={module}
                params={params}
                pointsRef={pointsRef}
                version={chartVersion}
              />
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

        <div className="flex flex-col gap-4">
          <PlaybackControls
            playing={playing}
            speed={speed}
            onTogglePlay={() => setPlaying((p) => !p)}
            onReset={handleReset}
            onSpeed={setSpeed}
          />
          <ControlPanel
            module={module}
            params={params}
            onChange={handleParamChange}
            onAction={handleAction}
          />
        </div>
      </div>
    </div>
  )
}
