/**
 * 情绪元数据
 * 识别模型（face-api face_expression）输出 7 维概率，此处定义每一维的
 * 展示信息与「情绪共振」检索策略。
 *
 * 共振（resonance）= 顺着情绪走：悲伤配伤感抒情，愤怒配硬核摇滚，
 * 让音乐与当下情绪同频，而不是强行扭转。
 */

export const EMOTIONS = {
  happy: {
    key: 'happy',
    label: '高兴',
    short: 'HAPPY',
    icon: '☀',
    color: 'var(--mood-happy)',
    hex: '#f5c542',
    glow: 'rgba(245, 197, 66, 0.28)',
    gradient: ['#f5c542', '#f08a24'],
    vibe: '上扬、明亮、想跟着点头',
    resonance: '同频推荐欢快明亮的歌，把这份好状态延续下去',
    energy: 0.92,
    bpm: '110–132 BPM',
    tags: ['流行', '放克', '阳光'],
    queries: ['happy upbeat songs', 'feel good pop hits', 'dance pop', '周杰伦'],
  },

  sad: {
    key: 'sad',
    label: '悲伤',
    short: 'SAD',
    icon: '☂',
    color: 'var(--mood-sad)',
    hex: '#5b8def',
    glow: 'rgba(91, 141, 239, 0.28)',
    gradient: ['#5b8def', '#2c3e78'],
    vibe: '下沉、安静、话变少',
    resonance: '同频推荐伤感抒情，先陪你待在这场雨里',
    energy: 0.24,
    bpm: '56–76 BPM',
    tags: ['抒情', '民谣', '慢歌'],
    queries: ['sad songs', 'sad acoustic ballad', 'melancholy piano', '陈奕迅'],
  },

  angry: {
    key: 'angry',
    label: '愤怒',
    short: 'ANGRY',
    icon: '⚡',
    color: 'var(--mood-angry)',
    hex: '#f3727f',
    glow: 'rgba(243, 114, 127, 0.28)',
    gradient: ['#f3727f', '#a1232f'],
    vibe: '紧绷、外扩、音量想调大',
    resonance: '同频推荐硬核摇滚与重拍，让情绪有地方出去',
    energy: 0.96,
    bpm: '128–160 BPM',
    tags: ['摇滚', '金属', '硬核'],
    queries: ['hard rock', 'aggressive rap', 'punk rock', 'metal'],
  },

  fearful: {
    key: 'fearful',
    label: '恐惧',
    short: 'FEARFUL',
    icon: '◐',
    color: 'var(--mood-fearful)',
    hex: '#9b7bf0',
    glow: 'rgba(155, 123, 240, 0.28)',
    gradient: ['#9b7bf0', '#3b2a6b'],
    vibe: '收缩、警觉、想找掩体',
    resonance: '同频推荐低频氛围与暗色电子，替你把不安铺开',
    energy: 0.34,
    bpm: '68–84 BPM',
    tags: ['氛围', '暗色电子', '环境'],
    queries: ['dark ambient', 'cinematic tension', 'atmospheric dark', 'thriller soundtrack'],
  },

  disgusted: {
    key: 'disgusted',
    label: '厌恶',
    short: 'DISGUSTED',
    icon: '✕',
    color: 'var(--mood-disgusted)',
    hex: '#7fb069',
    glow: 'rgba(127, 176, 105, 0.28)',
    gradient: ['#7fb069', '#33452c'],
    vibe: '排斥、皱眉、想转身走开',
    resonance: '同频推荐粗粝的另类摇滚，把这份排斥感唱出来',
    energy: 0.58,
    bpm: '92–112 BPM',
    tags: ['另类', '垃圾摇滚', '独立'],
    queries: ['grunge', 'alternative rock', 'garage rock', 'indie noise'],
  },

  surprised: {
    key: 'surprised',
    label: '惊讶',
    short: 'SURPRISED',
    icon: '◇',
    color: 'var(--mood-surprised)',
    hex: '#ffa42b',
    glow: 'rgba(255, 164, 43, 0.28)',
    gradient: ['#ffa42b', '#c25a00'],
    vibe: '被打开、注意力瞬间集中',
    resonance: '同频推荐跳跃的电子与实验音色，让你的好奇继续跑',
    energy: 0.74,
    bpm: '120–140 BPM',
    tags: ['电子', '实验', '合成器'],
    queries: ['future bass', 'experimental electronic', 'synth pop', 'electronic dance'],
  },

  neutral: {
    key: 'neutral',
    label: '中性',
    short: 'NEUTRAL',
    icon: '—',
    color: 'var(--mood-neutral)',
    hex: '#b3b3b3',
    glow: 'rgba(179, 179, 179, 0.22)',
    gradient: ['#8f8f8f', '#3a3a3a'],
    vibe: '平稳、中性、没有明显起伏',
    resonance: '同频推荐 lo-fi 与轻器乐，不打扰你现在这份平静',
    energy: 0.46,
    bpm: '72–90 BPM',
    tags: ['Lo-Fi', '轻音乐', '器乐'],
    queries: ['lofi beats', 'chill instrumental', 'calm piano', 'acoustic morning'],
  },
}

/** 模型输出的固定顺序（face-api 的 expression 键序不可改） */
export const EMOTION_KEYS = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'fearful',
  'disgusted',
  'surprised',
]

export const MOOD_LIST = EMOTION_KEYS.map((k) => EMOTIONS[k])

/** 用中文标签查元数据 */
export function moodByLabel(label) {
  return MOOD_LIST.find((m) => m.label === label) || null
}

export function moodOf(key) {
  return EMOTIONS[key] || EMOTIONS.neutral
}
