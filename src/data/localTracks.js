/**
 * 内置兜底曲库（Moodwave Sessions）
 *
 * 用途：在线接口失效 / 断网 / 跨域失败时接管推荐，页面不会空场。
 * 说明：曲目为项目自建的示例素材，音频是随工程一起分发的合成演示音轨
 *      （public/audio/*.wav，每类情绪一条 12 秒氛围循环），
 *      所以即便完全离线，播放器也真的能出声、能拖动进度。
 * 在线曲库可用时，这些曲目不会出现在结果里。
 */

const A = {
  mw: 'Moodwave Studio',
  aki: 'Aki Mori',
  vela: 'VELA',
  low: '低气压',
  neon: 'Neon Room',
  ash: 'Ash & Ash',
  kite: 'Kite Season',
  moss: 'Moss Radio',
}

/** [标题, 歌手, 时长(秒)] */
const SHEETS = {
  happy: [
    ['阳光落在肩上', A.mw, 198],
    ['星期五的风', A.kite, 176],
    ['把窗户打开', A.vela, 205],
    ['Citrus Morning', A.neon, 189],
    ['骑到海边的路', A.aki, 224],
    ['汽水与蝉', A.mw, 168],
    ['一切刚刚好', A.moss, 212],
  ],
  sad: [
    ['雨停在凌晨三点', A.low, 246],
    ['空椅子', A.aki, 228],
    ['旧房间的回声', A.mw, 254],
    ['Paper Boat', A.ash, 217],
    ['你把伞留下了', A.vela, 239],
    ['灰蓝色的下午', A.low, 261],
    ['慢一点忘记', A.kite, 233],
  ],
  angry: [
    ['撞碎', A.ash, 192],
    ['铁与火', A.neon, 178],
    ['不再解释', A.mw, 186],
    ['Concrete Fist', A.ash, 204],
    ['让路', A.neon, 165],
    ['高压', A.ash, 181],
    ['边缘地带', A.vela, 197],
  ],
  fearful: [
    ['走廊尽头', A.low, 272],
    ['呼吸变慢', A.moss, 288],
    ['未读的消息', A.vela, 244],
    ['Under the Stairs', A.low, 266],
    ['低频警告', A.mw, 251],
    ['雾里的脚步声', A.aki, 279],
    ['别回头', A.low, 258],
  ],
  disgusted: [
    ['生锈', A.ash, 208],
    ['假面舞会', A.vela, 194],
    ['拒绝咀嚼', A.neon, 176],
    ['Mold', A.ash, 215],
    ['说了不做', A.mw, 188],
    ['白噪音污渍', A.moss, 202],
    ['关掉', A.neon, 171],
  ],
  surprised: [
    ['突然的夏天', A.kite, 186],
    ['折返', A.vela, 192],
    ['玻璃碎裂的瞬间', A.neon, 174],
    ['Sparks', A.neon, 168],
    ['一秒的失重', A.mw, 181],
    ['谁在敲门', A.aki, 196],
    ['光斑', A.moss, 178],
  ],
  neutral: [
    ['一杯温水', A.moss, 214],
    ['阳台下午', A.aki, 226],
    ['慢慢整理', A.mw, 232],
    ['Sunday Linen', A.kite, 219],
    ['纸页翻动', A.moss, 236],
    ['通勤的白噪音', A.low, 241],
    ['无事的傍晚', A.aki, 228],
  ],
}

export const LOCAL_TRACKS = Object.entries(SHEETS).flatMap(([mood, rows]) =>
  rows.map(([title, artist, duration], i) => ({
    id: `local-${mood}-${i}`,
    title,
    artist,
    album: 'Moodwave Sessions',
    duration,
    mood,
    energy: 0.2 + (i % 5) * 0.15,
    // 每类情绪共用一条 12 秒的合成氛围循环
    audio: `/audio/mood-${mood}.wav`,
    cover: null,
    provider: 'local',
    preview: true,
  })),
)

export function localTracksByMood(moodKey) {
  return LOCAL_TRACKS.filter((t) => t.mood === moodKey)
}
