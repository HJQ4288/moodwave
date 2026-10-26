<script setup>
import { ref, computed, nextTick } from 'vue'
import Icon from './components/Icon.vue'

import AppSidebar from './components/AppSidebar.vue'
import CaptureStage from './components/CaptureStage.vue'
import MoodReport from './components/MoodReport.vue'
import RecommendSection from './components/RecommendSection.vue'
import MoodTimeline from './components/MoodTimeline.vue'
import FavoritesView from './components/FavoritesView.vue'
import PlayerBar from './components/PlayerBar.vue'
import PlaylistSheet from './components/PlaylistSheet.vue'
import Toasts from './components/Toasts.vue'

import { state, currentMood, todayStats } from './composables/useStore.js'

const mainRef = ref(null)
const recoRef = ref(null)
const pickerTrack = ref(null)

const mood = currentMood

const todayCount = computed(() => todayStats.value.reduce((s, x) => s + x.count, 0))
const topToday = computed(() => (todayStats.value[0] ? todayStats.value[0].mood : null))

const wash = computed(() => (mood.value ? mood.value.hex : '#1ed760'))

function navigate(view) {
  state.view = view
  nextTick(() => mainRef.value?.scrollTo({ top: 0, behavior: 'smooth' }))
}

async function onCommitted() {
  await nextTick()
  recoRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const views = [
  { key: 'detect', label: '情绪识别', icon: 'scan' },
  { key: 'favorites', label: '我的收藏', icon: 'heart' },
  { key: 'timeline', label: '时间线', icon: 'activity' },
]
</script>

<template>
  <div class="app">
    <AppSidebar :active="state.view" @navigate="navigate" />

    <main ref="mainRef" class="main">
      <!-- 移动端导航（侧栏在窄屏隐藏） -->
      <nav class="mobile-nav">
        <button
          v-for="v in views"
          :key="v.key"
          class="mobile-nav__item"
          :class="{ 'is-active': state.view === v.key }"
          @click="navigate(v.key)"
        >
          <Icon :name="v.icon" :size="15" />
          {{ v.label }}
        </button>
      </nav>

      <!-- ================= 识别页 ================= -->
      <div v-if="state.view === 'detect'" class="page">
        <header class="hero" :style="{ '--wash': wash }">
          <div class="hero__wash" />
          <div class="hero__inner">
            <div class="hero__text">
              <span class="t-badge hero__kicker">FACE · EMOTION · MUSIC</span>
              <h1 class="hero__title">用一张脸，换一份歌单</h1>
              <p class="hero__desc">
                上传图片、打开视频、连上摄像头或者拍一张照 —— 模型在本机读出你的情绪，
                再从曲库里挑出与此刻同频的歌。
              </p>
            </div>

            <div class="hero__stats">
              <div class="stat">
                <b>{{ todayCount }}</b>
                <span>今日识别</span>
              </div>
              <div class="stat">
                <b :style="{ color: topToday?.hex || 'inherit' }">
                  {{ topToday?.label || '—' }}
                </b>
                <span>今日主情绪</span>
              </div>
              <div class="stat">
                <b>{{ state.favorites.length }}</b>
                <span>已收藏</span>
              </div>
            </div>
          </div>
        </header>

        <CaptureStage @committed="onCommitted" />

        <MoodReport />

        <div ref="recoRef" class="anchor">
          <RecommendSection @add="(t) => (pickerTrack = t)" />
        </div>
      </div>

      <!-- ================= 收藏页 ================= -->
      <div v-else-if="state.view === 'favorites'" class="page">
        <FavoritesView @go-detect="navigate('detect')" />
      </div>

      <!-- ================= 时间线页 ================= -->
      <div v-else class="page">
        <MoodTimeline @go-detect="navigate('detect')" />
      </div>

      <footer class="foot-note">
        Moodwave · 人脸情绪识别驱动的歌曲推荐实验 · 情绪共振策略 ·
        模型 face-api tiny_face_detector + face_expression（本地推理）
      </footer>
    </main>

    <PlayerBar class="app__player" />

    <PlaylistSheet
      v-if="pickerTrack"
      :track="pickerTrack"
      @close="pickerTrack = null"
    />

    <Toasts />
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  background: var(--bg-base);
}

.main {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 clamp(14px, 2.4vw, 34px) 28px;
  position: relative;
  scroll-behavior: smooth;
}

.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1240px;
  margin: 0 auto;
  padding-top: 18px;
}

.app__player {
  grid-column: 1 / -1;
}

/* —— Hero —— */
.hero {
  position: relative;
  padding: 20px 22px 22px;
  border-radius: var(--r-8);
  overflow: hidden;
  background: linear-gradient(180deg, #1c1c1c 0%, var(--bg-surface) 100%);
  box-shadow: var(--shadow-low);
}
.hero__wash {
  position: absolute;
  inset: -60% -10% auto -10%;
  height: 260%;
  background: radial-gradient(
    46% 52% at 22% 0%,
    color-mix(in srgb, var(--wash) 34%, transparent) 0%,
    transparent 68%
  );
  opacity: 0.75;
  pointer-events: none;
  transition: background 0.6s var(--ease);
}
.hero__inner {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.hero__kicker {
  color: var(--text-muted);
  letter-spacing: 1.6px;
}
.hero__title {
  font-size: clamp(26px, 3.4vw, 40px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.025em;
  margin: 6px 0 8px;
}
.hero__desc {
  max-width: 620px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-muted);
}
.hero__stats {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
}
.stat {
  min-width: 82px;
  padding: 10px 14px;
  border-radius: var(--r-8);
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(6px);
  text-align: center;
}
.stat b {
  display: block;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}
.stat span {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 0.4px;
}

.anchor {
  scroll-margin-top: 12px;
}

/* 移动端导航 */
.mobile-nav {
  display: none;
  gap: 6px;
  padding: 12px 0 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, var(--bg-base) 72%, transparent);
}
.mobile-nav__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--r-pill);
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}
.mobile-nav__item.is-active {
  background: var(--accent);
  color: var(--accent-ink);
}

.foot-note {
  max-width: 1240px;
  margin: 32px auto 0;
  padding-top: 16px;
  border-top: 1px solid #1f1f1f;
  font-size: 10.5px;
  line-height: 1.7;
  color: #4d4d4d;
  letter-spacing: 0.2px;
}

@media (max-width: 860px) {
  .app {
    grid-template-columns: minmax(0, 1fr);
  }
  .mobile-nav {
    display: flex;
    flex-wrap: wrap;
  }
  .main {
    padding: 0 14px 20px;
  }
  .hero__stats {
    width: 100%;
  }
  .stat {
    flex: 1;
  }
}
</style>
