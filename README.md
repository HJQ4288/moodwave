# Moodwave · 基于人脸情绪识别的歌曲推荐系统

上传图片 / 打开视频 / 实时摄像头 / 拍照 —— 四种方式获取人脸，模型在本机识别 7 类情绪，再按「情绪共振」策略从在线曲库挑出同频的歌。

技术栈：**HTML5 + CSS3 + JavaScript + Vue 3（Composition API）+ Vite**，情绪识别为 **face-api.js（@vladmandic/face-api）** 本地推理。

## 快速开始

**方式一：双击启动（推荐，无需命令行）**

双击根目录的 **`启动Moodwave.bat`**。它会自动检查 Node、首次运行时安装依赖、起本地服务并打开浏览器。

**方式二：命令行**

```bash
npm install
npm run dev        # 打开 http://127.0.0.1:5173
```

> **为什么不能直接双击 `index.html`？**
> 它是 Vite 的源码入口，里面只有 `<script type="module" src="/src/main.js">`。用 `file://` 打开时浏览器会做三件事：
> 1. 以跨源为由拒绝加载 ES 模块（`CORS policy`）；
> 2. 无法解析 `/src`、`/models` 这类站点根路径；
> 3. `fetch` 模型权重同样被拦，摄像头也不在安全上下文里。
> 所以必须经由本地服务访问，`启动Moodwave.bat` 和 `npm run dev` 都是在做这件事。

## 功能

| 模块 | 说明 |
| --- | --- |
| 人脸获取 | 输入图片 / 打开视频 / 实时摄像头 / 拍照定格，支持拖拽文件进视口 |
| 情绪识别 | 7 类情绪（高兴 / 悲伤 / 愤怒 / 恐惧 / 厌恶 / 惊讶 / 中性），输出完整概率分布与置信度环 |
| 多人脸 | 支持画面中多张脸，取面积最大者为主判定，其余标注次要情绪 |
| 歌曲推荐 | 情绪共振策略（顺着情绪走），在线曲库 30 秒高清试听 |
| 播放器 | 播放 / 暂停 / 上下曲 / 拖拽进度 / 音量，自动连播 |
| 收藏与歌单 | localStorage 持久化，刷新不丢 |
| 情绪时间线 | 每次确认的识别结果画成折线，附今日分布统计（上限 200 条） |

## 隐私

人脸检测与情绪推理**全部在浏览器内完成**（WebGL / WASM 后端自动选择），模型权重共约 870KB，随工程放在 `public/models/`。图片、视频帧、摄像头画面不会上传到任何服务器；唯一的网络请求是拉取在线曲库的搜索结果与试听地址。

## 架构

```
src/
├── data/
│   ├── emotions.js          # 7 类情绪元数据 + 共振检索词
│   └── localTracks.js       # 内置兜底曲库（元数据）
├── services/
│   ├── faceEngine.js        # 模型加载 / 人脸检测 / 结果聚合
│   └── providers/
│       ├── index.js         # Provider 注册表 + 降级链推荐引擎
│       ├── itunesProvider.js# Apple Music 在线曲库（30s 试听）
│       ├── localProvider.js # 内置曲库（离线兜底）
│       └── extraProviders.js# 网易云 / Audius 占位适配器（附接入说明）
├── composables/
│   ├── useStore.js          # 全局状态（识别 / 推荐 / 收藏 / 历史）
│   └── usePlayer.js         # 播放器单例
├── components/              # 12 个组件（采集台 / 情绪报告 / 推荐区 / 播放条…）
└── styles/                  # 设计 token（参照 Spotify DESIGN.md）+ 基础样式
```

**为什么有兜底曲库**：在线接口没有稳定性承诺（超时、跨域、改版都可能发生）。推荐引擎沿 `itunes → local` 降级链取数，在线失败时自动切到内置曲库——它带真实可播放的音频（`public/audio/*.wav`，由 `scripts/make_audio.py` 合成的 12 秒情绪氛围循环），所以断网也能完整演示，页面上会用「离线」角标明确标注数据来源。

## 换一个在线曲库

在线源是可切换的适配器，业务代码不感知具体平台：

- **网易云**：需自建 [NeteaseCloudMusicApi](https://gitlab.com/Binaryify/neteasecloudmusicapi) 服务并在 `vite.config.js` 加代理，然后打开 `extraProviders.js` 里的 `available`、补完 `search()`（文件头部有完整步骤）。
- **Audius**：开放 API、无密钥、可播全曲，但中文曲库几乎为零，未设为首选。

## 设计规范

UI 严格参照 [`awesome-design-md/design-md/spotify/DESIGN.md`](../awesome-design-md/design-md/spotify/DESIGN.md)：近黑沉浸背景（#121212–#1f1f1f）、绿色 #1ed760 仅作功能色、胶囊与圆形几何、大写宽字距按钮、重阴影抬升；情绪色作为「数据色」只出现在情绪标签与封面渐变上。

## 已知限制

- 在线曲目为 Apple Music **30 秒试听**（版权所限），完整播放需接入正版授权曲库。
- iTunes Search API 在 `country=CN` 下恒返回空，默认走美区商店；中文歌手可命中，情绪检索词以英文为主。
- face-api 对侧脸 / 遮挡 / 极小脸的检出率有限，画面里检测不到人脸时会有明确提示。
- 无头 / 嵌入 iframe 环境中摄像头权限可能被浏览器禁用。

## 测试

`.smoke/` 目录（工程外）含端到端冒烟脚本：模型加载 → 图片 / 视频识别 → 推荐 → 播放 → 收藏 → 拍照定格 → 时间线，已全部通过；音频素材可随时用 `python scripts/make_audio.py` 重新生成（纯标准库）。
