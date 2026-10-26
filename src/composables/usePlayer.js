/**
 * 播放器（单个 <audio> 实例，跨组件共享）
 *
 * 在线曲目是 30 秒试听，本地兜底曲目是 12 秒合成循环，
 * 所以底栏会明确标注当前音源类型，不假装是完整播放。
 */

import { reactive } from 'vue'

const audio = new Audio()
audio.preload = 'metadata'

export const player = reactive({
  current: null,
  queue: [],
  index: -1,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  loading: false,
  error: '',
})

let onEndedHook = null

audio.addEventListener('loadedmetadata', () => {
  player.duration = Number.isFinite(audio.duration) ? audio.duration : 0
  player.loading = false
})
audio.addEventListener('timeupdate', () => {
  player.currentTime = audio.currentTime
})
audio.addEventListener('play', () => (player.playing = true))
audio.addEventListener('pause', () => (player.playing = false))
audio.addEventListener('waiting', () => (player.loading = true))
audio.addEventListener('playing', () => (player.loading = false))
audio.addEventListener('ended', () => {
  player.playing = false
  if (onEndedHook) onEndedHook()
})
audio.addEventListener('error', () => {
  player.error = '音频加载失败（可能是试听源失效）'
  player.loading = false
  player.playing = false
})

export function setEndedHook(fn) {
  onEndedHook = fn
}

export function playTrack(track, queue = null) {
  if (!track) return
  if (queue) {
    player.queue = queue.slice()
    player.index = queue.findIndex((t) => t.id === track.id)
  } else if (!player.queue.length) {
    player.queue = [track]
    player.index = 0
  }

  player.current = track
  player.error = ''
  player.loading = true
  player.currentTime = 0
  player.duration = track.duration || 0

  audio.src = track.audio
  audio.volume = player.volume
  audio.play().catch(() => {
    player.error = '浏览器拦截了自动播放，请再点一次播放'
    player.playing = false
    player.loading = false
  })
}

export function togglePlay() {
  if (!player.current) return
  if (audio.paused) {
    audio.play().catch(() => {})
  } else {
    audio.pause()
  }
}

export function next() {
  if (!player.queue.length) return
  const i = (player.index + 1) % player.queue.length
  playTrack(player.queue[i])
}

export function prev() {
  if (!player.queue.length) return
  const i = (player.index - 1 + player.queue.length) % player.queue.length
  playTrack(player.queue[i])
}

export function seek(ratio) {
  if (!audio.duration || !Number.isFinite(audio.duration)) return
  const r = Math.min(1, Math.max(0, ratio))
  audio.currentTime = r * audio.duration
  player.currentTime = audio.currentTime
}

export function setVolume(v) {
  const val = Math.min(1, Math.max(0, v))
  player.volume = val
  audio.volume = val
}

export function stop() {
  audio.pause()
  audio.currentTime = 0
  player.current = null
  player.playing = false
}
