/**
 * 실험 ② 포물선 운동 (투사체) + 자유낙하 — 물리
 *
 * 공기저항 없음(kEff=0): x = v₀cosθ·t, y = h + v₀sinθ·t − ½gt² (해석해)
 * 공기저항 있음: a = (−kEff·(vx − w), −g − kEff·vy) 를 수치 적분
 *   · kEff = k × (ρ/1.2) — 밀도 ρ가 클수록 저항이 세다 (ρ=0 → 진공, 저항 없음)
 *   · w = 바람의 수평 속도 — 저항은 "공기에 대한 상대속도"에 작용하므로
 *     바람은 공기저항을 통해서만 공을 민다 (k=0이면 바람도 영향 없음!)
 * 에너지: KE = ½mv², PE = mgy, E = KE + PE (kEff=0이면 E 보존)
 *
 * [여러 공 비교]
 * 위 슬라이더는 공1(파랑, 현재 조건). [공 추가]를 누르면 공마다 v₀·θ·h·g·k를
 * 따로 조절할 수 있다. 바람·밀도는 "환경"이라 모든 공에 공통 적용된다.
 * 그래프에서 공별 속력/운동에너지가 색으로 구별된다.
 */
import ProjectileBallsEditor from './ProjectileBallsEditor'

const rad = (deg) => (deg * Math.PI) / 180
const RHO_0 = 1.2 // 기준 공기 밀도 (kg/m³, 해수면)

const isFreefall = (params) => params.mode === 'freefall'

const CURRENT_COLOR = '#2563eb'
const BALL_COLORS = ['#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2']
const ballColor = (i) => (i === 0 ? CURRENT_COLOR : BALL_COLORS[(i - 1) % BALL_COLORS.length])
const ballName = (i) => (i === 0 ? '공1(현재)' : `공${i + 1}`)

/** 환경(모든 공 공통): 바람 수평속도 wx, 밀도 비율 rhoF */
function envFrom(params) {
  const wx = (params.windDir === 'left' ? -1 : 1) * params.wind
  return { wx, rhoF: params.rho / RHO_0 }
}

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
 * 공 조건 + 환경 → 예상값 (사거리 R / 최고점 H / 비행시간 T / 착지속도 /
 * 궤적 x범위 xMin·xMax). kEff=0이면 해석해, 아니면 수치 시뮬레이션. 캐시.
 */
const predCache = new Map()
function predict(cfg, env) {
  const kEff = cfg.k * env.rhoF
  const key = `${cfg.free}|${cfg.v0}|${cfg.theta}|${cfg.h}|${cfg.g}|${kEff}|${env.wx}`
  if (predCache.has(key)) return predCache.get(key)

  const { vx0, vy0 } = initialVel(cfg)
  let res
  if (kEff === 0) {
    const T = (vy0 + Math.sqrt(vy0 * vy0 + 2 * cfg.g * cfg.h)) / cfg.g
    const R = vx0 * T
    res = {
      T,
      R,
      Hmax: cfg.h + (vy0 * vy0) / (2 * cfg.g),
      vLand: Math.hypot(vx0, vy0 - cfg.g * T),
      xMin: Math.min(0, R),
      xMax: Math.max(0, R),
    }
  } else if (cfg.h <= 0 && vy0 <= 0) {
    res = { T: 0, R: 0, Hmax: cfg.h, vLand: 0, xMin: 0, xMax: 0 }
  } else {
    // 수치 예측 (dt=1/240, 최대 120초)
    let x = 0, y = cfg.h, vx = vx0, vy = vy0, t = 0
    let Hmax = cfg.h, xMin = 0, xMax = 0
    const dt = 1 / 240
    while (t < 120) {
      vx += -kEff * (vx - env.wx) * dt
      vy += (-cfg.g - kEff * vy) * dt
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
      if (x < xMin) xMin = x
      if (x > xMax) xMax = x
    }
    res = { T: t, R: x, Hmax, vLand: Math.hypot(vx, vy), xMin: Math.min(xMin, x), xMax: Math.max(xMax, x) }
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
    '초기속도·발사각·중력·공기저항에 바람과 공기 밀도까지! 공마다 조건을 다르게 설정해 동시 발사 비교, 공별 속력·에너지 그래프 제공.',

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
    {
      key: 'windDir',
      label: '바람 방향',
      type: 'select',
      value: 'right',
      options: [
        { value: 'right', label: '→ 오른쪽 (순풍)' },
        { value: 'left', label: '← 왼쪽 (역풍)' },
      ],
    },
    { key: 'wind', label: '바람 세기', min: 0, max: 20, step: 0.5, value: 0, unit: 'm/s' },
    { key: 'rho', label: '공기 밀도 ρ', min: 0, max: 3, step: 0.05, value: 1.2, unit: 'kg/m³' },
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
    const env = envFrom(params)
    const t = state.t + dt
    let allLanded = true
    const balls = state.balls.map((b) => {
      if (b.landed) return b
      const kEff = b.cfg.k * env.rhoF
      let { x, y, vx, vy } = b
      let landed = false
      let landT = null
      // 서브스텝 수치 적분 (반암시적 오일러) — 착지 선형 보간
      let remaining = dt
      let localT = state.t
      const SUB = 1 / 480
      while (remaining > 1e-9 && !landed) {
        const hstep = Math.min(SUB, remaining)
        remaining -= hstep
        localT += hstep
        vx += -kEff * (vx - env.wx) * hstep
        vy += (-b.cfg.g - kEff * vy) * hstep
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
    const env = envFrom(params)
    const balls = state.balls
    const preds = balls.map((b) => predict(b.cfg, env))
    const d = preds[0] // 공1 예상값
    const kEffMain = params.k * env.rhoF

    // ---- 월드 → 픽셀 스케일: 모든 공의 x범위(음수 포함)/최고점이 들어오게 ----
    const xMin = Math.min(0, ...preds.map((p) => p.xMin))
    const xMax = Math.max(...preds.map((p) => p.xMax))
    const maxH = Math.max(...preds.map((p) => p.Hmax))
    const span = xMax - xMin
    const allVertical = span < 0.5 // 전부 수직 낙하면 가운데 배치
    const groundY = H - 42
    const worldW = Math.max(span * 1.08, 10)
    const worldH = Math.max(maxH * 1.15, 5)
    let scale, originX
    if (allVertical) {
      scale = (groundY - 25) / worldH
      originX = W / 2
    } else {
      scale = Math.min((W - 75) / worldW, (groundY - 25) / worldH)
      originX = 55 - xMin * scale // 음수 좌표(역풍에 밀림)도 화면 안에
    }
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
      for (let wx = Math.ceil(xMin / sx) * sx; wx <= xMax + sx; wx += sx) {
        const [px] = toPx(wx, 0)
        if (px < 25 || px > W - 20) continue
        ctx.beginPath()
        ctx.moveTo(px, groundY)
        ctx.lineTo(px, groundY + 5)
        ctx.stroke()
        ctx.fillText(`${Math.round(wx * 10) / 10}`, px - 6, groundY + 17)
      }
      ctx.fillText('x (m)', W - 48, groundY + 30)
    }
    const axisX = allVertical ? W / 2 - 60 : Math.max(originX, 40)
    const sy = niceStep(worldH)
    for (let wy = sy; wy <= worldH; wy += sy) {
      const py = groundY - wy * scale
      ctx.beginPath()
      ctx.moveTo(axisX - 5, py)
      ctx.lineTo(axisX, py)
      ctx.stroke()
      ctx.fillText(`${wy}`, axisX - 30, py + 4)
    }

    // ---- 바람 표시 ----
    if (params.wind > 0) {
      const dir = env.wx > 0 ? 1 : -1
      ctx.strokeStyle = '#38bdf8'
      ctx.fillStyle = '#38bdf8'
      const cy = 88
      for (let i = 0; i < 3; i++) {
        const y0 = cy + i * 12
        const x0 = W / 2 - 30 * dir
        arrow(ctx, x0, y0, x0 + dir * (46 + i * 8), y0, '#38bdf8')
      }
      ctx.fillStyle = '#0284c7'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        `바람 ${env.wx > 0 ? '→' : '←'} ${params.wind} m/s · ρ=${params.rho} kg/m³` +
          (kEffMain === 0 && balls.every((b) => b.cfg.k * env.rhoF === 0) ? '  (저항 0 → 영향 없음!)' : ''),
        W / 2, cy - 12,
      )
      ctx.textAlign = 'start'
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
    const dragNote = kEffMain > 0 ? ` · 종단속도 g/kEff=${(params.g / kEffMain).toFixed(1)} m/s` : ''
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
      { key: 'wind', label: '바람', unit: 'm/s' },
      { key: 'rho', label: 'ρ', unit: 'kg/m³' },
      { key: 'R', label: '사거리 R', unit: 'm' },
      { key: 'H', label: '최고점 H', unit: 'm' },
      { key: 'T', label: '비행시간 T', unit: 's' },
      { key: 'vLand', label: '착지속도', unit: 'm/s' },
    ],
    // 측정 버튼 → 공1(현재 조건) 한 줄 기록
    sample: (state, params) => {
      const env = envFrom(params)
      const d = predict(cfgFrom(params), env)
      return {
        ball: '공1',
        cond: cfgLabel(cfgFrom(params)),
        wind: env.wx,
        rho: params.rho,
        R: d.R.toFixed(1),
        H: d.Hmax.toFixed(1),
        T: d.T.toFixed(2),
        vLand: d.vLand.toFixed(1),
      }
    },
  },

  info: {
    formula: 'a = ( −kEff·(vx − w),  −g − kEff·vy ),   kEff = k·(ρ/1.2)',
    description:
      '투사체는 수평 등속 + 수직 등가속 운동의 합성입니다. 여기에 중력 g, 공기저항 k, 바람 w, 공기 밀도 ρ까지 변인으로 바꿀 수 있습니다.\n\n• 바람: 공기저항은 "공기에 대한 상대속도"에 작용하므로, 바람은 저항을 통해서만 공을 밉니다. 순풍(→)이면 사거리가 늘고 역풍(←)이면 줄어듭니다. 중요: k=0(저항 없음)이면 바람이 아무리 세도 궤적이 변하지 않습니다!\n• 공기 밀도 ρ: 저항의 세기가 ρ에 비례합니다(kEff = k·ρ/1.2). ρ=0은 진공 — 저항도 바람도 사라집니다. 고산지대(ρ≈0.9)나 물속 같은 고밀도(ρ=3)를 흉내내 보세요.\n• [공 추가]: 공마다 v₀·θ·h·g·k를 따로 설정해 동시 발사 비교. 바람·밀도는 환경이라 모든 공에 공통 적용됩니다. 같은 공을 k=0과 k=0.3으로 나눠 바람 속에서 비교해 보세요.\n• 중력가속도 g: 달 1.6 · 화성 3.7 · 지구 9.8 · 목성 24.8 m/s²\n• [공1: 에너지] 그래프: kEff=0이면 역학적 에너지 E가 수평선(보존), 저항이 있으면 감소하고, 순풍이 밀어주면 오히려 증가할 수도 있습니다(바람이 일을 해줌).\n• 질량 m은 (이 저항 모델에서는) 운동에 영향을 주지 않고 에너지 크기만 바꿉니다.',
  },
}

export default projectile
