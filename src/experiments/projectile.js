/**
 * 실험 ② 포물선 운동 (투사체) + 자유낙하 — 물리
 *
 * 포물선: x = v₀·cosθ·t,  y = h + v₀·sinθ·t − ½gt²
 *         vx = v₀·cosθ,   vy = v₀·sinθ − g·t
 * 자유낙하: v₀=0 (높이 h에서 가만히 놓음) → y = h − ½gt², vy = −g·t
 * 비행시간 T = (v₀sinθ + √((v₀sinθ)² + 2gh)) / g
 * 사거리 R = v₀cosθ·T,  최고점 H = h + (v₀sinθ)²/(2g)
 */
const G = 9.8

const rad = (deg) => (deg * Math.PI) / 180

const isFreefall = (params) => params.mode === 'freefall'

/** 파라미터에서 유도값(초기속도 성분/비행시간/사거리/최고점) 계산 */
function derived(params) {
  const free = isFreefall(params)
  const th = rad(params.theta)
  const vx0 = free ? 0 : params.v0 * Math.cos(th)
  const vy0 = free ? 0 : params.v0 * Math.sin(th)
  const T = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G * params.h)) / G
  const R = vx0 * T
  const Hmax = params.h + (vy0 * vy0) / (2 * G)
  const vLand = Math.hypot(vx0, vy0 - G * T) // 착지 순간 속력
  return { vx0, vy0, T, R, Hmax, vLand }
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
  title: '포물선 운동과 자유낙하',
  subject: '물리',
  icon: '🎯',
  summary:
    '발사각과 초기속도에 따른 포물선 궤적, 그리고 자유낙하를 실험합니다. vx·vy·전체 속력 그래프 제공.',

  params: [
    {
      key: 'mode',
      label: '실험 모드',
      type: 'select',
      value: 'projectile',
      options: [
        { value: 'projectile', label: '포물선 운동 (발사)' },
        { value: 'freefall', label: '자유낙하 (v₀ = 0)' },
      ],
    },
    {
      key: 'v0', label: '초기속도 v₀', min: 5, max: 50, step: 1, value: 20, unit: 'm/s',
      visible: (p) => !isFreefall(p),
    },
    {
      key: 'theta', label: '발사각 θ', min: 0, max: 90, step: 1, value: 45, unit: '°',
      visible: (p) => !isFreefall(p),
    },
    { key: 'h', label: '초기높이 h', min: 0, max: 30, step: 0.5, value: 0, unit: 'm' },
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
    const free = isFreefall(params)

    // ---- 월드 → 픽셀 스케일: 예상 사거리/최고점이 화면에 들어오게 ----
    // 자유낙하는 수평 이동이 없으므로 x축을 좁게 잡고 낙하가 잘 보이게 한다
    const originX = free ? W / 2 : 55
    const groundY = H - 42
    const worldW = Math.max(d.R * 1.08, 10)
    const worldH = Math.max(d.Hmax * 1.15, 5)
    const scale = free
      ? (groundY - 25) / worldH
      : Math.min((W - originX - 20) / worldW, (groundY - 25) / worldH)
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
    if (!free) {
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
    }
    const axisX = free ? W / 2 - 60 : originX
    const sy = niceStep(worldH)
    for (let wy = sy; wy <= worldH; wy += sy) {
      const py = groundY - wy * scale
      ctx.beginPath()
      ctx.moveTo(axisX - 5, py)
      ctx.lineTo(axisX, py)
      ctx.stroke()
      ctx.fillText(`${wy}`, axisX - 30, py + 4)
    }
    ctx.save()
    ctx.translate(axisX - 38, 130)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('y (m)', 0, 0)
    ctx.restore()

    // ---- 발사대 / 낙하대 ----
    const [lx, ly] = toPx(0, params.h)
    ctx.fillStyle = '#64748b'
    ctx.fillRect(lx - 8, ly, 8, groundY - ly) // 기둥
    if (free) {
      ctx.fillRect(lx - 22, ly - 4, 36, 5) // 낙하 발판
    } else {
      ctx.save()
      ctx.translate(lx - 4, ly)
      ctx.rotate(-rad(params.theta))
      ctx.fillStyle = '#475569'
      ctx.fillRect(0, -4, 26, 8) // 포신
      ctx.restore()
    }

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
      if (Math.abs(d.vx0) > 0.01) arrow(ctx, bx, by, bx + d.vx0 * vScale, by, '#f97316') // vx
      if (Math.abs(vy) > 0.01) arrow(ctx, bx, by, bx, by - vy * vScale, '#10b981') // vy
      arrow(ctx, bx, by, bx + d.vx0 * vScale, by - vy * vScale, '#dc2626') // 합속도
      ctx.fillStyle = '#dc2626'
      ctx.font = 'bold 12px sans-serif'
      const v = Math.hypot(d.vx0, vy)
      ctx.fillText(`v=${v.toFixed(1)} m/s`, bx + d.vx0 * vScale + 8, by - vy * vScale)
    }

    // ---- 상태 텍스트 ----
    const vyNow = state.landed ? 0 : d.vy0 - G * state.t
    const vNow = state.landed ? 0 : Math.hypot(d.vx0, vyNow)
    ctx.fillStyle = '#334155'
    ctx.font = '14px sans-serif'
    ctx.fillText(
      `t = ${state.t.toFixed(2)} s   y = ${state.y.toFixed(1)} m   vx = ${d.vx0.toFixed(1)}  vy = ${vyNow.toFixed(1)}  |v| = ${vNow.toFixed(1)} m/s`,
      20, 24,
    )
    ctx.fillStyle = '#64748b'
    ctx.font = '12px sans-serif'
    ctx.fillText(
      free
        ? `예상: 낙하시간 T=${d.T.toFixed(2)} s · 착지속도 ${d.vLand.toFixed(1)} m/s (√2gh)`
        : `예상: 사거리 R=${d.R.toFixed(1)} m · 최고점 H=${d.Hmax.toFixed(1)} m · 비행시간 T=${d.T.toFixed(2)} s`,
      20, 44,
    )
    if (free && params.h === 0) {
      ctx.fillStyle = '#dc2626'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText('초기높이 h를 올려서 떨어뜨려 보세요!', 20, 68)
    } else if (state.landed) {
      ctx.fillStyle = '#16a34a'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText(
        free
          ? `착지! T = ${d.T.toFixed(2)} s, 착지속도 = ${d.vLand.toFixed(1)} m/s`
          : `착지! R = ${state.x.toFixed(1)} m`,
        20, 68,
      )
    }
  },

  chart: {
    // getPoint가 모든 값을 담은 점을 만들고, 각 view가 필요한 축/시리즈를 골라 쓴다
    getPoint: (state, params) => {
      const d = derived(params)
      const vy = state.landed ? d.vy0 - G * d.T : d.vy0 - G * state.t
      return {
        x: Number(state.x.toFixed(2)),
        y: Number(state.y.toFixed(2)),
        t: Number(state.t.toFixed(3)),
        vx: Number(d.vx0.toFixed(2)),
        vy: Number(vy.toFixed(2)),
        v: Number(Math.hypot(d.vx0, vy).toFixed(2)),
      }
    },
    views: [
      {
        label: '궤적 (x-y)',
        xKey: 'x',
        xLabel: '수평거리 x (m)',
        yLabel: '높이 y (m)',
        series: [{ key: 'y', label: '높이 y (m)', color: '#2563eb' }],
      },
      {
        label: '속도-시간',
        xKey: 't',
        xLabel: '시간 t (s)',
        yLabel: '속도 (m/s)',
        series: [
          { key: 'vx', label: 'x방향 속도 vx', color: '#f97316' },
          { key: 'vy', label: 'y방향 속도 vy', color: '#10b981' },
          { key: 'v', label: '전체 속력 |v|', color: '#dc2626' },
        ],
      },
    ],
  },

  table: {
    columns: [
      { key: 'mode', label: '모드', unit: '' },
      { key: 'v0', label: 'v₀', unit: 'm/s' },
      { key: 'theta', label: '각도 θ', unit: '°' },
      { key: 'h', label: '높이 h', unit: 'm' },
      { key: 'R', label: '사거리 R', unit: 'm' },
      { key: 'H', label: '최고점 H', unit: 'm' },
      { key: 'T', label: '비행시간 T', unit: 's' },
      { key: 'vLand', label: '착지속도', unit: 'm/s' },
    ],
    sample: (state, params) => {
      const d = derived(params)
      const free = isFreefall(params)
      return {
        mode: free ? '자유낙하' : '포물선',
        v0: free ? 0 : params.v0,
        theta: free ? '-' : params.theta,
        h: params.h,
        R: d.R.toFixed(1),
        H: d.Hmax.toFixed(1),
        T: d.T.toFixed(2),
        vLand: d.vLand.toFixed(1),
      }
    },
  },

  info: {
    formula: 'x = v₀cosθ·t,   y = h + v₀sinθ·t − ½gt²   (자유낙하: v₀=0, y = h − ½gt²)',
    description:
      '투사체는 수평으로는 등속(vx = v₀cosθ), 수직으로는 중력에 의한 등가속 운동(vy = v₀sinθ − gt)을 동시에 합니다. 두 운동이 합쳐져 포물선 궤적이 만들어집니다.\n\n• [속도-시간] 그래프에서 vx는 수평선(등속!), vy는 기울기 −g인 직선(등가속!)임을 확인하세요. 전체 속력 |v|는 최고점에서 최소가 됩니다(vy=0이라 vx만 남음).\n• 자유낙하 모드(v₀=0): 높이 h에서 가만히 놓으면 낙하시간 T = √(2h/g), 착지속도 v = √(2gh)입니다. 높이를 4배로 하면 낙하시간은 2배, 착지속도도 2배가 됩니다.\n• 사거리(h=0일 때): R = v₀²·sin2θ/g — θ=45°에서 최대이고, 합이 90°인 두 각(30°와 60°)의 사거리가 같습니다.\n• 최고점: H = h + (v₀sinθ)²/(2g), 초기속도 v₀가 2배가 되면 사거리는 4배(v₀²에 비례)가 됩니다.',
  },
}

export default projectile
