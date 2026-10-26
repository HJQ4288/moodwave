/**
 * 音乐 Provider 注册表 + 推荐引擎
 *
 * 设计要点：UI 和播放器只依赖 `recommend()` 这一个出口，
 * 不关心歌从哪来。在线源失败自动沿链条降级，最后一定落在本地曲库，
 * 所以「接口挂了」不会变成「页面白了」。
 */

import { moodOf } from '../../data/emotions.js'
import { itunesProvider } from './itunesProvider.js'
import { localProvider } from './localProvider.js'
import { neteaseProvider, audiusProvider } from './extraProviders.js'

export const PROVIDERS = {
  itunes: itunesProvider,
  local: localProvider,
  netease: neteaseProvider,
  audius: audiusProvider,
}

/** 降级链：从左到右依次尝试 */
export const PROVIDER_CHAIN = ['itunes', 'local']

export function providerLabel(id) {
  return PROVIDERS[id]?.label || id
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} 超时（>${ms / 1000}s）`)),
      ms,
    )
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

function dedupe(tracks) {
  const seen = new Set()
  return tracks.filter((t) => {
    const key = `${(t.title || '').toLowerCase().trim()}|${(t.artist || '')
      .toLowerCase()
      .trim()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** 把底层网络错误翻译成用户能看懂的话 */
function friendlyError(err) {
  const msg = err?.message || String(err || '')
  if (/failed to fetch|networkerror|load failed|internet disconnected/i.test(msg))
    return '在线曲库连不上（网络不可用或受限）'
  if (/aborted|超时/.test(msg)) return msg
  return msg
}

function pickQueries(emotion) {
  const q = emotion.queries.slice()
  // 打乱后取前两条，让同一情绪多次推荐也有新鲜感
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[q[i], q[j]] = [q[j], q[i]]
  }
  return q.slice(0, 2)
}

/**
 * 按情绪推荐曲目
 * @param {string} emotionKey happy/sad/angry/...
 * @param {{ limit?: number, chain?: string[], timeout?: number }} opts
 * @returns {Promise<{ tracks: object[], source: string, warnings: string[], emotion: object }>}
 */
export async function recommend(emotionKey, opts = {}) {
  const { limit = 12, chain = PROVIDER_CHAIN, timeout = 12000 } = opts
  const emotion = moodOf(emotionKey)

  const tracks = []
  const warnings = []
  let source = null

  for (const id of chain) {
    const provider = PROVIDERS[id]
    if (!provider || provider.available === false) {
      if (provider?.reason) warnings.push(provider.reason)
      continue
    }

    try {
      if (provider.kind === 'offline') {
        const rows = await provider.search({ mood: emotion.key, limit })
        if (rows.length) {
          tracks.push(...rows)
          source = source || provider.id
        }
        continue
      }

      // 在线源：两次检索词并发拉取，任一成功即用
      const queries = pickQueries(emotion)
      const settled = await Promise.allSettled(
        queries.map((term) =>
          withTimeout(
            provider.search({ term, limit: Math.ceil(limit / 2) }),
            timeout,
            provider.label,
          ),
        ),
      )

      const ok = settled
        .filter((s) => s.status === 'fulfilled')
        .flatMap((s) => s.value)

      settled
        .filter((s) => s.status === 'rejected')
        .forEach((s) => warnings.push(friendlyError(s.reason)))

      if (ok.length) {
        tracks.push(...ok)
        source = source || provider.id
        // 在线源命中足够，就不再走后面的兜底
        if (tracks.length >= limit * 0.6) break
      }
    } catch (err) {
      warnings.push(friendlyError(err))
    }
  }

  const result = dedupe(tracks).slice(0, limit)

  // 在线结果不足 6 首时，用本地曲库补位，保证列表不塌
  if (result.length < 6) {
    const fill = await localProvider.search({
      mood: emotion.key,
      limit: limit - result.length,
    })
    const merged = dedupe([...result, ...fill])
    if (merged.length > result.length) {
      warnings.push('在线结果不足，已用内置曲库补位')
      source = source ? `${source}+local` : 'local'
    }
    return { tracks: merged.slice(0, limit), source, warnings, emotion }
  }

  return { tracks: result, source, warnings, emotion }
}
