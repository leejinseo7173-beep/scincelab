/**
 * 실험 ① 빗면에서의 마찰과 가속도 (물리)
 *
 * - 미끄러질 조건: tanθ > μ  (아니면 정지)
 * - 운동 시 가속도: a = g(sinθ − μ·cosθ)
 * - 힘: 중력 빗면분력 mg·sinθ, 수직항력 N = mg·cosθ, 마찰력 f = μN
 */
const G = 9.8
const SLOPE_LEN = 10 // 빗면 길이 (m)

const rad = (deg) => (deg * Math.PI) / 180

/** 현재 파라미터에서의 가속도 (정지 조건이면 0) */
function accel(params) {
  const th = rad(params.theta)
  if (Math.tan(th) <= params.mu) return 0
  return G * (Math.sin(th) - params.mu * Math.cos(th))
}

/** 화살표 그리기 유틸 (현재 변환 기준 좌표) */
function arrow(ctx, x1, y1, x2, y2, color, label) {
  const head = 8
  const ang = Math.atan2(y2 - y1, x2 - x1)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - head * Math.cos(ang - 0.4), y2 - head * Math.sin(ang - 0.4))
  ctx.lineTo(x2 - head * Math.cos(ang + 0.4), y2 - head * Math.sin(ang + 0.4))
  ctx.closePath()
  ctx.fill()
  if (label) {
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText(label, x2 + 6, y2 + 4)
  }
}

const incline = {
  id: 'incline',
  title: '빗면에서의 마찰과 가속도',
  subject: '물리',
  icon: '📐',
  summary: '빗면 각도와 마찰계수를 바꿔가며 물체가 미끄러지는 조건(tanθ > μ)과 가속도를 알아봅니다.',

  params: [
    { key: 'theta', label: '빗면 각도 θ', min: 0, max: 60, step: 1, value: 30, unit: '°' },
    { key: 'mu', label: '마찰계수 μ', min: 0, max: 1, step: 0.01, value: 0.2, unit: '' },
    { key: 'm', label: '질량 m', min: 0.5, max: 5, step: 0.1, value: 1, unit: 'kg' },
  ],

  // s: 빗면을 따라 내려간 거리(m), v: 속력(m/s)
  reset: () => ({ t: 0, s: 0, v: 0, arrived: false }),

  step: (state, params, dt) => {
    const a = accel(params)
    if (a === 0 || state.arrived) return state // 정지(마찰 충분) 또는 도착
    const v = state.v + a * dt
    let s = state.s + v * dt
    let arrived = false
    if (s >= SLOPE_LEN) {
      s = SLOPE_LEN
      arrived = true
    }
    return { t: state.t + dt, s, v, arrived }
  },

  draw: (ctx, state, params, canvas) => {
    const W = canvas.width
    const H = canvas.height
    const th = rad(params.theta)
    const a = accel(params)
    const sliding = a > 0

    // ---- 빗면 배치: 좌상단 꼭대기 → 우하단 바닥, 캔버스에 맞게 스케일 ----
    const margin = 70
    const scale = Math.min(
      (W - margin * 2) / Math.max(SLOPE_LEN * Math.cos(th), 3),
      (H - margin * 2) / Math.max(SLOPE_LEN * Math.sin(th), 1.5),
    )
    const baseW = SLOPE_LEN * Math.cos(th) * scale
    const slopeH = SLOPE_LEN * Math.sin(th) * scale
    const groundY = H - 60
    const topX = (W - baseW) / 2
    const topY = groundY - slopeH

    // 바닥
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(30, groundY)
    ctx.lineTo(W - 30, groundY)
    ctx.stroke()

    // 빗면 삼각형
    ctx.fillStyle = '#e2e8f0'
    ctx.strokeStyle = '#64748b'
    ctx.beginPath()
    ctx.moveTo(topX, topY)
    ctx.lineTo(topX, groundY)
    ctx.lineTo(topX + baseW, groundY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // 각도 호 + 라벨 (빗면 아래쪽 각)
    const footX = topX + baseW
    ctx.strokeStyle = '#475569'
    ctx.beginPath()
    ctx.arc(footX, groundY, 34, Math.PI, Math.PI + th)
    ctx.stroke()
    ctx.fillStyle = '#475569'
    ctx.font = '13px sans-serif'
    ctx.fillText(`θ=${params.theta}°`, footX - 78, groundY - 10)

    // ---- 물체(상자): 빗면 위 좌표계로 회전해서 그림 ----
    // 빗면 방향(내려가는 쪽) 단위벡터: (cosθ, sinθ) — 화면 y는 아래가 +
    const px = topX + state.s * scale * Math.cos(th)
    const py = topY + state.s * scale * Math.sin(th)
    const box = 20 + params.m * 4 // 질량에 따라 상자 크기

    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(th)

    ctx.fillStyle = sliding ? '#f59e0b' : '#94a3b8'
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 1.5
    ctx.fillRect(-box / 2, -box, box, box)
    ctx.strokeRect(-box / 2, -box, box, box)

    // ---- 힘 벡터 (상자 중심 기준, 빗면 좌표계) ----
    // 무게(mg)가 항상 같은 길이(70px)가 되도록 정규화 → 상대 크기 비교용
    const mg = params.m * G
    const pxPerN = 70 / mg
    const Fpar = mg * Math.sin(th) // 중력 빗면분력 (빗면 아래 방향 = +x)
    const N = mg * Math.cos(th) // 수직항력 (빗면 수직 위 = -y)
    const fric = sliding ? params.mu * N : Fpar // 정지 시 정지마찰 = 분력과 평형
    const cx = 0
    const cy = -box / 2

    if (Fpar > 0.1) arrow(ctx, cx, cy, cx + Fpar * pxPerN, cy, '#ef4444', 'mg·sinθ')
    arrow(ctx, cx, cy, cx, cy - N * pxPerN, '#3b82f6', 'N')
    if (fric > 0.1) arrow(ctx, cx, cy, cx - fric * pxPerN, cy, '#f97316', 'f')

    ctx.restore()

    // ---- 상태 텍스트 ----
    ctx.font = '14px sans-serif'
    ctx.fillStyle = '#334155'
    ctx.fillText(`a = ${a.toFixed(2)} m/s²   v = ${state.v.toFixed(2)} m/s   이동 s = ${state.s.toFixed(2)} m`, 20, 28)
    if (!sliding) {
      ctx.fillStyle = '#dc2626'
      ctx.font = 'bold 16px sans-serif'
      ctx.fillText('정지 (마찰이 충분: tanθ ≤ μ)', 20, 52)
    } else if (state.arrived) {
      ctx.fillStyle = '#16a34a'
      ctx.font = 'bold 16px sans-serif'
      ctx.fillText('바닥 도착!', 20, 52)
    }
  },

  chart: {
    xLabel: '시간 t (s)',
    yLabel: '속도 v (m/s) · 거리 s (m)',
    getPoint: (state) => ({
      x: Number(state.t.toFixed(3)),
      v: Number(state.v.toFixed(3)),
      s: Number(state.s.toFixed(3)),
    }),
    series: [
      { key: 'v', label: '속도 v (m/s)', color: '#2563eb' },
      { key: 's', label: '이동 거리 s (m)', color: '#94a3b8' },
    ],
  },

  table: {
    columns: [
      { key: 'theta', label: '각도 θ', unit: '°' },
      { key: 'mu', label: '마찰계수 μ', unit: '' },
      { key: 'a', label: '가속도 a', unit: 'm/s²' },
    ],
    sample: (state, params) => ({
      theta: params.theta,
      mu: params.mu,
      a: accel(params).toFixed(2),
    }),
  },

  info: {
    formula: 'a = g(sinθ − μ·cosθ)',
    description:
      '빗면 위 물체에는 중력의 빗면 방향 분력(mg·sinθ)이 미는 힘으로, 마찰력(f = μN = μmg·cosθ)이 막는 힘으로 작용합니다.\n\n• 미끄러지는 조건: tanθ > μ — 각도가 충분히 크거나 마찰계수가 작아야 움직입니다. tanθ ≤ μ이면 정지마찰이 분력과 평형을 이뤄 정지합니다.\n• 미끄러질 때 가속도는 a = g(sinθ − μcosθ)로, 질량 m과 무관합니다. 질량 슬라이더를 바꿔도 가속도가 변하지 않는 것을 확인해 보세요.\n• 각도 θ를 키우면 분력은 커지고 수직항력(마찰)은 작아져 가속도가 커집니다. μ와 θ를 바꿔가며 [측정]으로 가속도를 기록해 비교해 보세요.',
  },
}

export default incline
