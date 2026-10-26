<script setup>
/**
 * 采集台：四种人脸获取方式统一到一个视口
 *   1) 输入图片   2) 打开视频   3) 实时摄像头   4) 拍照
 * 统一出口：把「当前帧」交给 faceEngine → 结果写回 scan → 画在 canvas 上
 */
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import Icon from './Icon.vue'
import { moodOf } from '../data/emotions.js'
import {
  state,
  toast,
  ensureModel,
  scanOnce,
  resetScan,
  commitMood,
} from '../composables/useStore.js'

const emit = defineEmits(['committed'])

const mode = ref('idle') // idle | image | video | camera | snapshot
const viewportRef = ref(null)
const imgRef = ref(null)
const videoRef = ref(null)
const canvasRef = ref(null)
const fileInputRef = ref(null)

const srcUrl = ref('')
const frozenUrl = ref('')
const isFrozen = ref(false)
const mediaSize = ref({ w: 0, h: 0 })
const cameraError = ref('')
const camBusy = ref(false)
const scanMs = ref(0)
const dragging = ref(false)

let stream = null
let loopTimer = null
let objectUrls = []

const TABS = [
  { key: 'image', label: '输入图片', icon: 'image' },
  { key: 'video', label: '打开视频', icon: 'film' },
  { key: 'camera', label: '实时摄像头', icon: 'camera' },
  { key: 'snapshot', label: '拍照', icon: 'aperture' },
]

const activeMood = computed(() =>
  state.scan.primary ? moodOf(state.scan.primary) : null,
)
const hasFace = computed(() => state.scan.count > 0)
const isLive = computed(() => mode.value === 'camera' || mode.value === 'snapshot')

/** 视口宽高比：让视口跟画面同比例，这样 object-fit:fill 不会变形，
 *  人脸框的坐标换算也退化成一次简单缩放。 */
const arNumber = computed(() => {
  const { w, h } = mediaSize.value
  if (!w || !h) return 1.6
  return Math.min(2.4, Math.max(0.55, w / h))
})

const showVideo = computed(
  () =>
    !isFrozen.value && (mode.value === 'video' || mode.value === 'camera' || mode.value === 'snapshot'),
)
const showImage = computed(() => mode.value === 'image' || isFrozen.value)
const showPlaceholder = computed(
  () =>
    mode.value === 'idle' ||
    (!srcUrl.value && !showVideo.value && !isFrozen.value),
)

/* ------------------------------------------------------------ 模型 */

async function bootModel() {
  await ensureModel()
  if (state.model.status === 'ready' && mode.value !== 'idle') {
    nextTick(() => runDetectOnce())
  }
}

/* -------------------------------------------------------- 生命周期 */

function clearLoop() {
  clearTimeout(loopTimer)
  loopTimer = null
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
    stream = null
  }
  camBusy.value = false
}

function releaseUrls() {
  objectUrls.forEach((u) => URL.revokeObjectURL(u))
  objectUrls = []
}

function cleanup() {
  clearLoop()
  stopCamera()
  releaseUrls()
  isFrozen.value = false
  frozenUrl.value = ''
  srcUrl.value = ''
  mediaSize.value = { w: 0, h: 0 }
  cameraError.value = ''
  resetScan(mode.value === 'idle' ? 'idle' : mode.value)
}

async function setMode(next) {
  if (next === mode.value && next !== 'snapshot') return
  cleanup()
  mode.value = next

  if (next === 'image' || next === 'video') {
    openPicker(next)
  } else if (next === 'camera' || next === 'snapshot') {
    await startCamera()
  }
}

async function startCamera() {
  cameraError.value = ''
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = '当前浏览器不支持摄像头，或页面不在 HTTPS / localhost 下'
    return
  }
  camBusy.value = true
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    })
    await nextTick()
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play().catch(() => {})
    }
  } catch (err) {
    const map = {
      NotAllowedError: '你拒绝了摄像头权限。点地址栏左侧的图标重新允许即可',
      NotFoundError: '没有找到可用的摄像头设备',
      NotReadableError: '摄像头被其他程序占用了（会议软件 / 相机 App）',
    }
    cameraError.value = map[err?.name] || '摄像头启动失败：' + (err?.message || '')
  } finally {
    camBusy.value = false
  }
}

/* ------------------------------------------------------------ 选文件 */

function openPicker(kind) {
  if (!fileInputRef.value) return
  fileInputRef.value.value = ''
  fileInputRef.value.accept = kind === 'image' ? 'image/*' : 'video/*'
  fileInputRef.value.dataset.kind = kind
  fileInputRef.value.click()
}

function onFilePicked(e) {
  const file = e.target.files?.[0]
  if (file) acceptFile(file)
}

function acceptFile(file) {
  if (!file) return
  const isVideo = file.type.startsWith('video')
  const isImage = file.type.startsWith('image')
  if (!isVideo && !isImage) {
    toast('只支持图片或视频文件（jpg / png / webp / mp4 / webm）', 'warning')
    return
  }

  cameraError.value = ''
  isFrozen.value = false
  clearLoop()
  releaseUrls()

  const url = URL.createObjectURL(file)
  objectUrls.push(url)
  srcUrl.value = url
  mode.value = isVideo ? 'video' : 'image'
  resetScan(mode.value)

  if (isVideo) {
    nextTick(() => {
      const v = videoRef.value
      if (!v) return
      v.currentTime = 0
      v.play().catch(() => {})
    })
  }
}

function onMediaMeta(e) {
  const el = e.target
  const w = el.videoWidth || el.naturalWidth || 0
  const h = el.videoHeight || el.naturalHeight || 0
  if (w && h) mediaSize.value = { w, h }
}

/** 图片解码失败（文件损坏 / 扩展名伪造）——必须和「没人脸」区分开 */
function onMediaError(e) {
  // 模式切换的瞬间 src 会短暂为空字符串，浏览器可能对其抛 error，这不是文件问题
  if (!e?.target?.getAttribute('src')) return
  if (import.meta.env.DEV) console.warn('[mediaError]', (e?.target?.src || '').slice(0, 80))
  toast('这个文件无法解码：可能已损坏，或不是有效的图片', 'error')
  srcUrl.value = ''
  mediaSize.value = { w: 0, h: 0 }
  resetScan('idle')
}

/* ------------------------------------------------------------ 检测 */

async function runDetectOnce(source) {
  const el =
    source ||
    (showImage.value ? imgRef.value : null) ||
    (showVideo.value ? videoRef.value : null)
  if (!el) return

  if (el.tagName === 'VIDEO' && el.readyState < 2) return

  const t0 = performance.now()
  // 静态图没有实时性压力，用更高的检测分辨率换更准的人脸框和情绪
  await scanOnce(el, { landmarks: true, inputSize: el.tagName === 'IMG' ? 512 : 416 })
  scanMs.value = Math.round(performance.now() - t0)
  drawOverlay()
}

function startLoop(interval = 600) {
  clearLoop()
  const tick = async () => {
    if (state.model.status !== 'ready') {
      loopTimer = setTimeout(tick, 500)
      return
    }
    if (!isFrozen.value && document.visibilityState === 'visible') {
      await runDetectOnce()
    }
    loopTimer = setTimeout(tick, interval)
  }
  tick()
}

function onVideoPlay() {
  if (mode.value === 'video') startLoop(700)
}
function onVideoPause() {
  if (mode.value === 'video') clearLoop()
  runDetectOnce()
}
function onVideoEnded() {
  clearLoop()
  runDetectOnce()
}

/* ------------------------------------------------------------ 拍照 */

async function takeSnapshot() {
  const v = videoRef.value
  if (!v || !v.videoWidth) return
  const c = document.createElement('canvas')
  c.width = v.videoWidth
  c.height = v.videoHeight
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
  frozenUrl.value = c.toDataURL('image/jpeg', 0.92)
  mediaSize.value = { w: c.width, h: c.height }
  isFrozen.value = true
  clearLoop()
  stopCamera() // 拍完就释放摄像头，不让指示灯一直亮着
  await nextTick()
  await runDetectOnce(imgRef.value)
}

async function retake() {
  isFrozen.value = false
  frozenUrl.value = ''
  resetScan('snapshot')
  await startCamera()
}

/* -------------------------------------------------------- 画面绘制 */

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function drawOverlay() {
  const c = canvasRef.value
  const vp = viewportRef.value
  if (!c || !vp) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const w = vp.clientWidth
  const h = vp.clientHeight
  if (!w || !h) return

  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr)
    c.height = Math.round(h * dpr)
    c.style.width = w + 'px'
    c.style.height = h + 'px'
  }
  const ctx = c.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const { w: nw, h: nh } = mediaSize.value
  if (!nw || !nh) return

  const sx = w / nw
  const sy = h / nh

  state.scan.faces.forEach((f, i) => {
    const mood = moodOf(f.primary)
    const x = f.box.x * sx
    const y = f.box.y * sy
    const bw = f.box.width * sx
    const bh = f.box.height * sy
    const isMain = i === 0

    ctx.save()
    ctx.lineJoin = 'round'

    // 半透明底衬，让框在亮背景上也看得见
    ctx.fillStyle = isMain ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.08)'
    roundRect(ctx, x, y, bw, bh, 6)
    ctx.fill()

    // 外框：主脸用情绪色，副脸压暗
    ctx.globalAlpha = isMain ? 1 : 0.55
    ctx.strokeStyle = mood.hex
    ctx.lineWidth = isMain ? 2 : 1.4
    roundRect(ctx, x, y, bw, bh, 6)
    ctx.stroke()

    // 四角加粗，做出「取景框」的感觉
    if (isMain) {
      const L = Math.min(18, bw * 0.22, bh * 0.22)
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y)
      ctx.moveTo(x + bw - L, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + L)
      ctx.moveTo(x, y + bh - L); ctx.lineTo(x, y + bh); ctx.lineTo(x + L, y + bh)
      ctx.moveTo(x + bw - L, y + bh); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw, y + bh - L)
      ctx.stroke()
    }

    // 关键点
    if (f.landmarks && isMain) {
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#ffffff'
      f.landmarks.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x * sx, p.y * sy, 1.1, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // 情绪标签
    ctx.globalAlpha = 1
    const label = `${mood.label} ${(f.confidence * 100).toFixed(0)}%`
    ctx.font = '600 12px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
    const tw = ctx.measureText(label).width
    const chipW = tw + 16
    const chipH = 22
    const cx = Math.min(Math.max(x, 2), w - chipW - 2)
    const cy = y - chipH - 6 < 4 ? y + 6 : y - chipH - 6

    ctx.fillStyle = mood.hex
    roundRect(ctx, cx, cy, chipW, chipH, 11)
    ctx.fill()
    ctx.fillStyle = '#0d0d0d'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx + 8, cy + chipH / 2 + 0.5)

    if (state.scan.count > 1 && isMain) {
      const note = `+${state.scan.count - 1}`
      ctx.fillStyle = 'rgba(0,0,0,0.72)'
      roundRect(ctx, cx + chipW + 4, cy, 26, chipH, 11)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(note, cx + chipW + 10, cy + chipH / 2 + 0.5)
    }
    ctx.restore()
  })
}

watch(
  () => [state.scan.faces, state.scan.frameAt, mediaSize.value],
  () => nextTick(drawOverlay),
  { deep: false },
)

/* ------------------------------------------------------------ 交互 */

async function commit() {
  const snap = await commitMood()
  if (snap) emit('committed', snap)
}

function onDrop(e) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) acceptFile(file)
}
function onDragOver(e) {
  e.preventDefault()
  dragging.value = true
}
function onDragLeave() {
  dragging.value = false
}

onBeforeUnmount(() => {
  cleanup()
})

// 首次进入即预热模型，用户点任何入口时都不用等
bootModel()
</script>

<template>
  <section class="stage panel">
    <!-- 顶栏：模式切换 + 引擎状态 -->
    <header class="stage__head">
      <nav class="tabs" role="tablist" aria-label="人脸来源">
        <button
          v-for="t in TABS"
          :key="t.key"
          class="tab"
          :class="{ 'is-active': mode === t.key || (t.key === 'snapshot' && mode === 'snapshot') }"
          role="tab"
          :aria-selected="mode === t.key"
          @click="setMode(t.key)"
        >
          <Icon :name="t.icon" :size="15" />
          <span>{{ t.label }}</span>
        </button>
      </nav>

      <div class="engine" :class="`is-${state.model.status}`">
        <span v-if="state.model.status === 'loading'" class="engine__dot is-spin">
          <Icon name="loader" :size="12" />
        </span>
        <span v-else class="engine__dot" />
        <span class="engine__text">
          <template v-if="state.model.status === 'idle'">准备本地模型</template>
          <template v-else-if="state.model.status === 'loading'">正在加载模型</template>
          <template v-else-if="state.model.status === 'ready'">
            本地推理就绪 · {{ state.model.backend?.toUpperCase() }}
            <em v-if="scanMs"> · {{ scanMs }}ms</em>
          </template>
          <template v-else>模型加载失败</template>
        </span>
      </div>
    </header>

    <!-- 视口 -->
    <div
      class="viewport"
      :class="{ 'is-dragging': dragging, 'is-empty': showPlaceholder }"
      :style="{ '--ar': arNumber }"
      ref="viewportRef"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <img
        v-if="showImage"
        ref="imgRef"
        class="media"
        :class="{ 'is-mirrored': false }"
        :src="isFrozen ? frozenUrl : srcUrl"
        alt="待识别的人脸画面"
        crossorigin="anonymous"
        @load="(e) => { onMediaMeta(e); runDetectOnce(e.target) }"
        @error="onMediaError"
      />

      <video
        v-show="showVideo"
        ref="videoRef"
        class="media"
        :class="{ 'is-mirrored': showVideo && mode !== 'video' }"
        :src="mode === 'video' ? srcUrl : undefined"
        playsinline
        muted
        @loadedmetadata="onMediaMeta"
        @loadeddata="() => runDetectOnce()"
        @play="onVideoPlay"
        @pause="onVideoPause"
        @ended="onVideoEnded"
      />

      <canvas ref="canvasRef" class="overlay" />

      <!-- 占位：四个入口 -->
      <div v-if="showPlaceholder" class="placeholder">
        <div class="placeholder__icon">
          <Icon name="scan" :size="30" />
        </div>
        <h3 class="t-section">把脸交给它</h3>
        <p class="placeholder__desc">
          选择一种方式提供画面，模型在本机完成推理——
          图片和视频帧不会上传到任何服务器。
        </p>
        <div class="placeholder__grid">
          <button class="src-card" @click="setMode('image')">
            <Icon name="image" :size="20" />
            <strong>输入图片</strong>
            <span>jpg / png / webp</span>
          </button>
          <button class="src-card" @click="setMode('video')">
            <Icon name="film" :size="20" />
            <strong>打开视频</strong>
            <span>mp4 / webm / mov</span>
          </button>
          <button class="src-card" @click="setMode('camera')">
            <Icon name="camera" :size="20" />
            <strong>实时摄像头</strong>
            <span>逐帧连续识别</span>
          </button>
          <button class="src-card" @click="setMode('snapshot')">
            <Icon name="aperture" :size="20" />
            <strong>拍照</strong>
            <span>定格一帧再识别</span>
          </button>
        </div>
        <p class="placeholder__hint">也可以直接把图片或视频拖进这个框</p>
      </div>

      <!-- 摄像头错误 -->
      <div v-if="cameraError" class="alert">
        <Icon name="shield" :size="16" />
        <span>{{ cameraError }}</span>
        <button class="btn btn--tiny btn--ghost" @click="startCamera">重试</button>
      </div>

      <!-- 无人脸提示 -->
      <div
        v-else-if="mode !== 'idle' && !showPlaceholder && !hasFace && state.model.status === 'ready' && !camBusy"
        class="no-face"
      >
        <Icon name="scan" :size="16" />
        <span>画面里没有检测到人脸 —— 正对镜头、把脸放大一点、或者换更亮的光线</span>
      </div>

      <!-- 实时情绪角标 -->
      <div v-if="hasFace && activeMood" class="live-badge" :style="{ '--m': activeMood.hex }">
        <span class="live-badge__dot" />
        <span>{{ activeMood.label }}</span>
        <b>{{ (state.scan.confidence * 100).toFixed(0) }}%</b>
        <em v-if="state.scan.count > 1">· {{ state.scan.count }} 张脸</em>
      </div>

      <!-- 画面角标：本地推理（占位态下和标题重叠，且占位文案已说明隐私，故隐藏） -->
      <div v-if="!showPlaceholder" class="privacy-tag">
        <Icon name="shield" :size="12" />
        本地推理 · 不上传
      </div>
    </div>

    <!-- 底部操作 -->
    <footer class="stage__foot">
      <div class="foot-left">
        <template v-if="mode === 'image'">
          <button class="btn btn--ghost btn--tiny" @click="openPicker('image')">
            <Icon name="refresh" :size="13" /> 换一张
          </button>
        </template>
        <template v-else-if="mode === 'video'">
          <button class="btn btn--ghost btn--tiny" @click="videoRef?.paused ? videoRef.play() : videoRef.pause()">
            {{ videoRef?.paused ? '播放' : '暂停' }}
          </button>
          <button class="btn btn--ghost btn--tiny" @click="openPicker('video')">
            <Icon name="refresh" :size="13" /> 换个视频
          </button>
        </template>
        <template v-else-if="mode === 'camera'">
          <button class="btn btn--ghost btn--tiny" @click="takeSnapshot">
            <Icon name="aperture" :size="13" /> 定格当前帧
          </button>
          <button class="btn btn--ghost btn--tiny" @click="setMode('idle')">关闭摄像头</button>
        </template>
        <template v-else-if="mode === 'snapshot'">
          <template v-if="isFrozen">
            <button class="btn btn--ghost btn--tiny" @click="retake">
              <Icon name="refresh" :size="13" /> 重拍
            </button>
          </template>
          <template v-else>
            <button class="btn btn--tiny btn--primary" :disabled="!showVideo" @click="takeSnapshot">
              <Icon name="aperture" :size="13" /> 拍下这一帧
            </button>
          </template>
        </template>
        <span v-else class="t-small">先选一种方式提供画面</span>
      </div>

      <div class="foot-right">
        <span v-if="state.model.status === 'error'" class="t-small error-text">
          {{ state.model.error }}
        </span>
        <button
          class="btn btn--primary"
          :disabled="!hasFace || state.model.status !== 'ready' || state.recommendation.loading"
          @click="commit"
        >
          <Icon name="wave" :size="15" />
          按这个情绪推荐
        </button>
      </div>
    </footer>

    <input
      ref="fileInputRef"
      type="file"
      class="sr-only"
      @change="onFilePicked"
    />
  </section>
</template>

<style scoped>
.stage {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* —— 顶栏 —— */
.stage__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--bg-base);
  border-radius: var(--r-pill);
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 15px;
  border-radius: var(--r-pill);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2px;
  transition: background 0.16s var(--ease), color 0.16s var(--ease);
  white-space: nowrap;
}
.tab:hover {
  color: var(--text-base);
}
.tab.is-active {
  background: var(--bg-elevated);
  color: var(--text-base);
  box-shadow: var(--shadow-low);
}

.engine {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 13px;
  border-radius: var(--r-pill);
  background: var(--bg-base);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--text-muted);
}
.engine__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-dim);
}
.engine.is-ready .engine__dot {
  background: var(--accent);
  box-shadow: 0 0 0 3px rgba(30, 215, 96, 0.16);
}
.engine.is-error .engine__dot {
  background: var(--negative);
}
.engine.is-loading .engine__dot {
  background: transparent;
  width: auto;
  height: auto;
  animation: spin 1.4s linear infinite;
  display: inline-flex;
}
.engine.is-ready .engine__text {
  color: var(--text-near);
}
.engine em {
  font-style: normal;
  color: var(--text-dim);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* —— 视口 —— */
.viewport {
  position: relative;
  width: min(100%, calc(var(--vh-cap, 56vh) * var(--ar, 1.6)));
  aspect-ratio: var(--ar, 1.6);
  max-height: var(--vh-cap, 56vh);
  margin: 0 auto;
  background: #0a0a0a;
  border-radius: var(--r-8);
  overflow: hidden;
  box-shadow: var(--shadow-heavy), inset 0 0 0 1px #232323;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s var(--ease);
}
.viewport.is-dragging {
  box-shadow: var(--shadow-heavy), inset 0 0 0 2px var(--accent);
}

.media {
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
}
.media.is-mirrored {
  transform: scaleX(-1);
}

.overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.overlay.is-mirrored,
.media.is-mirrored + .overlay {
  transform: scaleX(-1);
}

/* —— 占位 —— */
.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 26px 22px;
  text-align: center;
  background: radial-gradient(120% 80% at 50% 0%, #1c1c1c 0%, #0d0d0d 62%);
  overflow-y: auto;
}
.placeholder__icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--bg-elevated);
  color: var(--accent);
  box-shadow: 0 0 0 1px #2c2c2c, 0 8px 24px rgba(0, 0, 0, 0.5);
}
.placeholder__desc {
  max-width: 460px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted);
}
.placeholder__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  max-width: 660px;
  margin-top: 4px;
}
.src-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 12px;
  border-radius: var(--r-8);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
  text-align: left;
  transition: background 0.16s var(--ease), transform 0.16s var(--ease),
    color 0.16s var(--ease);
}
.src-card:hover {
  background: rgba(255, 255, 255, 0.09);
  color: var(--text-base);
  transform: translateY(-2px);
}
.src-card strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-base);
}
.src-card span {
  font-size: 10.5px;
  color: var(--text-dim);
  letter-spacing: 0.2px;
}
.placeholder__hint {
  font-size: 11px;
  color: var(--text-dim);
}

/* —— 叠加提示 —— */
.alert,
.no-face {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--r-pill);
  font-size: 12px;
  backdrop-filter: blur(8px);
}
.alert {
  background: rgba(243, 114, 127, 0.16);
  color: var(--negative);
  box-shadow: inset 0 0 0 1px rgba(243, 114, 127, 0.4);
  justify-content: flex-start;
}
.alert span {
  flex: 1;
}
.no-face {
  background: rgba(18, 18, 18, 0.78);
  color: var(--text-muted);
  box-shadow: inset 0 0 0 1px #333;
  text-align: left;
}

.live-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: var(--r-pill);
  background: rgba(12, 12, 12, 0.78);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.live-badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--m);
  box-shadow: 0 0 0 0 var(--m);
  animation: pulse 1.8s infinite;
}
.live-badge b {
  color: var(--m);
  font-variant-numeric: tabular-nums;
}
.live-badge em {
  font-style: normal;
  font-weight: 400;
  color: var(--text-muted);
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.35);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(255, 255, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
}

.privacy-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: var(--r-pill);
  background: rgba(12, 12, 12, 0.66);
  backdrop-filter: blur(8px);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--text-dim);
  text-transform: uppercase;
}

/* —— 底栏 —— */
.stage__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.foot-left,
.foot-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.error-text {
  color: var(--negative);
}

@media (max-width: 900px) {
  .placeholder__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .viewport {
    --vh-cap: 44vh;
  }
}
@media (max-width: 560px) {
  .tabs {
    width: 100%;
    overflow-x: auto;
  }
  .tab span {
    display: none;
  }
  .tab {
    padding: 9px 12px;
  }
  /* 占位内容在窄屏比按宽高比算出的视口高，放开高度让四个入口完整展示 */
  .viewport.is-empty {
    aspect-ratio: auto;
    width: 100%;
    min-height: 400px;
    max-height: none;
  }
  .stage__foot {
    flex-direction: column;
    align-items: stretch;
  }
  .foot-right {
    justify-content: flex-end;
  }
}
</style>
