<script setup>
/**
 * 「加入歌单」弹层：选了歌之后再问放哪个歌单，避免在卡片上塞二级菜单
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'
import TrackCover from './TrackCover.vue'
import {
  state,
  addToPlaylist,
  createPlaylist,
  toggleFavorite,
  isFavorite,
} from '../composables/useStore.js'

const props = defineProps({ track: { type: Object, required: true } })
const emit = defineEmits(['close'])

const name = ref('')
const fav = ref(isFavorite(props.track))

function add(plId) {
  addToPlaylist(plId, props.track)
  emit('close')
}

function createAndAdd() {
  const pl = createPlaylist(name.value)
  if (pl) {
    addToPlaylist(pl.id, props.track)
    name.value = ''
    emit('close')
  }
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <teleport to="body">
    <div class="mask" @click.self="emit('close')">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="加入歌单">
        <header class="sheet__head">
          <div class="sheet__track">
            <TrackCover :track="track" size="sm" class="sheet__cover" />
            <div>
              <strong>{{ track.title }}</strong>
              <span class="t-small">{{ track.artist }}</span>
            </div>
          </div>
          <button class="icon-btn" title="关闭" @click="emit('close')">
            <Icon name="close" :size="16" />
          </button>
        </header>

        <button class="opt" @click="toggleFavorite(track); fav = !fav">
          <span class="opt__icon"><Icon name="heart" :size="15" :filled="fav" /></span>
          <span class="opt__text">
            {{ fav ? '已收藏' : '加入我的收藏' }}
            <em>所有收藏都在「我的收藏」里</em>
          </span>
          <Icon v-if="fav" name="check" :size="15" class="opt__check" />
        </button>

        <div class="sheet__list">
          <p class="t-badge sheet__label">已有歌单</p>
          <button
            v-for="pl in state.playlists"
            :key="pl.id"
            class="opt"
            @click="add(pl.id)"
          >
            <span class="opt__icon"><Icon name="music" :size="15" /></span>
            <span class="opt__text">
              {{ pl.name }}
              <em>{{ pl.tracks.length }} 首</em>
            </span>
            <Icon name="plus" :size="15" class="opt__check" />
          </button>
          <p v-if="!state.playlists.length" class="t-small sheet__none">
            还没有歌单，下面新建一个
          </p>
        </div>

        <form class="sheet__new" @submit.prevent="createAndAdd">
          <input
            v-model="name"
            class="sheet__input"
            type="text"
            maxlength="20"
            placeholder="新建歌单并加入"
          />
          <button class="btn btn--tiny btn--primary" type="submit" :disabled="!name.trim()">
            创建
          </button>
        </form>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--bg-overlay);
  backdrop-filter: blur(3px);
  animation: fade 0.18s var(--ease);
}
.sheet {
  width: min(420px, 100%);
  max-height: 80vh;
  overflow-y: auto;
  padding: 16px;
  border-radius: var(--r-8);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-heavy), inset 0 0 0 1px #2e2e2e;
  animation: rise 0.2s var(--ease);
}
@keyframes fade {
  from {
    opacity: 0;
  }
}
@keyframes rise {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
}

.sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.sheet__track {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.sheet__cover {
  width: 42px;
  flex: 0 0 42px;
}
.sheet__track div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.sheet__track strong {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opt {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  border-radius: var(--r-6);
  text-align: left;
  transition: background 0.16s var(--ease);
}
.opt:hover {
  background: rgba(255, 255, 255, 0.06);
}
.opt__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--r-6);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-near);
  flex: 0 0 auto;
}
.opt__text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  flex-direction: column;
}
.opt__text em {
  font-style: normal;
  font-size: 10.5px;
  font-weight: 400;
  color: var(--text-dim);
}
.opt__check {
  color: var(--accent);
  flex: 0 0 auto;
}

.sheet__label {
  color: var(--text-dim);
  padding: 10px 10px 4px;
}
.sheet__list {
  display: flex;
  flex-direction: column;
  max-height: 32vh;
  overflow-y: auto;
}
.sheet__none {
  padding: 6px 10px 10px;
}

.sheet__new {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #2c2c2c;
}
.sheet__input {
  flex: 1;
  padding: 9px 16px;
  border: 0;
  border-radius: var(--r-pill);
  background: var(--bg-base);
  color: var(--text-base);
  font-size: 12.5px;
  box-shadow: var(--inset-border);
  outline: none;
}
.sheet__input:focus {
  box-shadow: inset 0 0 0 1px var(--text-base);
}
</style>
