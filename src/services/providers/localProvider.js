/**
 * 本地曲库适配器 —— 永久在线的兜底源
 *
 * 不依赖网络：断网、接口超时、跨域失败时由它接管。
 * 音频是随工程分发的合成氛围循环，所以离线也能真实播放。
 */

import { localTracksByMood } from '../../data/localTracks.js'

function shuffle(rows) {
  const a = rows.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const localProvider = {
  id: 'local',
  label: '内置兜底曲库',
  kind: 'offline',
  note: '离线可用 · 合成演示音轨',
  available: true,

  async search({ mood, limit = 12 } = {}) {
    const rows = localTracksByMood(mood)
    return shuffle(rows).slice(0, limit)
  },
}
