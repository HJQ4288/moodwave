/**
 * 人脸情绪识别引擎（100% 本地推理）
 *
 * 模型：@vladmandic/face-api
 *  - tiny_face_detector   人脸检测（速度优先，适合摄像头逐帧）
 *  - face_expression      7 类表情分类
 *  - face_landmark_68     68 个关键点（仅用于画面上的辅助描点）
 *
 * 权重放在 public/models/（约 870KB），不请求任何外部 CDN，
 * 图片与视频帧不会离开本机。
 */

import * as faceapi from '@vladmandic/face-api'
import { EMOTION_KEYS } from '../data/emotions.js'

const MODEL_URL = '/models'

let loadPromise = null

/** 模型只在首次调用时加载，后续复用同一个 Promise */
export function loadModels() {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    // WebGL 后端在浏览器里比 CPU 后端快 5–10 倍；失败则自动回落
    try {
      await faceapi.tf.setBackend('webgl')
      await faceapi.tf.ready()
    } catch {
      await faceapi.tf.setBackend('cpu')
      await faceapi.tf.ready()
    }

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ])

    return {
      backend: faceapi.tf.getBackend(),
      inputs: ['tiny_face_detector', 'face_expression', 'face_landmark_68'],
    }
  })()

  loadPromise.catch(() => {
    // 加载失败要允许重试，否则状态会永久卡住
    loadPromise = null
  })

  return loadPromise
}

export function isModelReady() {
  return (
    faceapi.nets.tinyFaceDetector.isLoaded &&
    faceapi.nets.faceExpressionNet.isLoaded
  )
}

/**
 * 检测一帧画面
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input
 * @param {{ landmarks?: boolean, scoreThreshold?: number, inputSize?: number }} opts
 * @returns {Promise<Array>} face-api 的原始结果数组
 */
export async function detectFaces(input, opts = {}) {
  const { landmarks = false, scoreThreshold = 0.35, inputSize = 416 } = opts

  if (!input) return []
  const w = input.videoWidth || input.naturalWidth || input.width || 0
  const h = input.videoHeight || input.naturalHeight || input.height || 0
  if (!w || !h) return []

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })

  // 注意链式顺序：必须先 withFaceLandmarks 再 withFaceExpressions，
  // 反过来在 face-api 1.7 里会直接抛错
  let task = faceapi.detectAllFaces(input, options)
  if (landmarks) task = task.withFaceLandmarks()
  task = task.withFaceExpressions()

  const results = await task
  return results || []
}

/**
 * 把 face-api 原始结果整理成 UI 可用的结构
 * - 主情绪取「面积最大的那张脸」，避免背景里的小脸干扰
 * - 分布做归一化，保证 7 维加起来是 1
 */
export function summarize(results, opts = {}) {
  const { primaryMode = 'largest' } = opts
  if (!results || results.length === 0) {
    return { faces: [], distribution: [], primary: null, confidence: 0, count: 0 }
  }

  const faces = results.map((r, index) => {
    const box = r.detection?.box || { x: 0, y: 0, width: 0, height: 0 }
    const raw = r.expressions || {}
    const total = EMOTION_KEYS.reduce((s, k) => s + (raw[k] || 0), 0) || 1
    const dist = EMOTION_KEYS.map((key) => ({
      key,
      score: (raw[key] || 0) / total,
    })).sort((a, b) => b.score - a.score)

    return {
      index,
      box: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        area: (box.width || 0) * (box.height || 0),
      },
      score: r.detection?.score || 0,
      distribution: dist,
      primary: dist[0].key,
      confidence: dist[0].score,
      landmarks: r.landmarks?.positions || null,
    }
  })

  let main = faces[0]
  if (primaryMode === 'largest') {
    main = faces.reduce((a, b) => (b.box.area > a.box.area ? b : a), faces[0])
  }

  // 排序后保留 UI 顺序稳定（按面积从大到小）
  faces.sort((a, b) => b.box.area - a.box.area)

  return {
    faces,
    distribution: main.distribution,
    primary: main.primary,
    confidence: main.confidence,
    count: faces.length,
  }
}

export { faceapi }
