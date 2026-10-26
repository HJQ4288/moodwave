<script setup>
/**
 * 左侧导航：Spotify 的固定侧栏
 * 底部放一块「引擎状态」，把模型后端、曲库来源、隐私策略显性化
 */
import { computed } from 'vue'
import Icon from './Icon.vue'
import { state } from '../composables/useStore.js'

defineProps({ active: { type: String, default: 'detect' } })
const emit = defineEmits(['navigate'])

const NAV = [
  { key: 'detect', label: '情绪识别', icon: 'scan' },
  { key: 'favorites', label: '我的收藏', icon: 'heart' },
  { key: 'timeline', label: '情绪时间线', icon: 'activity' },
]

const counts = computed(() => ({
  favorites: state.favorites.length,
  timeline: state.history.length,
}))

const backendText = computed(() => {
  if (state.model.status === 'ready') return `${state.model.backend?.toUpperCase()} 就绪`
  if (state.model.status === 'loading') return '模型加载中'
  if (state.model.status === 'error') return '模型异常'
  return '待加载'
})
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <span class="brand__mark">
        <Icon name="wave" :size="17" />
      </span>
      <div class="brand__text">
        <strong>Moodwave</strong>
        <span>情绪音乐推荐</span>
      </div>
    </div>

    <nav class="nav">
      <button
        v-for="item in NAV"
        :key="item.key"
        class="nav__item"
        :class="{ 'is-active': active === item.key }"
        @click="emit('navigate', item.key)"
      >
        <Icon :name="item.icon" :size="17" />
        <span>{{ item.label }}</span>
        <em v-if="counts[item.key]" class="nav__count">{{ counts[item.key] }}</em>
      </button>
    </nav>

    <div class="side-card">
      <span class="t-badge side-card__label">
        <Icon name="shield" :size="11" /> 隐私
      </span>
      <p>
        人脸检测与情绪推理全部在浏览器内完成，图片、视频帧、摄像头画面
        <b>不会上传</b>到任何服务器。
      </p>
    </div>

    <div class="side-card side-card--status">
      <div class="status">
        <span class="status__dot" :class="`is-${state.model.status}`" />
        <span>{{ backendText }}</span>
      </div>
      <div class="status">
        <span class="status__dot is-ok" />
        <span>在线曲库 + 离线兜底</span>
      </div>
      <p class="status__note">
        推荐优先使用 Apple Music 在线曲库（30 秒试听）；接口超时或断网时自动切到内置曲库，播放不中断。
      </p>
    </div>

    <p class="credit">
      视觉规范参照
      <em>awesome-design-md / spotify</em>
    </p>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 14px;
  background: var(--bg-base);
  box-shadow: inset -1px 0 0 #1f1f1f;
  overflow-y: auto;
}

/* 品牌 */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 6px 4px;
}
.brand__mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-ink);
  box-shadow: 0 0 22px rgba(30, 215, 96, 0.28);
}
.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.brand__text strong {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.brand__text span {
  font-size: 10.5px;
  color: var(--text-dim);
  letter-spacing: 0.4px;
}

/* 导航 */
.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav__item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 12px;
  border-radius: var(--r-4);
  color: var(--text-muted);
  font-size: 13.5px;
  font-weight: 400;
  transition: color 0.16s var(--ease), background 0.16s var(--ease);
  text-align: left;
}
.nav__item:hover {
  color: var(--text-base);
  background: rgba(255, 255, 255, 0.04);
}
.nav__item.is-active {
  color: var(--text-base);
  font-weight: 700;
  background: rgba(255, 255, 255, 0.07);
}
.nav__item.is-active svg {
  color: var(--accent);
}
.nav__count {
  margin-left: auto;
  font-style: normal;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.07);
  padding: 1px 6px;
  border-radius: var(--r-pill);
}

/* 侧卡 */
.side-card {
  padding: 12px;
  border-radius: var(--r-8);
  background: var(--bg-surface);
}
.side-card__label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-dim);
  margin-bottom: 6px;
}
.side-card p {
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-muted);
}
.side-card p b {
  color: var(--accent);
  font-weight: 700;
}

.side-card--status {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.status {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-near);
}
.status__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-dim);
  flex: 0 0 auto;
}
.status__dot.is-ready,
.status__dot.is-ok {
  background: var(--accent);
}
.status__dot.is-loading {
  background: var(--warning);
}
.status__dot.is-error {
  background: var(--negative);
}
.status__note {
  margin-top: 2px;
  font-size: 10.5px;
  line-height: 1.55;
  color: var(--text-dim);
}

.credit {
  font-size: 9.5px;
  color: #4a4a4a;
  letter-spacing: 0.3px;
  padding: 0 6px;
}
.credit em {
  font-style: normal;
  color: #5e5e5e;
}

@media (max-width: 860px) {
  .sidebar {
    display: none;
  }
}
</style>
