import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { Line } from 'react-chartjs-2'

Chart.register(...registerables)

/** 라벨은 문자열 또는 (params) => 문자열 둘 다 허용 */
function resolveLabel(label, params) {
  return typeof label === 'function' ? label(params) : label
}

/**
 * 실시간 그래프 (chart.js 래퍼).
 * - 시뮬레이션 루프가 pointsRef.current 배열에 점을 밀어 넣으면(최대 300개 롤링),
 *   여기서는 일정 주기(150ms)로만 React 상태에 반영해 렌더 비용을 낮춘다.
 * - version이 바뀌면(초기화/실험 교체/모드 전환) 데이터를 비운다.
 */
export default function LiveChart({ module, params, pointsRef, version }) {
  const [points, setPoints] = useState([])
  const lastSyncRef = useRef({ len: -1, last: null })

  useEffect(() => {
    setPoints([])
    lastSyncRef.current = { len: -1, last: null }
  }, [version, module])

  useEffect(() => {
    const id = setInterval(() => {
      const pts = pointsRef.current
      const sync = lastSyncRef.current
      const last = pts[pts.length - 1] ?? null
      if (pts.length === sync.len && last === sync.last) return // 변화 없으면 스킵
      lastSyncRef.current = { len: pts.length, last }
      setPoints([...pts])
    }, 150)
    return () => clearInterval(id)
  }, [pointsRef])

  const cfg = module.chart
  if (!cfg) return <div className="p-6 text-sm text-slate-400">이 실험에는 그래프가 없습니다.</div>

  const data = {
    datasets: cfg.series.map((s) => ({
      label: s.label,
      data: points.map((p) => ({ x: p.x, y: p[s.key] })),
      borderColor: s.color,
      backgroundColor: s.color,
      borderWidth: 2,
      pointRadius: s.pointRadius ?? 0,
      tension: 0,
    })),
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: resolveLabel(cfg.xLabel, params) },
      },
      y: {
        title: { display: true, text: resolveLabel(cfg.yLabel, params) },
      },
    },
    plugins: {
      legend: { display: cfg.series.length > 1 },
    },
  }

  return (
    <div className="h-72 p-3">
      <Line data={data} options={options} />
    </div>
  )
}
