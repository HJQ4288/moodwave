<script setup>
/**
 * 封面：在线曲目用真实专辑图，本地兜底曲目用程序化渐变生成
 * —— 这样永远不会出现「图片加载失败」的破图占位。
 */
import { computed } from 'vue'
import { moodOf } from '../data/emotions.js'

const props = defineProps({
  track: { type: Object, default: () => ({}) },
  size: { type: String, default: 'md' }, // sm | md | lg
  rounded: { type: Boolean, default: true },
})

const mood = computed(() => moodOf(props.track.mood || 'neutral'))

const initials = computed(() => {
  const t = props.track.title || 'M'
  return t.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '').slice(0, 2) || 'M'
})

/** 由 id 生成稳定的角度偏移，让同类曲目的封面不完全一样 */
const angle = computed(() => {
  const s = props.track.id || 'x'
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return h
})

const bg = computed(() => {
  const [a, b] = mood.value.gradient
  return `radial-gradient(120% 120% at ${20 + (angle.value % 50)}% 12%, ${a}44 0%, transparent 58%),
          conic-gradient(from ${angle.value}deg at 68% 88%, ${b} 0deg, ${a}22 140deg, ${b} 300deg),
          linear-gradient(150deg, #1b1b1b, #0f0f0f)`
})
</script>

<template>
  <div
    class="cover"
    :class="[`is-${size}`, { 'is-rounded': rounded }]"
    :style="track.cover ? {} : { background: bg }"
    :aria-label="track.title"
  >
    <img v-if="track.cover" :src="track.cover" :alt="`${track.title} 封面`" loading="lazy" />
    <template v-else>
      <span class="cover__initials" :style="{ color: mood.hex }">{{ initials }}</span>
      <span class="cover__rings" />
      <span class="cover__mood" :style="{ background: mood.hex }" />
    </template>
  </div>
</template>

<style scoped>
.cover {
  position: relative;
  aspect-ratio: 1;
  width: 100%;
  overflow: hidden;
  background: #1a1a1a;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.cover.is-rounded {
  border-radius: var(--r-6);
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover__initials {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  opacity: 0.9;
  z-index: 1;
}
.cover__rings {
  position: absolute;
  inset: 0;
  background: repeating-radial-gradient(
    circle at 78% 92%,
    rgba(255, 255, 255, 0.055) 0 1px,
    transparent 1px 11px
  );
  z-index: 0;
}
.cover__mood {
  position: absolute;
  top: 9%;
  right: 9%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  opacity: 0.85;
}

.is-sm .cover__initials {
  font-size: 15px;
}
.is-sm .cover__mood {
  width: 4px;
  height: 4px;
}
.is-lg .cover__initials {
  font-size: 44px;
}
</style>
