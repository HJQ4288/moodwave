<script setup>
/**
 * 统一图标：24×24 描边，currentColor 继承色。
 * 用一套极简线性图标，避免 emoji 在暗色 UI 里显得廉价。
 */
const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  filled: { type: Boolean, default: false },
})

const PATHS = {
  scan: 'M4 8V6a2 2 0 0 1 2-2h2M20 8V6a2 2 0 0 0-2-2h-2M4 16v2a2 2 0 0 0 2 2h2M20 16v2a2 2 0 0 1-2 2h-2M9 10h.01M15 10h.01M9.5 14.5a3.5 3.5 0 0 0 5 0',
  heart: 'M12 20.5s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 7.5 2.9c0 5-7.5 9.6-7.5 9.6Z',
  activity: 'M3 12h3.5l2.5 7 4-15 2.5 8H21',
  image: 'M4 5h16v14H4zM4 15l4.5-4.5 3 3L15 10l5 5M9 9.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  film: 'M4 4h16v16H4zM4 9h16M4 15h16M9.5 4v16M14.5 4v16',
  camera: 'M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.2-2h6l1.2 2h2.8A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  aperture: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 3l4.5 7.8M21 12h-9M16.5 19.5 12 12M7.5 19.5 12 12M3 12h9M7.5 4.5 12 12',
  play: 'M8 5.5v13l10-6.5z',
  pause: 'M9 5.5v13M15 5.5v13',
  next: 'M6 5.5 15 12l-9 6.5zM18 5.5v13',
  prev: 'M18 5.5 9 12l9 6.5zM6 5.5v13',
  volume: 'M4 10v4h3l4.5 3.5v-15L7 10H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 10v4h3l4.5 3.5v-15L7 10H4zM16 10l4 4M20 10l-4 4',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5 10 17l9-10',
  close: 'M6 6l12 12M18 6L6 18',
  loader: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7.5V12l3 2',
  trash: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13',
  refresh: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5',
  music: 'M9 18V5l10-2v13M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
  wave: 'M3 12h2l2-6 3 12 3-9 2.5 6 2-3H21',
  download: 'M12 4v10M8 11l4 4 4-4M5 19h14',
}
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="filled ? 0 : 1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="PATHS[name] || PATHS.music" />
  </svg>
</template>
