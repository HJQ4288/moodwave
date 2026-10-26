<script setup>
/**
 * 情绪报告：把 7 维概率讲成人能看懂的一段话
 * 左：主情绪 + 置信度环；右：完整分布 + 共振说明
 */
import { computed } from 'vue'
import { moodOf, EMOTIONS } from '../data/emotions.js'
import { state } from '../composables/useStore.js'
import Icon from './Icon.vue'

const snap = computed(() => (state.result.emotionKey ? state.result : null))
const mood = computed(() => (snap.value ? moodOf(snap.value.emotionKey) : null))

const distribution = computed(() => {
  if (!snap.value) return []
  return snap.value.distribution.map((d) => ({
    ...d,
    meta: EMOTIONS[d.key],
    percent: Math.round(d.score * 100),
  }))
})

/** 置信度环的周长参数 */
const R = 34
const CIRC = 2 * Math.PI * R
const dash = computed(() => (snap.value ? CIRC * snap.value.confidence : 0))

const timeText = computed(() => {
  if (!snap.value) return ''
  return new Date(snap.value.at).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

const strength = computed(() => {
  if (!snap.value) return ''
  const c = snap.value.confidence
  if (c >= 0.75) return '非常明确'
  if (c >= 0.55) return '比较明确'
  if (c >= 0.4) return '略有倾向'
  return '偏模糊'
})
</script>

<template>
  <section class="report panel" :style="{ '--m': mood?.hex || '#333' }">
    <div v-if="!snap" class="empty">
      <div class="empty__icon"><Icon name="activity" :size="26" /></div>
      <div>
        <h3 class="t-feature">情绪读数会出现在这里</h3>
        <p class="t-caption">
          先在左边提供一张脸，再点「按这个情绪推荐」。模型会把表情拆成 7 个维度的概率。
        </p>
      </div>
    </div>

    <template v-else>
      <header class="head">
        <div class="glyph" :style="{ background: mood.gradient[0] }">
          <span>{{ mood.icon }}</span>
        </div>
        <div class="head__text">
          <span class="t-badge head__kicker">检测结果 · {{ timeText }}</span>
          <h2 class="head__title">{{ mood.label }}</h2>
          <p class="head__vibe">{{ mood.vibe }}</p>
        </div>

        <div class="ring">
          <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
            <circle cx="40" cy="40" :r="R" fill="none" stroke="#2a2a2a" stroke-width="6" />
            <circle
              cx="40"
              cy="40"
              :r="R"
              fill="none"
              :stroke="mood.hex"
              stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="`${dash} ${CIRC}`"
              transform="rotate(-90 40 40)"
              class="ring__bar"
            />
          </svg>
          <div class="ring__label">
            <b>{{ Math.round(snap.confidence * 100) }}<i>%</i></b>
            <span>置信度</span>
          </div>
        </div>
      </header>

      <div class="meta-row">
        <span class="pill" :style="{ '--c': mood.hex }">
          <Icon name="wave" :size="12" /> {{ strength }}
        </span>
        <span class="pill">{{ mood.bpm }}</span>
        <span class="pill">能量 {{ Math.round(mood.energy * 100) }}%</span>
        <span class="pill">{{ snap.faces }} 张脸参与判定</span>
      </div>

      <div class="split">
        <div class="bars">
          <div class="bars__head">
            <span class="t-badge">七维概率分布</span>
            <span class="t-micro">face_expression · softmax</span>
          </div>
          <ul>
            <li
              v-for="d in distribution"
              :key="d.key"
              class="bar"
              :class="{ 'is-top': d.key === snap.emotionKey }"
            >
              <span class="bar__name">{{ d.meta.label }}</span>
              <span class="bar__track">
                <span
                  class="bar__fill"
                  :style="{ width: Math.max(d.percent, 1) + '%', background: d.meta.hex }"
                />
              </span>
              <span class="bar__val t-mono">{{ d.percent }}%</span>
            </li>
          </ul>
        </div>

        <aside class="why">
          <span class="t-badge">为什么推荐这些歌</span>
          <p class="why__text">{{ mood.resonance }}</p>
          <div class="why__tags">
            <span v-for="tag in mood.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <p class="why__note">
            采用「情绪共振」策略：顺着当前情绪走，而不是强行扭转。
          </p>
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
.report {
  padding: 18px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.04) 0%, transparent 46%),
    var(--bg-surface);
  position: relative;
  overflow: hidden;
}
.report::before {
  content: '';
  position: absolute;
  top: -90px;
  left: -40px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: var(--m);
  opacity: 0.16;
  filter: blur(56px);
  pointer-events: none;
}

/* —— 空态 —— */
.empty {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 96px;
}
.empty__icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--bg-elevated);
  color: var(--text-dim);
}
.empty h3 {
  margin-bottom: 2px;
}
.empty p {
  max-width: 440px;
  line-height: 1.55;
}

/* —— 头部 —— */
.head {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
}
.glyph {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  border-radius: var(--r-8);
  color: #101010;
  font-size: 22px;
  font-weight: 700;
  box-shadow: var(--shadow-med);
}
.head__text {
  flex: 1;
  min-width: 0;
}
.head__kicker {
  color: var(--text-dim);
}
.head__title {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--m);
  margin: 2px 0 2px;
}
.head__vibe {
  font-size: 13px;
  color: var(--text-muted);
}

.ring {
  position: relative;
  flex: 0 0 auto;
  width: 80px;
  height: 80px;
}
.ring__bar {
  transition: stroke-dasharray 0.7s var(--ease);
}
.ring__label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
}
.ring__label b {
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.ring__label b i {
  font-style: normal;
  font-size: 9px;
  color: var(--text-muted);
}
.ring__label span {
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 0.3px;
}

/* —— 元信息 —— */
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 14px 0 16px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.05);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.2px;
}
.pill:first-child {
  color: var(--c, var(--text-muted));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c, #fff) 40%, transparent);
}

/* —— 分布 + 说明 —— */
.split {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 22px;
}
.bars__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}
.bars__head .t-badge {
  color: var(--text-dim);
}
.bar {
  display: grid;
  grid-template-columns: 46px 1fr 42px;
  align-items: center;
  gap: 9px;
  padding: 3.5px 0;
}
.bar__name {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.2px;
}
.bar__track {
  height: 6px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.bar__fill {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  opacity: 0.45;
  transition: width 0.55s var(--ease);
}
.bar__val {
  font-size: 11px;
  text-align: right;
  color: var(--text-dim);
}
.bar.is-top .bar__name {
  color: var(--text-base);
  font-weight: 700;
}
.bar.is-top .bar__fill {
  opacity: 1;
}
.bar.is-top .bar__val {
  color: var(--text-near);
  font-weight: 700;
}

.why {
  border-left: 1px solid #262626;
  padding-left: 20px;
}
.why .t-badge {
  color: var(--text-dim);
}
.why__text {
  margin: 7px 0 10px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-near);
}
.why__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.tag {
  padding: 3px 9px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.05);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}
.why__note {
  margin-top: 10px;
  font-size: 11px;
  line-height: 1.55;
  color: var(--text-dim);
}

@media (max-width: 960px) {
  .split {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .why {
    border-left: none;
    border-top: 1px solid #262626;
    padding-left: 0;
    padding-top: 14px;
  }
  .head__title {
    font-size: 26px;
  }
}
</style>
