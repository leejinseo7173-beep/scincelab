/**
 * 실험 ② 포물선 운동 (투사체) — 물리
 *
 * x = v₀·cosθ·t,  y = h + v₀·sinθ·t − ½gt²
 * vx = v₀·cosθ,   vy = v₀·sinθ − g·t
 * 비행시간 T = (v₀sinθ + √((v₀sinθ)² + 2gh)) / g
 * 사거리 R = v₀cosθ·T,  최고점 H = h + (v₀sinθ)²/(2g)
 */
const G = 9.8

const rad = (deg) => (deg * Math.PI) / 180

/** 파라미터에서 유도값(비행시간/사거리/최고점) 계산 */
function derived(params) {
  const th = rad(params.theta)
  const vx0 = params.v0 * Math.cos(th)
  const vy0 = params.v0 * Math.sin(th)
  const T = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G * params.h)) / G
  const R = vx0 * T
  const Hmax = params.h + (vy0 * vy0) / (2 * G)
  return { vx0, vy0, T, R, Hmax }
}

/** 축 눈금 간격을 보기 좋은 값(1/2/5×10ⁿ)으로 선택 */
function niceStep(maxVal) {
  const target = maxVal / 6
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(target, 1e-6))))
  for (const m of [1, 2, 5, 10]) {
    if (m * pow >= target) return m * pow
  }
  return 10 * pow
}

function arrow(ctx, x1, y1, x2, y2, color) {
  const head = 7
  const ang = Math.atan2(y2 - y1, x2 - x1)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
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
}

const projectile = {
  id: 'projectile',
  title: '포물선 운동 (투사체)',
  subject: '물리',

  params: [
    { key: 'v0', label: '초기속도 v₀', min: 5, max: 50, step: 1, value: 20, unit: 'm/s' },
    { key: 'theta', label: '발사각 θ', min: 0, max: 90, step: 1, value: 45, unit: '°' },
    { key: 'h', label: '초기높이 h', min: 0, max: 20, step: 0.5, value: 0, unit: 'm' },
  ],

  reset: (params) => ({
    t: 0,
    x: 0,
    y: params.h,
    landed: false,
    trail: [{ x: 0, y: params.h }],
  }),

  step: (state, params, dt) => {
    if (state.landed) return state
    const { vx0, vy0, T } = derived(params)
    let t = state.t + dt
    let landed = false
    if (t >= T) {
      t = T // 착지 시각으로 스냅 → 정확히 y=0에서 멈춤
      landed = true
    }
    const x = vx0 * t
    const y = params.h + vy0 * t - 0.5 * G * t * t
    const trail = [...state.trail, { x, y }]
    if (trail.length > 600) trail.shift()
    return { t, x, y: Math.max(y, 0), landed, trail }
  },

  draw: (ctx, state, params, canvas) => {
    const W = canvas.width
    const H = canvas.height
    const d = derived(params)

    // ---- 월드 → 픽셀 스케일: 예상 사거리/최고점이 화면에 들어오게 ----
    const originX = 55
    const groundY = H - 42
    const worldW = Math.max(d.R * 1.08, 10)
    const worldH = Math.max(d.Hmax * 1.15, 5)
    const scale = Math.min((W - originX - 20) / worldW, (groundY - 25) / worldH)
    const toPx = (wx, wy) => [originX + wx * scale, groundY - wy * scale]

    // ---- 바닥선 + 축 눈금 ----
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(20, groundY)
    ctx.lineTo(W - 15, groundY)
    ctx.stroke()

    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px sans-serif'
    ctx.lineWidth = 1
    const sx = niceStep(worldW)
    for (let wx = 0; wx <= worldW; wx += sx) {
      const [px] = toPx(wx, 0)
      ctx.beginPath()
      ctx.moveTo(px, groundY)
      ctx.lineTo(px, groundY + 5)
      ctx.stroke()
      ctx.fillText(`${wx}`, px - 6, groundY + 17)
    }
    ctx.fillText('x (m)', W - 48, groundY + 30)
    const sy = niceStep(worldH)
    for (let wy = sy; wy <= worldH; wy += sy) {
      const [, py] = toPx(0, wy)
      ctx.beginPath()
      ctx.moveTo(originX - 5, py)
      ctx.lineTo(originX, py)
      ctx.stroke()
      ctx.fillText(`${wy}`, originX - 30, py + 4)
    }
    ctx.save()
    ctx.translate(18, 60)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('y (m)', 0, 0)
    ctx.restore()

    // ---- 발사대 ----
    const [lx, ly] = toPx(0, params.h)
    ctx.fillStyle = '#64748b'
    ctx.fillRect(lx - 8, ly, 8, groundY - ly) // 기둥
    ctx.save()
    ctx.translate(lx - 4, ly)
    ctx.rotate(-rad(params.theta))
    ctx.fillStyle = '#475569'
    ctx.fillRect(0, -4, 26, 8) // 포신
    ctx.restore()

    // ---- 지나온 궤적 (점선) ----
    ctx.strokeStyle = '#93c5fd'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    state.trail.forEach((p, i) => {
      const [px, py] = toPx(p.x, p.y)
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    })
    ctx.stroke()
    ctx.setLineDash([])

    // ---- 공 + 현재 속도 벡터 ----
    const [bx, by] = toPx(state.x, state.y)
    ctx.fillStyle = '#2563eb'
    ctx.beginPath()
    ctx.arc(bx, by, 8, 0, Math.PI * 2)
    ctx.fill()

    if (!state.landed) {
      const vy = d.vy0 - G * state.t
      const vScale = 2.2 // 픽셀/(m/s)
      arrow(ctx, bx, by, bx + d.vx0 * vScale, by, '#f97316') // vx
      arrow(ctx, bx, by, bx, by - vy * vScale, '#10b981') // vy
      arrow(ctx, bx, by, bx + d.vx0 * vScale, by - vy * vScale, '#dc2626') // 합속도
      ctx.fillStyle = '#dc2626'
      ctx.font = 'bold 12px sans-serif'
      const v = Math.hypot(d.vx0, vy)
      ctx.fillText(`v=${v.toFixed(1)} m/s`, bx + d.vx0 * vScale + 8, by - vy * vScale)
    }

    // ---- 상태 텍스트 ----
    ctx.fillStyle = '#334155'
    ctx.font = '14px sans-serif'
    ctx.fillText(
      `t = ${state.t.toFixed(2)} s   x = ${state.x.toFixed(1)} m   y = ${state.y.toFixed(1)} m`,
      20, 24,
    )
    ctx.fillStyle = '#64748b'
    ctx.font = '12px sans-serif'
    ctx.fillText(
      `예상: 사거리 R=${d.R.toFixed(1)} m · 최고점 H=${d.Hmax.toFixed(1)} m · 비행시간 T=${d.T.toFixed(2)} s`,
      20, 44,
    )
    if (state.landed) {
      ctx.fillStyle = '#16a34a'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText(`착지! R = ${state.x.toFixed(1)} m`, 20, 68)
    }
  },

  chart: {
    xLabel: '수평거리 x (m)',
    yLabel: '높이 y (m)',
    getPoint: (state) => ({
      x: Number(state.x.toFixed(2)),
      y: Number(state.y.toFixed(2)),
    }),
    series: [{ key: 'y', label: '궤적 (x-y)', color: '#2563eb' }],
  },

  table: {
    columns: [
      { key: 'v0', label: 'v₀', unit: 'm/s' },
      { key: 'theta', label: '각도 θ', unit: '°' },
      { key: 'R', label: '사거리 R', unit: 'm' },
      { key: 'H', label: '최고점 H', unit: 'm' },
      { key: 'T', label: '비행시간 T', unit: 's' },
    ],
    sample: (state, params) => {
      const d = derived(params)
      return {
        v0: params.v0,
        theta: params.theta,
        R: d.R.toFixed(1),
        H: d.Hmax.toFixed(1),
        T: d.T.toFixed(2),
      }
    },
  },

  info: {
    formula: 'x = v₀cosθ·t,   y = h + v₀sinθ·t − ½gt²',
    description:
      '투사체는 수평으로는 등속(vx = v₀cosθ), 수직으로는 중력에 의한 등가속 운동(vy = v₀sinθ − gt)을 동시에 합니다. 두 운동이 합쳐져 포물선 궤적이 만들어집니다.\n\n• 사거리(h=0일 때): R = v₀²·sin2θ/g — sin2θ가 최대가 되는 θ=45°에서 사거리가 가장 깁니다. 발사각을 30°, 45°, 60°로 바꿔 [측정]해 보면 45°가 최대이고, 30°와 60°처럼 합이 90°인 두 각의 사거리가 같음을 확인할 수 있습니다.\n• 최고점: H = h + (v₀sinθ)²/(2g) — 각도가 클수록, 초기속도가 클수록 높아집니다.\n• 초기속도 v₀가 2배가 되면 사거리는 4배(v₀²에 비례)가 됩니다.',
  },
}

export default projectile
