<script setup>
/**
 * 收藏与自建歌单
 * 收藏是一层，歌单是二层 —— 用户可以按场景（通勤 / 深夜 / 跑步）自己归类。
 * 全部存 localStorage，刷新不丢。
 */
import { ref, computed } from 'vue'
import Icon from './Icon.vue'
import TrackCover from './TrackCover.vue'
import {
  state,
  toggleFavorite,
  createPlaylist,
  deletePlaylist,
  removeFromPlaylist,
} from '../composables/useStore.js'
import { playTrack, player } from '../composables/usePlayer.js'

const emit = defineEmits(['go-detect'])

const newName = ref('')
const expanded = ref(null)

const favs = computed(() => state.favorites)

const fmt = (s) => {
  const d = s || 0
  return d ? `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}` : '--:--'
}

function submitPlaylist() {
  const pl = createPlaylist(newName.value)
  if (pl) {
    newName.value = ''
    expanded.value = pl.id
  }
}

function playList(list) {
  if (list.length) playTrack(list[0], list)
}
</script>

<template>
  <section class="favs">
    <header class="head">
      <div>
        <span class="t-badge kicker">LIBRARY</span>
        <h2 class="t-section">我的收藏</h2>
        <p class="sub">存了 {{ favs.length }} 首 · 与你当下情绪无关，只凭耳朵选</p>
      </div>
      <button
        v-if="favs.length"
        class="btn btn--primary btn--tiny"
        @click="playList(favs)"
      >
        <Icon name="play" :size="13" filled /> 播放收藏
      </button>
    </header>

    <!-- 收藏列表 -->
    <div v-if="favs.length" class="list">
      <div
        v-for="(t, i) in favs"
        :key="t.id"
        class="row"
        :class="{ 'is-current': player.current?.id === t.id }"
      >
        <span class="row__idx t-mono">{{ String(i + 1).padStart(2, '0') }}</span>
        <button class="row__art" @click="playTrack(t, favs)">
          <TrackCover :track="t" size="sm" />
          <span class="row__play"><Icon name="play" :size="12" filled /></span>
        </button>
        <div class="row__meta">
          <span class="row__title">{{ t.title }}</span>
          <span class="row__artist">{{ t.artist }}</span>
        </div>
        <span class="row__badge" :class="t.provider === 'local' ? 'is-local' : ''">
          {{ t.provider === 'local' ? '离线' : '30s' }}
        </span>
        <span class="row__dur t-mono">{{ fmt(t.duration) }}</span>
        <button class="icon-btn is-active" title="取消收藏" @click="toggleFavorite(t)">
          <Icon name="heart" :size="15" filled />
        </button>
      </div>
    </div>

    <div v-else class="empty">
      <div class="empty__icon"><Icon name="heart" :size="24" /></div>
      <h3 class="t-feature">收藏夹是空的</h3>
      <p class="t-caption">在推荐列表里点一下心形图标，歌就会留在这里。</p>
      <button class="btn btn--primary btn--tiny" @click="emit('go-detect')">
        去听点歌
      </button>
    </div>

    <hr class="divider" style="margin: 24px 0" />

    <!-- 歌单 -->
    <header class="head head--tight">
      <div>
        <span class="t-badge kicker">PLAYLISTS</span>
        <h2 class="t-section">我的歌单</h2>
      </div>
      <form class="new" @submit.prevent="submitPlaylist">
        <input
          v-model="newName"
          class="new__input"
          type="text"
          maxlength="20"
          placeholder="给新歌单起个名字"
          aria-label="新歌单名称"
        />
        <button class="btn btn--tiny btn--ghost" type="submit" :disabled="!newName.trim()">
          <Icon name="plus" :size="13" /> 新建
        </button>
      </form>
    </header>

    <div v-if="state.playlists.length" class="pl-grid">
      <article
        v-for="pl in state.playlists"
        :key="pl.id"
        class="pl"
        :class="{ 'is-open': expanded === pl.id }"
      >
        <div class="pl__head">
          <div class="pl__icon"><Icon name="music" :size="16" /></div>
          <div class="pl__meta">
            <strong>{{ pl.name }}</strong>
            <span class="t-micro">{{ pl.tracks.length }} 首</span>
          </div>
          <div class="pl__acts">
            <button
              class="icon-btn"
              title="播放"
              :disabled="!pl.tracks.length"
              @click="playList(pl.tracks)"
            >
              <Icon name="play" :size="14" filled />
            </button>
            <button
              class="icon-btn"
              :title="expanded === pl.id ? '收起' : '展开'"
              @click="expanded = expanded === pl.id ? null : pl.id"
            >
              <Icon :name="expanded === pl.id ? 'close' : 'plus'" :size="14" />
            </button>
            <button class="icon-btn" title="删除歌单" @click="deletePlaylist(pl.id)">
              <Icon name="trash" :size="14" />
            </button>
          </div>
        </div>

        <ul v-if="expanded === pl.id" class="pl__tracks">
          <li v-for="t in pl.tracks" :key="t.id" class="pl__track">
            <button class="pl__tname" @click="playTrack(t, pl.tracks)">
              <Icon name="play" :size="10" filled />{{ t.title }}
            </button>
            <span class="t-micro">{{ t.artist }}</span>
            <button class="icon-btn pl__del" @click="removeFromPlaylist(pl.id, t.id)">
              <Icon name="close" :size="12" />
            </button>
          </li>
          <li v-if="!pl.tracks.length" class="pl__empty t-small">
            还空着 —— 在曲目卡上点「＋」把歌放进来
          </li>
        </ul>
      </article>
    </div>

    <p v-else class="t-small" style="margin-top: 12px">
      还没有歌单。建一个「深夜通勤」或「跑步 160 BPM」试试。
    </p>
  </section>
</template>

<style scoped>
.favs {
  display: flex;
  flex-direction: column;
}
.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.head--tight {
  margin-bottom: 12px;
}
.kicker {
  color: var(--text-dim);
}
.sub {
  margin-top: 5px;
  font-size: 12.5px;
  color: var(--text-muted);
}

/* 列表 */
.list {
  border-radius: var(--r-8);
  background: var(--bg-surface);
  padding: 6px;
}
.row {
  display: grid;
  grid-template-columns: 26px 40px 1fr 44px 42px 32px;
  align-items: center;
  gap: 11px;
  padding: 7px 8px;
  border-radius: var(--r-6);
  transition: background 0.16s var(--ease);
}
.row:hover {
  background: rgba(255, 255, 255, 0.05);
}
.row.is-current .row__title {
  color: var(--accent);
}
.row__idx {
  font-size: 11px;
  color: var(--text-dim);
  text-align: center;
}
.row__art {
  position: relative;
  width: 40px;
  border-radius: var(--r-4);
  overflow: hidden;
}
.row__play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  opacity: 0;
  transition: opacity 0.16s var(--ease);
}
.row__art:hover .row__play {
  opacity: 1;
}
.row__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.row__title {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row__artist {
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row__badge {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--text-dim);
  text-align: center;
  padding: 2px 0;
  border-radius: var(--r-2);
  background: rgba(255, 255, 255, 0.05);
}
.row__badge.is-local {
  color: var(--warning);
}
.row__dur {
  font-size: 11px;
  color: var(--text-dim);
  text-align: right;
}

/* 新建歌单 */
.new {
  display: flex;
  gap: 8px;
}
.new__input {
  width: 190px;
  padding: 9px 16px;
  border-radius: var(--r-pill);
  border: 0;
  background: var(--bg-elevated);
  color: var(--text-base);
  font-size: 12.5px;
  box-shadow: var(--inset-border);
  outline: none;
}
.new__input::placeholder {
  color: var(--text-dim);
}
.new__input:focus {
  box-shadow: inset 0 0 0 1px var(--text-base);
}

/* 歌单 */
.pl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
  gap: 10px;
}
.pl {
  border-radius: var(--r-8);
  background: var(--bg-surface);
  overflow: hidden;
}
.pl.is-open {
  background: var(--bg-card);
}
.pl__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px;
}
.pl__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: var(--r-6);
  background: var(--bg-elevated);
  color: var(--accent);
  flex: 0 0 auto;
}
.pl__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.pl__meta strong {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pl__acts {
  display: flex;
  gap: 0;
}
.pl__acts .icon-btn {
  width: 28px;
  height: 28px;
}

.pl__tracks {
  padding: 0 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pl__track {
  display: grid;
  grid-template-columns: 1fr auto 22px;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border-radius: var(--r-4);
}
.pl__track:hover {
  background: rgba(255, 255, 255, 0.05);
}
.pl__tname {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-near);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pl__tname:hover {
  color: var(--accent);
}
.pl__del {
  width: 22px;
  height: 22px;
  opacity: 0;
}
.pl__track:hover .pl__del {
  opacity: 1;
}
.pl__empty {
  padding: 8px 6px;
}

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 40px 20px;
  border-radius: var(--r-8);
  background: var(--bg-surface);
  text-align: center;
}
.empty__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-elevated);
  color: var(--text-dim);
}
.empty p {
  margin-bottom: 4px;
}

@media (max-width: 700px) {
  .row {
    grid-template-columns: 33px 1fr 38px 30px;
    gap: 9px;
  }
  .row__idx,
  .row__badge {
    display: none;
  }
  .new__input {
    width: 130px;
  }
}
</style>
