/**
 * 在线曲库适配器 —— Apple / iTunes Search API
 *
 * 为什么选它作为首个在线源：
 *  - 不需要 API Key、不需要 OAuth，开箱可用
 *  - 每条结果都带 30 秒高清试听地址（previewUrl），能真实出声
 *  - 封面 / 歌名 / 歌手 / 时长 字段规范，映射成本低
 *
 * 两个已知限制（已在架构上处理）：
 *  1. 浏览器直连 itunes.apple.com 没有 CORS 头 → 走 vite.config.js 里的 /api/itunes 代理
 *  2. 国内访问偶发很慢 → 上层带超时 + 自动降级到本地曲库
 *
 * 另外实测：country=CN 时 Search API 对所有关键词都返回 0 条（CN 商店未开放），
 * 所以走默认（美区）商店 —— 中文歌手名可以正常命中，但中文情绪词的匹配结果
 * 语义不搭，因此情绪检索词以英文为主、中文歌手名为辅（见 data/emotions.js）。
 */

const PROXY = '/api/itunes'

function mapTrack(r) {
  if (!r || !r.trackId || !r.previewUrl) return null
  return {
    id: `itunes-${r.trackId}`,
    title: r.trackName || '未知曲目',
    artist: r.artistName || '未知歌手',
    album: r.collectionName || '',
    duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 0,
    audio: r.previewUrl,
    cover: (r.artworkUrl100 || '').replace('100x100', '300x300') || null,
    provider: 'itunes',
    genre: r.primaryGenreName || '',
    preview: true,
    previewSeconds: 30,
    releaseDate: (r.releaseDate || '').slice(0, 4),
    externalUrl: r.trackViewUrl || '',
  }
}

export const itunesProvider = {
  id: 'itunes',
  label: 'Apple Music 在线曲库',
  kind: 'online',
  note: '30 秒高清试听',
  available: true,

  async search({ term, limit = 12, signal } = {}) {
    if (!term) return []

    const url =
      `${PROXY}/search?term=${encodeURIComponent(term)}` +
      `&media=music&entity=song&limit=${limit}`

    const res = await fetch(url, { signal })
    if (!res.ok) throw new Error(`在线曲库返回 ${res.status}`)

    const data = await res.json()
    const rows = Array.isArray(data.results) ? data.results : []
    return rows.map(mapTrack).filter(Boolean)
  },
}
