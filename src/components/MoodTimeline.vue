<script setup>
/**
 * 情绪时间线：把每次确认的识别结果画成一条带颜色的折线
 * 纵轴是置信度，点的颜色是情绪 —— 一眼看出今天情绪怎么走的
 */
import { computed } from 'vue'
import Icon from './Icon.vue'
import { moodOf } from '../data/emotions.js'
import {
  state,
  clearHistory,
  runRecommendation,
  todayStats,
} from '../composables/useStore.js'

const emit = defineEmits(['go-detect'])

const entries = computed(() => state.history.slice(0, 120))
const shown = computed(() => [...entries.value].reverse())

const W = 860
const H = 150
const PAD = { l: 8, r: 8, t: 16, b: 22 }

const points = computed(() => {
  const rows = shown.value
  if (!rows.length) return []
  const t0 = rows[0].at
  const t1 = rows[rows.length - 1].at
  const span = Math.max(1, t1 - t0)
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  return rows.map((r, i) => {
    const x =
      rows.length === 1 ? W / 2 : PAD.l + ((r.at - t0) / span) * innerW
    const y = PAD.t + (1 - Math.min(1, r.confidence)) * innerH
    return { ...r, x, y, i, mood: moodOf(r.key) }
  })
})

const pathD = computed(() => {
  if (points.value.length < 2) return ''
  return points.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
})

const areaD = computed(() => {
  if (points.value.length < 2) return ''
  const base = H - PAD.b
  return `${pathD.value} L${points.value[points.value.length - 1].x.toFixed(1)},${base} L${points.value[0].x.toFixed(1)},${base} Z`
})

const axis = computed(() => {
  const rows = shown.value
  if (!rows.length) return null
  const f = (t) =>
    new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return { start: f(rows[0].at), end: f(rows[rows.length - 1].at) }
})

/** 按天分组 */
const grouped = computed(() => {
  const map = new Map()
  entries.value.forEach((e) => {
    const d = new Date(e.at)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    if (!map.has(key)) {
      map.set(key, { key, label: dayLabel(d), rows: [] })
    }
    map.get(key).rows.push(e)
  })
  return [...map.values()]
})

function dayLabel(d) {
  const today = new Date()
  const isSame = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (isSame(d, today)) return '今天'
  const y = new Date(today.getTime() - 86400000)
  if (isSame(d, y)) return '昨天'
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

const timeOf = (t) =>
  new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

async function reuse(row) {
  await runRecommendation(row.key)
  emit('go-detect')
}
</script>

<template>
  <section class="timeline">
    <header class="head">
      <div>
        <span class="t-badge kicker">MOOD HISTORY</span>
        <h2 class="t-section">情绪时间线</h2>
        <p class="sub">
          每次点「按这个情绪推荐」都会记一笔，存在本机，最多保留 200 条。
        </p>
      </div>
      <button
        v-if="entries.length"
        class="btn btn--ghost btn--tiny"
        @click="clearHistory"
      >
        <Icon name="trash" :size="13" /> 清空记录
      </button>
    </header>

    <template v-if="entries.length">
      <!-- 今日分布 -->
      <div v-if="todayStats.length" class="stats">
        <span class="t-badge stats__label">今日</span>
        <div class="stats__bar">
          <span
            v-for="s in todayStats"
            :key="s.key"
            class="stats__seg"
            :style="{ width: s.ratio * 100 + '%', background: s.mood.hex }"
            :title="`${s.mood.label} ${s.count} 次`"
          />
        </div>
        <div class="stats__legend">
          <span v-for="s in todayStats" :key="s.key">
            <i :style="{ background: s.mood.hex }" />{{ s.mood.label }}
            <b>{{ s.count }}</b>
          </span>
        </div>
      </div>

      <!-- 折线 -->
      <div class="chart panel">
        <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="chart__svg">
          <defs>
            <linearGradient id="tlArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.14" />
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
            </linearGradient>
          </defs>
          <!-- 置信度参考线 -->
          <line
            v-for="r in [0.25, 0.5, 0.75]"
            :key="r"
            :x1="PAD.l"
            :x2="W - PAD.r"
            :y1="PAD.t + (1 - r) * (H - PAD.t - PAD.b)"
            :y2="PAD.t + (1 - r) * (H - PAD.t - PAD.b)"
            stroke="#2a2a2a"
            stroke-dasharray="3 5"
            stroke-width="1"
          />
          <path v-if="areaD" :d="areaD" fill="url(#tlArea)" />
          <path
            v-if="pathD"
            :d="pathD"
            fill="none"
            stroke="#6f6f6f"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <g v-for="p in points" :key="p.id">
            <circle :cx="p.x" :cy="p.y" :r="9" :fill="p.mood.hex" opacity="0.14" />
            <circle :cx="p.x" :cy="p.y" r="3.4" :fill="p.mood.hex" />
          </g>
        </svg>
        <div class="chart__axis">
          <span>{{ axis.start }}</span>
          <span class="chart__hint">纵轴：置信度 · 颜色：情绪</span>
          <span>{{ axis.end }}</span>
        </div>
      </div>

      <!-- 明细 -->
      <div class="log">
        <div v-for="g in grouped" :key="g.key" class="log__group">
          <h3 class="log__day">
            {{ g.label }}
            <span class="t-micro">{{ g.rows.length }} 次识别</span>
          </h3>
          <ul>
            <li
              v-for="row in g.rows"
              :key="row.id"
              class="row"
              :style="{ '--m': moodOf(row.key).hex }"
            >
              <span class="row__time t-mono">{{ timeOf(row.at) }}</span>
              <span class="row__mood">
                <i />
                {{ moodOf(row.key).label }}
              </span>
              <span class="row__track">
                <span
                  class="row__fill"
                  :style="{ width: Math.round(row.confidence * 100) + '%' }"
                />
              </span>
              <span class="row__val t-mono">{{ Math.round(row.confidence * 100) }}%</span>
              <button class="btn btn--tiny btn--ghost row__again" @click="reuse(row)">
                再推荐
              </button>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <div v-else class="empty">
      <div class="empty__icon"><Icon name="activity" :size="26" /></div>
      <h3 class="t-feature">还没有任何记录</h3>
      <p class="t-caption">
        回到识别页，给模型一张脸 —— 第一次推荐完成后，这里就会长出第一条线。
      </p>
      <button class="btn btn--primary btn--tiny" @click="emit('go-detect')">
        去识别情绪
      </button>
    </div>
  </section>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.kicker {
  color: var(--text-dim);
}
.sub {
  margin-top: 5px;
  font-size: 12.5px;
  color: var(--text-muted);
}

/* 今日分布 */
.stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: var(--r-8);
  background: var(--bg-surface);
}
.stats__label {
  color: var(--text-dim);
}
.stats__bar {
  display: flex;
  flex: 1 1 240px;
  height: 8px;
  min-width: 180px;
  border-radius: var(--r-pill);
  overflow: hidden;
  background: #262626;
}
.stats__seg {
  height: 100%;
  transition: width 0.4s var(--ease);
}
.stats__legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-muted);
}
.stats__legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.stats__legend i {
  width: 7px;
  height: 7px;
  border-radius: 2px;
}
.stats__legend b {
  color: var(--text-base);
}

/* 折线 */
.chart {
  padding: 14px 14px 8px;
  background: var(--bg-surface);
}
.chart__svg {
  width: 100%;
  height: 150px;
  display: block;
}
.chart__axis {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 4px 0;
  font-size: 10.5px;
  color: var(--text-dim);
}
.chart__hint {
  letter-spacing: 0.3px;
}

/* 明细 */
.log {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.log__day {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
}
.row {
  display: grid;
  grid-template-columns: 52px 74px 1fr 44px 76px;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: var(--r-6);
  transition: background 0.16s var(--ease);
}
.row:hover {
  background: rgba(255, 255, 255, 0.04);
}
.row__time {
  font-size: 11px;
  color: var(--text-dim);
}
.row__mood {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--m);
}
.row__mood i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--m);
}
.row__track {
  height: 5px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.row__fill {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  background: var(--m);
  opacity: 0.75;
}
.row__val {
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
}
.row__again {
  justify-self: end;
  opacity: 0;
  transition: opacity 0.16s var(--ease);
}
.row:hover .row__again {
  opacity: 1;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 46px 20px;
  border-radius: var(--r-8);
  background: var(--bg-surface);
  text-align: center;
}
.empty__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--bg-elevated);
  color: var(--text-dim);
}
.empty p {
  max-width: 420px;
  line-height: 1.6;
  margin-bottom: 6px;
}

@media (max-width: 760px) {
  .row {
    grid-template-columns: 44px 66px 1fr 40px;
  }
  .row__again {
    display: none;
  }
}
</style>
