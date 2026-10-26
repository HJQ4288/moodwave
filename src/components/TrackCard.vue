<script setup>
/**
 * 曲目卡：封面 + 播放浮层 + 收藏 / 加歌单
 * 播放状态用一根跳动的均衡器条表示，比换图标更直观。
 */
import { computed } from 'vue'
import Icon from './Icon.vue'
import TrackCover from './TrackCover.vue'
import { player, playTrack, togglePlay } from '../composables/usePlayer.js'
import { isFavorite, toggleFavorite } from '../composables/useStore.js'

const props = defineProps({
  track: { type: Object, required: true },
  queue: { type: Array, default: () => [] },
  rank: { type: Number, default: 0 },
})
const emit = defineEmits(['add'])

const isCurrent = computed(() => player.current?.id === props.track.id)
const playing = computed(() => isCurrent.value && player.playing)
const fav = computed(() => isFavorite(props.track))

const durationText = computed(() => {
  const d = props.track.duration || 0
  if (!d) return '--:--'
  return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`
})

const sourceBadge = computed(() =>
  props.track.provider === 'local' ? '离线' : '30s 试听',
)

function onPlay() {
  if (isCurrent.value) {
    togglePlay()
  } else {
    playTrack(props.track, props.queue.length ? props.queue : [props.track])
  }
}
</script>

<template>
  <article class="card" :class="{ 'is-current': isCurrent }">
    <div class="card__art" @click="onPlay">
      <TrackCover :track="track" />
      <button
        class="card__play"
        :aria-label="playing ? '暂停' : '播放'"
        @click.stop="onPlay"
      >
        <Icon :name="playing ? 'pause' : 'play'" :size="17" filled />
      </button>
      <span v-if="isCurrent" class="eq" :class="{ 'is-paused': !playing }">
        <i /><i /><i />
      </span>
      <span v-if="rank && rank <= 3" class="rank">TOP {{ rank }}</span>
    </div>

    <div class="card__body">
      <h4 class="card__title" :title="track.title">{{ track.title }}</h4>
      <p class="card__artist" :title="track.artist">{{ track.artist }}</p>
      <div class="card__meta">
        <span class="t-mono">{{ durationText }}</span>
        <span class="dot" />
        <span :class="['src', track.provider === 'local' ? 'is-local' : 'is-online']">
          {{ sourceBadge }}
        </span>
      </div>
    </div>

    <div class="card__actions">
      <button
        class="icon-btn"
        :class="{ 'is-active': fav }"
        :title="fav ? '取消收藏' : '收藏'"
        @click.stop="toggleFavorite(track)"
      >
        <Icon name="heart" :size="16" :filled="fav" />
      </button>
      <button class="icon-btn" title="加入歌单" @click.stop="emit('add', track)">
        <Icon name="plus" :size="16" />
      </button>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 11px;
  border-radius: var(--r-8);
  background: var(--bg-surface);
  transition: background 0.22s var(--ease), box-shadow 0.22s var(--ease),
    transform 0.22s var(--ease);
}
.card:hover {
  background: var(--bg-card);
  box-shadow: var(--shadow-med);
  transform: translateY(-2px);
}
.card.is-current {
  background: linear-gradient(180deg, rgba(30, 215, 96, 0.08), var(--bg-surface));
}

.card__art {
  position: relative;
  cursor: pointer;
  border-radius: var(--r-6);
}
.card__art::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--r-6);
  background: rgba(0, 0, 0, 0.24);
  opacity: 0;
  transition: opacity 0.2s var(--ease);
}
.card:hover .card__art::after {
  opacity: 1;
}

.card__play {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-ink);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.45);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.2s var(--ease), transform 0.2s var(--ease),
    background 0.16s var(--ease);
}
.card:hover .card__play,
.card.is-current .card__play {
  opacity: 1;
  transform: translateY(0);
}
.card__play:hover {
  background: var(--accent-hover);
  transform: scale(1.06) translateY(0);
}

/* 播放中均衡器 */
.eq {
  position: absolute;
  left: 9px;
  bottom: 10px;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 13px;
  padding: 3px 5px;
  border-radius: var(--r-2);
  background: rgba(0, 0, 0, 0.6);
}
.eq i {
  width: 2px;
  height: 100%;
  background: var(--accent);
  border-radius: 1px;
  animation: bounce 0.9s ease-in-out infinite;
}
.eq i:nth-child(2) {
  animation-delay: 0.15s;
}
.eq i:nth-child(3) {
  animation-delay: 0.32s;
}
.eq.is-paused i {
  animation-play-state: paused;
  height: 35%;
}
@keyframes bounce {
  0%,
  100% {
    transform: scaleY(0.35);
  }
  50% {
    transform: scaleY(1);
  }
}

.rank {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  padding: 3px 7px;
  border-radius: var(--r-2);
  background: rgba(0, 0, 0, 0.66);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: var(--accent);
}

.card__body {
  min-width: 0;
  padding-right: 2px;
}
.card__title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card.is-current .card__title {
  color: var(--accent);
}
.card__artist {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}
.card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  font-size: 10.5px;
  color: var(--text-dim);
}
.dot {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: var(--text-dim);
}
.src.is-local {
  color: var(--warning);
}
.src.is-online {
  color: var(--text-dim);
}

.card__actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 0;
  opacity: 0;
  transition: opacity 0.18s var(--ease);
}
.card:hover .card__actions,
.card:focus-within .card__actions {
  opacity: 1;
}
.card__actions .icon-btn {
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(6px);
  color: var(--text-near);
}
.card__actions .icon-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}
</style>
