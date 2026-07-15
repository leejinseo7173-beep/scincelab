/**
 * 실험 ② 포물선 운동 (투사체) + 자유낙하 — 물리
 *
 * 공기저항 없음(k=0): x = v₀cosθ·t, y = h + v₀sinθ·t − ½gt² (해석해)
 * 공기저항 있음(k>0): a = (−k·vx, −g − k·vy) 를 수치 적분 (선형 저항 모델)
 *   → 비대칭 궤적, 종단속도 v_t = g/k 관찰 가능
 * 에너지: KE = ½mv², PE = mgy, E = KE + PE (k=0이면 E 보존)
 *
 * [여러 공 비교]
 * 위 슬라이더는 공1(파랑, 현재 조건). [공 추가]를 누르면 params.balls에 조건이
 * 복사되고, 공마다 아래 편집기에서 변인(v₀·θ·h·g·k)을 따로 조절할 수 있다.
 * 조건을 바꾸면 전체가 자동으로 다시 동시 발사되고, 그래프에서도 공별
 * 속력/운동에너지가 색으로 구별된다.
 */
import ProjectileBallsEditor from './ProjectileBallsEditor'

const rad = (deg) => (deg * Math.PI) / 180

const isFreefall = (params) => params.mode === 'freefall'

const CURRENT_COLOR = '#2563eb'
const BALL_COLORS = ['#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2']
const ballColor = (i) => (i === 0 ? CURRENT_COLOR : BALL_COLORS[(i - 1) % BALL_COLORS.length])
const ballName = (i) => (i === 0 ? '공1(현재)' : `공${i + 1}`)

/** 현재 params(위 슬라이더)를 공1의 조건(cfg)으로 변환 */
function cfgFrom(params) {
  const free = isFreefall(params)
  return {
    free,
    v0: free ? 0 : params.v0,
    theta: free ? 0 : params.theta,
    h: params.h,
    g: params.g,
    k: params.k,
  }
}

/** 전체 공 조건 목록: [공1(현재 슬라이더), ...추가된 공들] */
const allCfgs = (params) => [cfgFrom(params), ...(params.balls ?? [])]

function initialVel(cfg) {
  const th = rad(cfg.theta)
  return {
    vx0: cfg.free ? 0 : cfg.v0 * Math.cos(th),
    vy0: cfg.free ? 0 : cfg.v0 * Math.sin(th),
  }
}

/**
 * 공 조건 → 예상값 (사거리 R / 최고점 H / 비행시간 T / 착지속도).
 * k=0이면 해석해, k>0이면 수치 시뮬레이션. 매 프레임 호출되므로 캐시.
 */
const predCache = new Map()
function predict(cfg) {
  const key = `${cfg.free}|${cfg.v0}|${cfg.theta}|${cfg.h}|${cfg.g}|${cfg.k}`
  if (predCache.has(key)) return predCache.get(key)

  const { vx0, vy0 } = initialVel(cfg)
  let res
  if (cfg.k === 0) {
    const T = (vy0 + Math.sqrt(vy0 * vy0 + 2 * cfg.g * cfg.h)) / cfg.g
    res = {
      T,
      R: vx0 * T,
      Hmax: cfg.h + (vy0 * vy0) / (2 * cfg.g),
      vLand: Math.hypot(vx0, vy0 - cfg.g * T),
    }
  } else if (cfg.h <= 0 && vy0 <= 0) {
    res = { T: 0, R: 0, Hmax: cfg.h, vLand: 0 }
  } else {
    // 수치 예측 (dt=1/240, 최대 120초)
    let x = 0, y = cfg.h, vx = vx0, vy = vy0, t = 0, Hmax = cfg.h
    const dt = 1 / 240
    while (t < 120) {
      vx += -cfg.k * vx * dt
      vy += (-cfg.g - cfg.k * vy) * dt
      const ny = y + vy * dt
      const nx = x + vx * dt
      t += dt
      if (ny <= 0 && vy < 0) {
        const f = y / (y - ny)
        x += vx * dt * f
        y = 0
        break
      }
      x = nx
      y = ny
      if (y > Hmax) Hmax = y
    }
    res = { T: t, R: x, Hmax, vLand: Math.hypot(vx, vy) }
  }
  if (predCache.size > 300) predCache.clear()
  predCache.set(key, res)
  return res
}

const cfgLabel = (cfg) => {
  let s = cfg.free ? `자유낙하 h=${cfg.h}m` : `v₀=${cfg.v0} θ=${cfg.theta}° h=${cfg.h}m`
  if (cfg.g !== 9.8) s += ` g=${cfg.g}`
  if (cfg.k > 0) s += ` k=${cfg.k}`
  return s
}

function makeBall(cfg, color) {
  const { vx0, vy0 } = initialVel(cfg)
  return {
    cfg,
    color,
    x: 0,
    y: cfg.h,
    vx: vx0,
    vy: vy0,
    landed: cfg.h <= 0 && vy0 <= 0, // 바닥에서 위로 던지지 않으면 제자리
    landT: null,
    trail: [{ x: 0, y: cfg.h }],
  }
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
    '초기속도·발사각은 물론 중력·공기저항까지 공마다 다르게 설정해 동시 발사 비교. 공별 속력·에너지 그래프 제공.',

  params: [
    {
      key: 'mode',
      label: '실험 모드 (공1)',
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
    { key: 'g', label: '중력가속도 g', min: 1, max: 25, step: 0.1, value: 9.8, unit: 'm/s²' },
    { key: 'k', label: '공기저항 계수 k', min: 0, max: 1, step: 0.01, value: 0, unit: '/s' },
    { key: 'm', label: '질량 m (에너지 계산용)', min: 0.5, max: 5, step: 0.1, value: 1, unit: 'kg' },
    // 추가된 공들 — 공마다 변인을 따로 편집하는 커스텀 패널
    { key: 'balls', type: 'custom', value: [], component: ProjectileBallsEditor },
  ],

  reset: (params) => ({
    t: 0,
    done: false,
    balls: allCfgs(params).map((cfg, i) => makeBall(cfg, ballColor(i))),
  }),

  step: (state, params, dt) => {
    if (state.done) return state
    const t = state.t + dt
    let allLanded = true
    const balls = state.balls.map((b) => {
      if (b.landed) return b
      let { x, y, vx, vy } = b
      let landed = false
      let landT = null
      // 서브스텝 수치 적분 (반암시적 오일러) — 공기저항 지원 + 착지 선형 보간
      let remaining = dt
      let localT = state.t
      const SUB = 1 / 480
      while (remaining > 1e-9 && !landed) {
        const hstep = Math.min(SUB, remaining)
        remaining -= hstep
        localT += hstep
        vx += -b.cfg.k * vx * hstep
        vy += (-b.cfg.g - b.cfg.k * vy) * hstep
        const nx = x + vx * hstep
        const ny = y + vy * hstep
        if (ny <= 0 && vy < 0) {
          const f = y / (y - ny)
          x += vx * hstep * f
          y = 0
          landT = localT - hstep * (1 - f)
          landed = true
        } else {
          x = nx
          y = ny
        }
      }
      if (!landed) allLanded = false
      const trail = [...b.trail, { x, y }]
      if (trail.length > 400) trail.shift()
      return { ...b, x, y, vx, vy, landed, landT, trail }
    })
    return { t, balls, done: allLanded }
  },

  draw: (ctx, state, params, canvas) => {
    const W = canvas.width
    const H = canvas.height
    const free = isFreefall(params)
    const balls = state.balls
    const preds = balls.map((b) => predict(b.cfg))
    const d = preds[0] // 공1 예상값

    // ---- 월드 → 픽셀 스케일: 모든 공의 사거리/최고점이 화면에 들어오게 ----
    const maxR = Math.max(...preds.map((p) => p.R))
    const maxH = Math.max(...preds.map((p) => p.Hmax))
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

    // ---- 발사대 / 낙하대 (공1 기준) ----
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
      ctx.strokeStyle = b.color + '66'
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

    // ---- 공1(파랑)의 속도 벡터 ----
    const main = balls[0]
    if (!main.landed) {
      const [bx, by] = toPx(main.x, main.y)
      const vScale = 2.2
      if (Math.abs(main.vx) > 0.01) arrow(ctx, bx, by, bx + main.vx * vScale, by, '#f97316')
      if (Math.abs(main.vy) > 0.01) arrow(ctx, bx, by, bx, by - main.vy * vScale, '#10b981')
      arrow(ctx, bx, by, bx + main.vx * vScale, by - main.vy * vScale, '#dc2626')
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
        `${ballName(i)}: ${cfgLabel(b.cfg)}${b.landed ? ` ✓ R=${b.x.toFixed(1)}m` : ''}`,
        W - 26, ty,
      )
    })
    ctx.textAlign = 'start'

    // ---- 상태 텍스트 (공1 기준) ----
    const vNow = main.landed ? 0 : Math.hypot(main.vx, main.vy)
    ctx.fillStyle = '#334155'
    ctx.font = '14px sans-serif'
    ctx.fillText(
      `t = ${state.t.toFixed(2)} s   y = ${main.y.toFixed(1)} m   vx = ${(main.landed ? 0 : main.vx).toFixed(1)}  vy = ${(main.landed ? 0 : main.vy).toFixed(1)}  |v| = ${vNow.toFixed(1)} m/s`,
      20, 24,
    )
    ctx.fillStyle = '#64748b'
    ctx.font = '12px sans-serif'
    const dragNote = params.k > 0 ? ` · 종단속도 g/k=${(params.g / params.k).toFixed(1)} m/s` : ''
    ctx.fillText(
      free
        ? `공1 예상: 낙하시간 T=${d.T.toFixed(2)} s · 착지속도 ${d.vLand.toFixed(1)} m/s${dragNote}`
        : `공1 예상: 사거리 R=${d.R.toFixed(1)} m · 최고점 H=${d.Hmax.toFixed(1)} m · T=${d.T.toFixed(2)} s${dragNote}`,
      20, 44,
    )
    if (free && params.h === 0) {
      ctx.fillStyle = '#dc2626'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText('초기높이 h를 올려서 떨어뜨려 보세요!', 20, 68)
    } else if (state.done) {
      ctx.fillStyle = '#16a34a'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText(
        balls.length > 1 ? '모든 공 착지!' : free ? `착지! T = ${d.T.toFixed(2)} s` : `착지! R = ${main.x.toFixed(1)} m`,
        20, 68,
      )
    }
  },

  chart: {
    /**
     * 한 점에 모든 공의 값을 담는다:
     *   x{i}, y{i}: 공i 위치 · v{i}: 공i 속력 · ke{i}: 공i 운동에너지
     * 공1 상세용: vx, vy, v, ke, pe, e
     */
    getPoint: (state, params) => {
      const pt = { t: Number(state.t.toFixed(3)) }
      state.balls.forEach((b, i) => {
        const vx = b.landed ? 0 : b.vx
        const vy = b.landed ? 0 : b.vy
        const v2 = vx * vx + vy * vy
        pt[`x${i}`] = Number(b.x.toFixed(2))
        pt[`y${i}`] = Number(b.y.toFixed(2))
        pt[`v${i}`] = Number(Math.sqrt(v2).toFixed(2))
        pt[`ke${i}`] = Number((0.5 * params.m * v2).toFixed(1))
      })
      const main = state.balls[0]
      const vx = main.landed ? 0 : main.vx
      const vy = main.landed ? 0 : main.vy
      pt.vx = Number(vx.toFixed(2))
      pt.vy = Number(vy.toFixed(2))
      pt.v = pt.v0
      pt.ke = pt.ke0
      pt.pe = Number((params.m * params.g * main.y).toFixed(1))
      pt.e = Number((pt.ke + pt.pe).toFixed(1))
      return pt
    },
    views: [
      {
        label: '궤적',
        xKey: 'x0',
        xLabel: '수평거리 x (m)',
        yLabel: '높이 y (m)',
        series: (params) =>
          allCfgs(params).map((cfg, i) => ({
            key: `y${i}`,
            xKey: `x${i}`,
            label: `${ballName(i)} 궤적`,
            color: ballColor(i),
          })),
      },
      {
        label: '속력 비교',
        xKey: 't',
        xLabel: '시간 t (s)',
        yLabel: '속력 |v| (m/s)',
        series: (params) =>
          allCfgs(params).map((cfg, i) => ({
            key: `v${i}`,
            label: `${ballName(i)} |v|`,
            color: ballColor(i),
          })),
      },
      {
        label: '운동에너지 비교',
        xKey: 't',
        xLabel: '시간 t (s)',
        yLabel: '운동에너지 (J)',
        series: (params) =>
          allCfgs(params).map((cfg, i) => ({
            key: `ke${i}`,
            label: `${ballName(i)} KE`,
            color: ballColor(i),
          })),
      },
      {
        label: '공1: 속도 성분',
        xKey: 't',
        xLabel: '시간 t (s)',
        yLabel: '속도 (m/s)',
        series: [
          { key: 'vx', label: 'x방향 속도 vx', color: '#f97316' },
          { key: 'vy', label: 'y방향 속도 vy', color: '#10b981' },
          { key: 'v', label: '전체 속력 |v|', color: '#dc2626' },
        ],
      },
      {
        label: '공1: 에너지',
        xKey: 't',
        xLabel: '시간 t (s)',
        yLabel: '에너지 (J)',
        series: [
          { key: 'ke', label: '운동에너지 ½mv²', color: '#dc2626' },
          { key: 'pe', label: '위치에너지 mgy', color: '#2563eb' },
          { key: 'e', label: '역학적 에너지 E', color: '#111827' },
        ],
      },
    ],
  },

  table: {
    columns: [
      { key: 'ball', label: '공', unit: '' },
      { key: 'cond', label: '조건', unit: '' },
      { key: 'R', label: '사거리 R', unit: 'm' },
      { key: 'H', label: '최고점 H', unit: 'm' },
      { key: 'T', label: '비행시간 T', unit: 's' },
      { key: 'vLand', label: '착지속도', unit: 'm/s' },
    ],
    // 측정 버튼 → 공1(현재 조건) 한 줄 기록
    sample: (state, params) => {
      const d = predict(cfgFrom(params))
      return {
        ball: '공1',
        cond: cfgLabel(cfgFrom(params)),
        R: d.R.toFixed(1),
        H: d.Hmax.toFixed(1),
        T: d.T.toFixed(2),
        vLand: d.vLand.toFixed(1),
      }
    },
  },

  info: {
    formula: 'x = v₀cosθ·t,  y = h + v₀sinθ·t − ½gt²   |   공기저항: a = (−k·vx, −g − k·vy)',
    description:
      '투사체는 수평으로는 등속, 수직으로는 중력에 의한 등가속 운동을 동시에 합니다. 중력 g와 공기저항 k도 변인으로 바꿀 수 있습니다.\n\n• [공 추가]: 공마다 v₀·θ·h·g·k를 따로 설정해 동시에 발사됩니다. 그래프의 [속력 비교]·[운동에너지 비교]에서 공별 곡선이 같은 색으로 구별됩니다. 30° vs 60° 사거리, 지구(g=9.8) vs 달(g=1.6), 저항 있음 vs 없음 등을 비교해 보세요.\n• 중력가속도 g: 달 1.6 · 화성 3.7 · 지구 9.8 · 목성 24.8 m/s²\n• 공기저항 k: k>0이면 궤적이 비대칭(내려올 때 더 가파름)이 되고 사거리가 줄어듭니다. 자유낙하에서는 속력이 종단속도 g/k에 수렴하는 것을 [속력 비교] 그래프에서 확인하세요.\n• [공1: 에너지] 그래프: 운동에너지 ½mv²와 위치에너지 mgy가 서로 교환됩니다. k=0이면 총 역학적 에너지 E가 수평선(보존!), k>0이면 E가 점점 감소합니다.\n• 질량 m은 (이 저항 모델에서는) 운동에 영향을 주지 않고 에너지 크기만 바꿉니다.',
  },
}

export default projectile
