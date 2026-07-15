/**
 * 실험 ② 포물선 운동 (투사체) + 자유낙하 — 물리
 *
 * 포물선: x = v₀·cosθ·t,  y = h + v₀·sinθ·t − ½gt²
 *         vx = v₀·cosθ,   vy = v₀·sinθ − g·t
 * 자유낙하: v₀=0 (높이 h에서 가만히 놓음) → y = h − ½gt², vy = −g·t
 * 비행시간 T = (v₀sinθ + √((v₀sinθ)² + 2gh)) / g
 * 사거리 R = v₀cosθ·T,  최고점 H = h + (v₀sinθ)²/(2g)
 *
 * [여러 공 동시 발사]
 * 슬라이더로 조건을 맞춘 뒤 "공 추가"를 누르면 그 조건이 고정된 공이 추가된다.
 * 재생/초기화하면 모든 공이 t=0에 동시에 발사되어 조건별로 비교할 수 있다.
 * 파란 공은 항상 "현재 슬라이더 조건"을 따라간다.
 */
const G = 9.8

const rad = (deg) => (deg * Math.PI) / 180

const isFreefall = (params) => params.mode === 'freefall'

/** 추가된 공들의 조건 — 모듈 수명 동안 유지 (파라미터 변경/초기화에도 유지) */
let savedBalls = []
const MAX_SAVED = 5
const CURRENT_COLOR = '#2563eb'
const BALL_COLORS = ['#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2']

/** 현재 params를 공 하나의 조건(cfg)으로 고정 */
function cfgFrom(params) {
  const free = isFreefall(params)
  return { free, v0: free ? 0 : params.v0, theta: free ? 0 : params.theta, h: params.h }
}

/** 공 조건 → 유도값 (초기속도 성분/비행시간/사거리/최고점/착지속도) */
function deriveCfg(cfg) {
  const th = rad(cfg.theta)
  const vx0 = cfg.free ? 0 : cfg.v0 * Math.cos(th)
  const vy0 = cfg.free ? 0 : cfg.v0 * Math.sin(th)
  const T = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G * cfg.h)) / G
  const R = vx0 * T
  const Hmax = cfg.h + (vy0 * vy0) / (2 * G)
  const vLand = Math.hypot(vx0, vy0 - G * T)
  return { vx0, vy0, T, R, Hmax, vLand }
}

const derived = (params) => deriveCfg(cfgFrom(params))

const cfgLabel = (cfg) =>
  cfg.free ? `자유낙하 h=${cfg.h}m` : `v₀=${cfg.v0} θ=${cfg.theta}° h=${cfg.h}m`

function makeBall(cfg, color) {
  return { cfg, color, x: 0, y: cfg.h, landed: false, trail: [{ x: 0, y: cfg.h }] }
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
    '발사각·초기속도에 따른 포물선 궤적과 자유낙하 실험. 조건이 다른 공 여러 개를 동시에 발사해 비교할 수 있습니다.',

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

  // 실험 전용 버튼 (ControlPanel이 자동 렌더링)
  actions: [
    {
      label: '➕ 현재 조건 공 추가 (동시 발사)',
      apply: (state, params) => {
        if (savedBalls.length < MAX_SAVED) savedBalls = [...savedBalls, cfgFrom(params)]
        return projectile.reset(params) // 전체 재발사
      },
    },
    {
      label: '🗑 추가한 공 모두 제거',
      apply: (state, params) => {
        savedBalls = []
        return projectile.reset(params)
      },
    },
  ],

  reset: (params) => ({
    t: 0,
    done: false,
    balls: [
      makeBall(cfgFrom(params), CURRENT_COLOR), // [0] = 현재 슬라이더 조건
      ...savedBalls.map((cfg, i) => makeBall(cfg, BALL_COLORS[i % BALL_COLORS.length])),
    ],
  }),

  step: (state, params, dt) => {
    if (state.done) return state
    const t = state.t + dt
    let allLanded = true
    const balls = state.balls.map((b) => {
      if (b.landed) return b
      const d = deriveCfg(b.cfg)
      const tb = Math.min(t, d.T) // 착지 시각으로 스냅 → 정확히 y=0에서 멈춤
      const landed = t >= d.T
      if (!landed) allLanded = false
      const x = d.vx0 * tb
      const y = Math.max(b.cfg.h + d.vy0 * tb - 0.5 * G * tb * tb, 0)
      const trail = [...b.trail, { x, y }]
      if (trail.length > 400) trail.shift()
      return { ...b, x, y, landed, trail }
    })
    return { t, balls, done: allLanded }
  },

  draw: (ctx, state, params, canvas) => {
    const W = canvas.width
    const H = canvas.height
    const d = derived(params)
    const free = isFreefall(params)
    const balls = state.balls
    const derivedAll = balls.map((b) => deriveCfg(b.cfg))

    // ---- 월드 → 픽셀 스케일: 모든 공의 사거리/최고점이 화면에 들어오게 ----
    const maxR = Math.max(...derivedAll.map((x) => x.R))
    const maxH = Math.max(...derivedAll.map((x) => x.Hmax))
    const allVertical = maxR < 0.5 // 전부 자유낙하면 가운데 배치
    const originX = allVertical ? W / 2 : 55
    const groundY = H - 42
    const worldW = Math.max(maxR * 1.08, 10)
    const worldH = Math.max(maxH * 1.15, 5)
    const scale = allVertical
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
    if (!allVertical) {
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
    const axisX = allVertical ? W / 2 - 60 : originX
    const sy = niceStep(worldH)
    for (let wy = sy; wy <= worldH; wy += sy) {
      const py = groundY - wy * scale
      ctx.beginPath()
      ctx.moveTo(axisX - 5, py)
      ctx.lineTo(axisX, py)
      ctx.stroke()
      ctx.fillText(`${wy}`, axisX - 30, py + 4)
    }

    // ---- 발사대 / 낙하대 (현재 조건 기준) ----
    const [lx, ly] = toPx(0, params.h)
    ctx.fillStyle = '#64748b'
    ctx.fillRect(lx - 8, ly, 8, groundY - ly)
    if (free) {
      ctx.fillRect(lx - 22, ly - 4, 36, 5)
    } else {
      ctx.save()
      ctx.translate(lx - 4, ly)
      ctx.rotate(-rad(params.theta))
      ctx.fillStyle = '#475569'
      ctx.fillRect(0, -4, 26, 8)
      ctx.restore()
    }

    // ---- 모든 공: 궤적(점선) + 공 ----
    balls.forEach((b) => {
      ctx.strokeStyle = b.color + '66' // 반투명 궤적
      ctx.lineWidth = 2
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      b.trail.forEach((p, i) => {
        const [px, py] = toPx(p.x, p.y)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      })
      ctx.stroke()
      ctx.setLineDash([])

      const [bx, by] = toPx(b.x, b.y)
      ctx.fillStyle = b.color
      ctx.beginPath()
      ctx.arc(bx, by, 7, 0, Math.PI * 2)
      ctx.fill()
    })

    // ---- 현재 공(파랑)의 속도 벡터 ----
    const main = balls[0]
    if (!main.landed) {
      const tb = Math.min(state.t, d.T)
      const vy = d.vy0 - G * tb
      const [bx, by] = toPx(main.x, main.y)
      const vScale = 2.2
      if (Math.abs(d.vx0) > 0.01) arrow(ctx, bx, by, bx + d.vx0 * vScale, by, '#f97316')
      if (Math.abs(vy) > 0.01) arrow(ctx, bx, by, bx, by - vy * vScale, '#10b981')
      arrow(ctx, bx, by, bx + d.vx0 * vScale, by - vy * vScale, '#dc2626')
    }

    // ---- 공 목록 범례 (우측 상단) ----
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'right'
    balls.forEach((b, i) => {
      const ty = 20 + i * 18
      ctx.fillStyle = b.color
      ctx.beginPath()
      ctx.arc(W - 15, ty - 4, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#475569'
      ctx.fillText(
        (i === 0 ? '현재: ' : '') + cfgLabel(b.cfg) + (b.landed ? ` ✓ R=${deriveCfg(b.cfg).R.toFixed(1)}m` : ''),
        W - 26, ty,
      )
    })
    ctx.textAlign = 'start'

    // ---- 상태 텍스트 (현재 공 기준) ----
    const tb = Math.min(state.t, d.T)
    const vyNow = main.landed ? 0 : d.vy0 - G * tb
    const vNow = main.landed ? 0 : Math.hypot(d.vx0, vyNow)
    ctx.fillStyle = '#334155'
    ctx.font = '14px sans-serif'
    ctx.fillText(
      `t = ${state.t.toFixed(2)} s   y = ${main.y.toFixed(1)} m   vx = ${d.vx0.toFixed(1)}  vy = ${vyNow.toFixed(1)}  |v| = ${vNow.toFixed(1)} m/s`,
      20, 24,
    )
    ctx.fillStyle = '#64748b'
    ctx.font = '12px sans-serif'
    ctx.fillText(
      free
        ? `현재 조건 예상: 낙하시간 T=${d.T.toFixed(2)} s · 착지속도 ${d.vLand.toFixed(1)} m/s (√2gh)`
        : `현재 조건 예상: 사거리 R=${d.R.toFixed(1)} m · 최고점 H=${d.Hmax.toFixed(1)} m · 비행시간 T=${d.T.toFixed(2)} s`,
      20, 44,
    )
    if (free && params.h === 0) {
      ctx.fillStyle = '#dc2626'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText('초기높이 h를 올려서 떨어뜨려 보세요!', 20, 68)
    } else if (state.done) {
      ctx.fillStyle = '#16a34a'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText(balls.length > 1 ? '모든 공 착지!' : free ? `착지! T = ${d.T.toFixed(2)} s` : `착지! R = ${main.x.toFixed(1)} m`, 20, 68)
    }
  },

  chart: {
    // 그래프는 "현재 슬라이더 조건"(파란 공) 기준
    getPoint: (state, params) => {
      const d = derived(params)
      const main = state.balls[0]
      const tb = Math.min(state.t, d.T)
      const vy = d.vy0 - G * tb
      return {
        x: Number(main.x.toFixed(2)),
        y: Number(main.y.toFixed(2)),
        t: Number(tb.toFixed(3)),
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
        series: [{ key: 'y', label: '높이 y (m) — 현재 공', color: '#2563eb' }],
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
      '투사체는 수평으로는 등속(vx = v₀cosθ), 수직으로는 중력에 의한 등가속 운동(vy = v₀sinθ − gt)을 동시에 합니다. 두 운동이 합쳐져 포물선 궤적이 만들어집니다.\n\n• [공 추가] 버튼: 현재 슬라이더 조건의 공을 고정해 두고, 조건을 바꿔 여러 공을 만들면 전부 동시에 발사됩니다. 30°와 60°의 사거리가 같은지, 45°가 정말 최대인지 한 화면에서 비교해 보세요! (파란 공은 항상 현재 슬라이더를 따라갑니다)\n• [속도-시간] 그래프에서 vx는 수평선(등속!), vy는 기울기 −g인 직선(등가속!)임을 확인하세요. 전체 속력 |v|는 최고점에서 최소가 됩니다(vy=0이라 vx만 남음).\n• 자유낙하 모드(v₀=0): 높이 h에서 가만히 놓으면 낙하시간 T = √(2h/g), 착지속도 v = √(2gh)입니다. 높이를 4배로 하면 낙하시간과 착지속도는 2배가 됩니다.\n• 사거리(h=0일 때): R = v₀²·sin2θ/g — θ=45°에서 최대, 초기속도 v₀가 2배면 사거리는 4배.',
  },
}

export default projectile
