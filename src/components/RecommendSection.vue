<script setup>
/**
 * 推荐区：标题 + 数据来源 + 降级提示 + 曲目网格
 * 数据来源必须露出来 —— 用户有权知道这首歌是从在线接口来的，还是兜底曲库。
 */
import { computed } from 'vue'
import Icon from './Icon.vue'
import TrackCard from './TrackCard.vue'
import { moodOf } from '../data/emotions.js'
import { state, runRecommendation } from '../composables/useStore.js'
import { playTrack } from '../composables/usePlayer.js'

const emit = defineEmits(['add'])

const reco = computed(() => state.recommendation)
const mood = computed(() => (reco.value.forMood ? moodOf(reco.value.forMood) : null))
const tracks = computed(() => reco.value.tracks)

const sourceText = computed(() => {
  const s = reco.value.source
  if (!s) return ''
  if (s === 'itunes') return 'Apple Music 在线曲库 · 30 秒试听'
  if (s === 'local') return '内置兜底曲库 · 合成演示音轨'
  if (s.includes('+')) return '在线曲库 + 内置兜底混合'
  return s
})

function playAll() {
  if (tracks.value.length) playTrack(tracks.value[0], tracks.value)
}

function retry() {
  if (reco.value.forMood) runRecommendation(reco.value.forMood)
}
</script>

<template>
  <section class="reco">
    <header class="reco__head">
      <div class="reco__title">
        <span class="t-badge kicker">
          {{ reco.forMood ? '当前情绪歌单' : '等待情绪输入' }}
        </span>
        <h2 class="t-section">
          <template v-if="mood">
            「<span :style="{ color: mood.hex }">{{ mood.label }}</span>」同频推荐
          </template>
          <template v-else>识别后自动生成歌单</template>
        </h2>
        <p class="reco__sub">
          <template v-if="sourceText">
            {{ sourceText }}
            <span v-if="tracks.length"> · {{ tracks.length }} 首</span>
          </template>
          <template v-else>先在上方完成一次情绪识别</template>
        </p>
      </div>

      <div class="reco__actions">
        <button
          v-if="tracks.length"
          class="btn btn--primary btn--tiny"
          @click="playAll"
        >
          <Icon name="play" :size="13" filled /> 播放全部
        </button>
        <button
          class="btn btn--ghost btn--tiny"
          :disabled="!reco.forMood || reco.loading"
          @click="retry"
        >
          <Icon name="refresh" :size="13" /> 换一批
        </button>
      </div>
    </header>

    <!-- 降级 / 异常提示 -->
    <ul v-if="reco.warnings.length && !reco.loading" class="warnings">
      <li v-for="(w, i) in reco.warnings.slice(0, 3)" :key="i">
        <Icon name="shield" :size="12" />
        <span>{{ w }}</span>
      </li>
    </ul>

    <!-- 加载骨架 -->
    <div v-if="reco.loading" class="grid">
      <div v-for="i in 8" :key="i" class="skeleton">
        <div class="skeleton__art" />
        <div class="skeleton__line" />
        <div class="skeleton__line is-short" />
      </div>
    </div>

    <!-- 曲目 -->
    <div v-else-if="tracks.length" class="grid">
      <TrackCard
        v-for="(t, i) in tracks"
        :key="t.id"
        :track="t"
        :queue="tracks"
        :rank="i + 1"
        @add="(tr) => emit('add', tr)"
      />
    </div>

    <!-- 空态 -->
    <div v-else class="reco__empty">
      <div class="reco__empty-icon"><Icon name="music" :size="24" /></div>
      <p class="t-caption">
        {{
          reco.error ||
          '推荐列表还是空的。完成一次识别后，这里会出现与当前情绪同频的曲目。'
        }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.reco {
  padding: 4px 2px 0;
}
.reco__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.kicker {
  color: var(--text-dim);
}
.reco__sub {
  margin-top: 5px;
  font-size: 12.5px;
  color: var(--text-muted);
}
.reco__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.warnings {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: var(--r-8);
  background: rgba(255, 164, 43, 0.07);
  box-shadow: inset 0 0 0 1px rgba(255, 164, 43, 0.22);
}
.warnings li {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  font-size: 11.5px;
  line-height: 1.5;
  color: #e0b072;
}
.warnings svg {
  flex: 0 0 auto;
  margin-top: 2px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  gap: 10px;
}

/* 骨架 */
.skeleton {
  padding: 11px;
  border-radius: var(--r-8);
  background: var(--bg-surface);
}
.skeleton__art {
  aspect-ratio: 1;
  border-radius: var(--r-6);
  background: linear-gradient(100deg, #1e1e1e 20%, #2a2a2a 40%, #1e1e1e 60%);
  background-size: 220% 100%;
  animation: shimmer 1.5s linear infinite;
}
.skeleton__line {
  height: 9px;
  margin-top: 10px;
  border-radius: var(--r-pill);
  background: #232323;
}
.skeleton__line.is-short {
  width: 55%;
  margin-top: 7px;
}
@keyframes shimmer {
  to {
    background-position: -120% 0;
  }
}

.reco__empty {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px;
  border-radius: var(--r-8);
  background: var(--bg-surface);
}
.reco__empty-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--bg-elevated);
  color: var(--text-dim);
  flex: 0 0 auto;
}
.reco__empty p {
  max-width: 520px;
  line-height: 1.6;
}
</style>
