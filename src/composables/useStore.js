/**
 * 全局状态（单例）
 *
 * 没引 Pinia：这个应用的共享状态只有「识别结果 / 推荐列表 / 播放器」
 * 三块，一个 reactive 对象足够，少一层依赖少一层心智负担。
 */

import { reactive, computed } from 'vue'
import { loadModels, detectFaces, summarize } from '../services/faceEngine.js'
import { recommend } from '../services/providers/index.js'
import { moodOf } from '../data/emotions.js'

const LS = {
  history: 'moodwave.history.v1',
  favorites: 'moodwave.favorites.v1',
  playlists: 'moodwave.playlists.v1',
}

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 隐私模式 / 配额用尽时静默失败，不影响主流程 */
  }
}

export const state = reactive({
  view: 'detect',

  model: {
    status: 'idle', // idle | loading | ready | error
    backend: '',
    error: '',
  },

  /** 当前画面里的实时检测结果 */
  scan: {
    mode: 'idle', // idle | image | video | camera
    live: false,
    faces: [],
    distribution: [],
    primary: null,
    confidence: 0,
    count: 0,
    frameAt: 0,
    busy: false,
  },

  /** 用户确认后的情绪快照 */
  result: {
    emotionKey: null,
    confidence: 0,
    distribution: [],
    at: 0,
    faces: 0,
  },

  recommendation: {
    loading: false,
    tracks: [],
    source: null,
    warnings: [],
    forMood: null,
    error: '',
  },

  history: readLS(LS.history, []),
  favorites: readLS(LS.favorites, []),
  playlists: readLS(LS.playlists, []),

  toast: null,
})

let toastTimer = null
export function toast(message, tone = 'info') {
  state.toast = { message, tone, id: Date.now() }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (state.toast = null), 2800)
}

/* ---------------------------------------------------------------- 模型 */

export async function ensureModel() {
  if (state.model.status === 'ready' || state.model.status === 'loading') return
  state.model.status = 'loading'
  state.model.error = ''
  try {
    const info = await loadModels()
    state.model.backend = info.backend
    state.model.status = 'ready'
  } catch (err) {
    state.model.status = 'error'
    state.model.error = err?.message || '模型加载失败'
  }
}

/* 开发调试句柄：浏览器控制台里可以看/改全局状态（生产构建不注入） */
if (import.meta.env.DEV) {
  window.__mw = { state, committing: () => committing }
}

/* -------------------------------------------------------------- 识别 */

let lastScanErrorAt = 0

/** 检测一帧并写回 scan（不落历史，历史由用户确认动作触发） */
export async function scanOnce(source, opts = { landmarks: false }) {
  if (state.model.status !== 'ready' || state.scan.busy) return null
  state.scan.busy = true
  try {
    const raw = await detectFaces(source, opts)
    const sum = summarize(raw)
    state.scan.faces = sum.faces
    state.scan.distribution = sum.distribution
    state.scan.primary = sum.primary
    state.scan.confidence = sum.confidence
    state.scan.count = sum.count
    state.scan.frameAt = Date.now()
    return sum
  } catch (err) {
    state.scan.faces = []
    state.scan.count = 0
    state.scan.primary = null
    state.scan.error = err?.message || '识别失败'
    // 识别异常不再静默：控制台要能看到，界面上也要提示
    console.error('[faceEngine] 识别失败：', err)
    // 连续帧模式下避免刷屏：3 秒内只提示一次
    if (Date.now() - lastScanErrorAt > 3000) {
      lastScanErrorAt = Date.now()
      toast('这一帧识别失败，已跳过', 'warning')
    }
    return null
  } finally {
    state.scan.busy = false
  }
}

export function resetScan(mode = 'idle') {
  state.scan.mode = mode
  state.scan.live = false
  state.scan.faces = []
  state.scan.distribution = []
  state.scan.primary = null
  state.scan.confidence = 0
  state.scan.count = 0
  state.scan.frameAt = 0
}

let committing = false

/** 把当前画面结果定格为「情绪快照」，写入历史并触发推荐 */
export async function commitMood() {
  if (committing || state.recommendation.loading) return null
  if (!state.scan.primary || state.scan.count === 0) {
    toast('画面里还没识别到人脸', 'warning')
    return null
  }
  committing = true

  const snapshot = {
    emotionKey: state.scan.primary,
    confidence: state.scan.confidence,
    distribution: state.scan.distribution.map((d) => ({ ...d })),
    at: Date.now(),
    faces: state.scan.count,
  }
  state.result = snapshot

  const entry = {
    id: `${snapshot.at}-${Math.random().toString(36).slice(2, 7)}`,
    at: snapshot.at,
    key: snapshot.emotionKey,
    confidence: snapshot.confidence,
    faces: snapshot.faces,
  }
  state.history.unshift(entry)
  state.history = state.history.slice(0, 200)
  writeLS(LS.history, state.history)

  try {
    await runRecommendation(snapshot.emotionKey)
    state.view = 'detect'
    return snapshot
  } finally {
    committing = false
  }
}

/* -------------------------------------------------------------- 推荐 */

export async function runRecommendation(emotionKey) {
  const mood = moodOf(emotionKey)
  state.recommendation.loading = true
  state.recommendation.error = ''
  state.recommendation.warnings = []
  state.recommendation.forMood = emotionKey

  try {
    const out = await recommend(emotionKey, { limit: 12 })
    state.recommendation.tracks = out.tracks
    state.recommendation.source = out.source
    state.recommendation.warnings = out.warnings
    if (!out.tracks.length) {
      state.recommendation.error = '这首情绪暂时没有找到合适的歌'
    } else {
      toast(`已按「${mood.label}」生成 ${out.tracks.length} 首同频推荐`, 'success')
    }
    return out.tracks
  } catch (err) {
    state.recommendation.error = err?.message || '推荐失败'
    state.recommendation.tracks = []
    return []
  } finally {
    state.recommendation.loading = false
  }
}

/* -------------------------------------------------------- 收藏 / 歌单 */

const favKey = (t) => `${t.provider || 'x'}:${t.id}`

export function isFavorite(track) {
  if (!track) return false
  return state.favorites.some((t) => favKey(t) === favKey(track))
}

export function toggleFavorite(track) {
  if (!track) return
  const i = state.favorites.findIndex((t) => favKey(t) === favKey(track))
  if (i >= 0) {
    state.favorites.splice(i, 1)
    toast('已从收藏中移除')
  } else {
    state.favorites.unshift({ ...track, savedAt: Date.now() })
    toast('已加入收藏', 'success')
  }
  writeLS(LS.favorites, state.favorites)
}

export function createPlaylist(name) {
  const clean = (name || '').trim()
  if (!clean) {
    toast('歌单名不能为空', 'warning')
    return null
  }
  const pl = {
    id: `pl-${Date.now()}`,
    name: clean,
    createdAt: Date.now(),
    tracks: [],
  }
  state.playlists.unshift(pl)
  writeLS(LS.playlists, state.playlists)
  toast(`已创建歌单「${clean}」`, 'success')
  return pl
}

export function deletePlaylist(id) {
  const i = state.playlists.findIndex((p) => p.id === id)
  if (i >= 0) {
    state.playlists.splice(i, 1)
    writeLS(LS.playlists, state.playlists)
  }
}

export function addToPlaylist(playlistId, track) {
  const pl = state.playlists.find((p) => p.id === playlistId)
  if (!pl) return
  if (pl.tracks.some((t) => favKey(t) === favKey(track))) {
    toast('这首歌已经在歌单里了')
    return
  }
  pl.tracks.push({ ...track, savedAt: Date.now() })
  writeLS(LS.playlists, state.playlists)
  toast(`已加入「${pl.name}」`, 'success')
}

export function removeFromPlaylist(playlistId, trackId) {
  const pl = state.playlists.find((p) => p.id === playlistId)
  if (!pl) return
  pl.tracks = pl.tracks.filter((t) => t.id !== trackId)
  writeLS(LS.playlists, state.playlists)
}

export function clearHistory() {
  state.history = []
  writeLS(LS.history, state.history)
  toast('情绪记录已清空')
}

/* ------------------------------------------------------------ 派生数据 */

export const currentMood = computed(() =>
  state.result.emotionKey ? moodOf(state.result.emotionKey) : null,
)

export const scanMood = computed(() =>
  state.scan.primary ? moodOf(state.scan.primary) : null,
)

/** 今日情绪分布（用于时间线页脚的统计条） */
export const todayStats = computed(() => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const rows = state.history.filter((h) => h.at >= start.getTime())
  const buckets = {}
  rows.forEach((r) => {
    buckets[r.key] = (buckets[r.key] || 0) + 1
  })
  const total = rows.length || 1
  return Object.entries(buckets)
    .map(([key, n]) => ({
      key,
      count: n,
      ratio: n / total,
      mood: moodOf(key),
    }))
    .sort((a, b) => b.count - a.count)
})
