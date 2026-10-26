<script setup>
/**
 * 底部播放条：始终可见（Spotify 的 now-playing bar 在所有断点都保留）
 * 进度条支持点击与拖拽定位。
 */
import { ref, computed, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'
import TrackCover from './TrackCover.vue'
import {
  player,
  togglePlay,
  next,
  prev,
  seek,
  setVolume,
} from '../composables/usePlayer.js'
import { isFavorite, toggleFavorite } from '../composables/useStore.js'

const barRef = ref(null)
const dragging = ref(false)

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

const progress = computed(() => {
  const d = player.duration || player.current?.duration || 0
  if (!d) return 0
  return Math.min(1, player.currentTime / d)
})

const duration = computed(() => player.duration || player.current?.duration || 0)
const fav = computed(() => isFavorite(player.current))

const sourceLabel = computed(() => {
  if (!player.current) return ''
  return player.current.provider === 'local' ? '离线音轨' : '30s 试听'
})

function ratioFromEvent(e) {
  const el = barRef.value
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
}

function onPointerDown(e) {
  if (!player.current) return
  dragging.value = true
  seek(ratioFromEvent(e))
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}
function onPointerMove(e) {
  if (!dragging.value) return
  seek(ratioFromEvent(e))
}
function onPointerUp() {
  dragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <footer class="player" :class="{ 'is-idle': !player.current }">
    <!-- 当前曲目 -->
    <div class="player__now">
      <template v-if="player.current">
        <TrackCover :track="player.current" size="sm" class="player__cover" />
        <div class="player__meta">
          <span class="player__title">{{ player.current.title }}</span>
          <span class="player__artist">
            {{ player.current.artist }}
            <em class="src">{{ sourceLabel }}</em>
          </span>
        </div>
        <button
          class="icon-btn player__fav"
          :class="{ 'is-active': fav }"
          :title="fav ? '取消收藏' : '收藏'"
          @click="toggleFavorite(player.current)"
        >
          <Icon name="heart" :size="16" :filled="fav" />
        </button>
      </template>
      <template v-else>
        <div class="player__placeholder">
          <Icon name="music" :size="18" />
          <span>还没有在播放的曲目</span>
        </div>
      </template>
    </div>

    <!-- 控制 + 进度 -->
    <div class="player__center">
      <div class="controls">
        <button class="icon-btn" title="上一首" :disabled="!player.current" @click="prev">
          <Icon name="prev" :size="17" filled />
        </button>
        <button
          class="play-btn"
          :disabled="!player.current"
          :title="player.playing ? '暂停' : '播放'"
          @click="togglePlay"
        >
          <Icon :name="player.playing ? 'pause' : 'play'" :size="18" filled />
        </button>
        <button class="icon-btn" title="下一首" :disabled="!player.current" @click="next">
          <Icon name="next" :size="17" filled />
        </button>
      </div>

      <div class="progress">
        <span class="progress__time t-mono">{{ fmt(player.currentTime) }}</span>
        <div
          ref="barRef"
          class="progress__track"
          :class="{ 'is-disabled': !player.current }"
          role="slider"
          :aria-valuenow="Math.round(progress * 100)"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="播放进度"
          @pointerdown="onPointerDown"
        >
          <span class="progress__fill" :style="{ width: progress * 100 + '%' }">
            <i class="progress__knob" />
          </span>
        </div>
        <span class="progress__time t-mono">{{ fmt(duration) }}</span>
      </div>
    </div>

    <!-- 音量 -->
    <div class="player__right">
      <span v-if="player.error" class="err">{{ player.error }}</span>
      <button
        class="icon-btn"
        :title="player.volume === 0 ? '取消静音' : '静音'"
        @click="setVolume(player.volume === 0 ? 0.8 : 0)"
      >
        <Icon :name="player.volume === 0 ? 'mute' : 'volume'" :size="17" />
      </button>
      <input
        class="vol"
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="player.volume"
        aria-label="音量"
        @input="setVolume(Number($event.target.value))"
      />
      <span class="vol__val t-mono">{{ Math.round(player.volume * 100) }}</span>
    </div>
  </footer>
</template>

<style scoped>
.player {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(280px, 2.1fr) minmax(150px, 1fr);
  align-items: center;
  gap: 18px;
  height: var(--player-h);
  padding: 0 18px;
  background: var(--bg-surface);
  box-shadow: 0 -1px 0 #232323, 0 -8px 24px rgba(0, 0, 0, 0.4);
  z-index: 20;
}

/* 当前曲目 */
.player__now {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.player__cover {
  width: 48px;
  flex: 0 0 48px;
}
.player__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.player__title {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.player__artist {
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.player__artist .src {
  font-style: normal;
  font-size: 10px;
  color: var(--text-dim);
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: var(--r-2);
  background: rgba(255, 255, 255, 0.06);
}
.player__fav {
  flex: 0 0 auto;
}
.player__placeholder {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-dim);
  font-size: 12px;
}

/* 控制区 */
.player__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.controls {
  display: flex;
  align-items: center;
  gap: 10px;
}
.play-btn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--text-base);
  color: var(--accent-ink);
  transition: transform 0.16s var(--ease), background 0.16s var(--ease);
}
.play-btn:hover {
  transform: scale(1.07);
  background: #f2f2f2;
}
.play-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}

.progress {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
}
.progress__time {
  font-size: 10.5px;
  color: var(--text-dim);
  min-width: 32px;
  text-align: center;
}
.progress__track {
  position: relative;
  flex: 1;
  height: 4px;
  border-radius: var(--r-pill);
  background: #4d4d4d;
  cursor: pointer;
  touch-action: none;
}
.progress__track.is-disabled {
  cursor: default;
  opacity: 0.5;
}
.progress__fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: var(--r-pill);
  background: var(--text-base);
  transition: background 0.16s var(--ease);
}
.progress__track:hover .progress__fill {
  background: var(--accent);
}
.progress__knob {
  position: absolute;
  right: -5px;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-base);
  transform: translateY(-50%) scale(0);
  transition: transform 0.16s var(--ease);
}
.progress__track:hover .progress__knob {
  transform: translateY(-50%) scale(1);
}

/* 音量 */
.player__right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}
.vol {
  width: 84px;
  accent-color: var(--text-base);
  cursor: pointer;
}
.vol__val {
  font-size: 10px;
  color: var(--text-dim);
  width: 22px;
}
.err {
  font-size: 10.5px;
  color: var(--negative);
  max-width: 130px;
  line-height: 1.3;
}

@media (max-width: 900px) {
  .player {
    grid-template-columns: 1fr auto;
    gap: 10px;
    height: auto;
    padding: 10px 14px;
  }
  .player__center {
    order: 3;
    grid-column: 1 / -1;
  }
  .player__right {
    display: none;
  }
}
</style>
