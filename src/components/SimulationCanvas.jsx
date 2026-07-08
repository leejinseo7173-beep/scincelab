import { useEffect, useRef } from 'react'

/**
 * 시뮬레이션 캔버스.
 * - 부모 크기에 맞춰 리사이즈(ResizeObserver)
 * - requestAnimationFrame 루프를 돌리며 매 프레임 onFrame(ctx, canvas, dt)를 호출
 *   (물리 step/draw는 App 쪽 프레임 핸들러가 담당 — 캔버스는 루프와 크기만 관리)
 */
export default function SimulationCanvas({ onFrame }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const frameRef = useRef(onFrame)
  frameRef.current = onFrame

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = wrap.clientWidth
      canvas.height = wrap.clientHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    let raf
    let last = performance.now()
    const loop = (now) => {
      // 탭 비활성화 등으로 dt가 튀는 것 방지 (최대 50ms)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      frameRef.current(ctx, canvas, dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={wrapRef} className="h-full w-full overflow-hidden rounded-xl bg-white shadow">
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}
