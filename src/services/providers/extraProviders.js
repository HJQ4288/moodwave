/**
 * 预留适配器：网易云音乐 / Audius
 *
 * 这两个文件目前是「接口占位」而不是可用实现，原因写清楚，
 * 避免以后接手的人以为只是忘了接。
 *
 * —— 网易云 ——
 * 浏览器拿不到它的接口：没有 CORS 头，而且请求参数依赖加密算法。
 * 必须自建一个服务端转发：
 *   npm i NeteaseCloudMusicApi -g   # 或 git clone 后 npm start
 *   # 默认监听 http://localhost:3000
 * 然后在 vite.config.js 加：
 *   '/api/netease': { target: 'http://localhost:3000', changeOrigin: true,
 *                      rewrite: p => p.replace(/^\/api\/netease/, '') }
 * 再把下面的 available 改成 true、补完 search 即可，业务代码不用动。
 * 风险：该服务依赖逆向维护，平台改加密就会 401。
 *
 * —— Audius ——
 * 开放 API（https://api.audius.co），无密钥、可播完整曲目、CC 授权。
 * 但曲库几乎没有中文歌，且国内访问不稳定，所以没设为首选。
 */

export const neteaseProvider = {
  id: 'netease',
  label: '网易云音乐',
  kind: 'online',
  note: '需自建转发服务',
  available: false,
  reason:
    '网易云接口无 CORS 头且参数加密，必须先自建 NeteaseCloudMusicApi 转发服务并配置代理，详见 src/services/providers/index.js 顶部说明。',

  async search() {
    throw new Error('网易云适配器未启用：请先自建转发服务并配置 Vite 代理')
  },
}

export const audiusProvider = {
  id: 'audius',
  label: 'Audius 开放曲库',
  kind: 'online',
  note: '无密钥 · 可播全曲',
  available: false,
  reason:
    'Audius 开放 API 可播完整曲目且无版权风险，但曲库以海外独立/电子为主，中文歌几乎为零，未设为首选；需要时打开 available 并实现 search 即可。',

  async search() {
    throw new Error('Audius 适配器未启用')
  },
}
