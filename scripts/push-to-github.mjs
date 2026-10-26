#!/usr/bin/env node
/**
 * Moodwave → GitHub 一键发布脚本
 *
 * 用法：
 *   双击根目录「发布到GitHub.bat」，或执行 `npm run push`
 *
 * 它只做本地动作 + 一次 push，不会碰你的全局 git 配置以外的任何东西：
 *   1. 收集你的 GitHub 用户名与仓库名
 *   2. 自动打开 GitHub 建仓页面（若尚未建仓）
 *   3. 补齐提交身份（仅当本机从未配置过 user.name / user.email）
 *   4. git add / commit / 关联 origin / push -u
 * 首次 push 会由 Git Credential Manager 弹出浏览器登录，密码不经过本脚本。
 */
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout, platform, exit } from 'node:process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Windows 控制台默认 936 代码页会把中文输出成乱码，切到 UTF-8
if (platform === 'win32') {
  spawnSync('cmd', ['/c', 'chcp 65001'], { stdio: 'ignore' })
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}
const ok = (m) => console.log(`${C.green}✓${C.reset} ${m}`)
const bad = (m) => console.log(`${C.red}✗${C.reset} ${m}`)
const info = (m) => console.log(`${C.cyan}·${C.reset} ${m}`)
const warn = (m) => console.log(`${C.yellow}!${C.reset} ${m}`)
const line = () => console.log(`${C.dim}${'─'.repeat(58)}${C.reset}`)

function git(args, opts = {}) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', ...opts })
}
function gitOut(args) {
  const r = git(args)
  if (r.error || r.status !== 0) return null
  return (r.stdout || '').trim()
}
function fail(msg, hint) {
  bad(msg)
  if (hint) console.log(`\n${hint}\n`)
  exit(1)
}

/* ------------------------------------------------------------------ 预检 */
console.log()
console.log(`${C.bold}Moodwave → GitHub 发布${C.reset}`)
line()

const gv = spawnSync('git', ['--version'], { encoding: 'utf8' })
if (gv.error || gv.status !== 0) {
  fail(
    '没有检测到 git',
    '请先安装 Git for Windows：https://git-scm.com/download/win\n安装完成后重新打开本窗口再试。',
  )
}
ok(`git ${(gv.stdout || '').replace('git version', '').trim()}`)

const rl = createInterface({ input: stdin, output: stdout, terminal: stdin.isTTY })
// 用异步迭代器逐行读取：rl.question 在「多行一次性到达」（管道 / 粘贴）时会丢行
const lines = rl[Symbol.asyncIterator]()
async function ask(q, dflt) {
  stdout.write(`${q}${dflt ? `${C.dim}(${dflt})${C.reset}` : ''}: `)
  const { value, done } = await lines.next()
  if (done) {
    console.log()
    return null // 输入流结束（管道 / Ctrl+D）
  }
  const a = String(value ?? '').trim()
  return a || dflt || ''
}

let username = ''
while (!username) {
  const v = await ask('你的 GitHub 用户名（例如 octocat）')
  if (v === null) fail('没有读到用户名', '请重新运行「发布到GitHub.bat」并输入你的 GitHub 用户名。')
  if (/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(v)) username = v
  else warn('用户名只能包含字母、数字和连字符，请重新输入')
}

const repo = (await ask('仓库名', 'moodwave')) || 'moodwave'
const remoteUrl = `https://github.com/${username}/${repo}.git`
const createUrl = `https://github.com/new?name=${encodeURIComponent(repo)}&visibility=public`

/* ------------------------------------------------- 确认远程仓库已存在 */
console.log()
info('需要先在 GitHub 上有一个「空仓库」（不要勾选 Add README / .gitignore / License）')
console.log(`  ${C.cyan}${createUrl}${C.reset}`)
console.log(`${C.dim}  已自动打开浏览器，若没有请手动复制上面的地址${C.reset}`)
if (platform === 'win32') {
  spawnSync('cmd', ['/c', 'start', '', createUrl], { stdio: 'ignore' })
  spawnSync('cmd', ['/c', 'start', '', `https://github.com/${username}?tab=repositories`], {
    stdio: 'ignore',
  })
}
await ask('\n建好后按回车继续（直接回车 = 已建好）')

/* --------------------------------------------------------- 身份与分支 */
const localName = gitOut(['config', '--local', 'user.name'])
const localEmail = gitOut(['config', '--local', 'user.email'])
if (!localName) {
  git(['config', '--local', 'user.name', username])
  info(`提交作者设为 ${username}${C.dim}（仅本仓库）${C.reset}`)
}
if (!localEmail) {
  git(['config', '--local', 'user.email', `${username}@users.noreply.github.com`])
  info('提交邮箱使用 GitHub 隐私邮箱 noreply')
}
// 中文文件名不要转义成 \346\265\213...
git(['config', '--local', 'core.quotepath', 'false'])

const head = gitOut(['symbolic-ref', '--short', 'HEAD'])
if (head && head !== 'main') {
  git(['branch', '-M', 'main'])
  info(`当前分支 ${head} 已重命名为 main`)
}

/* ------------------------------------------------------------ 暂存提交 */
git(['add', '-A'])
const staged = gitOut(['diff', '--cached', '--name-only'])
const count = staged ? staged.split('\n').filter(Boolean).length : 0

if (!count) {
  const last = gitOut(['log', '-1', '--oneline'])
  if (last) {
    ok(`没有新改动，沿用已有提交：${last}`)
  } else {
    fail('没有任何文件可提交', '请确认当前目录是项目根目录。')
  }
} else {
  const r = git(['commit', '-m', 'feat: Moodwave — 基于人脸情绪识别的歌曲推荐系统'])
  if (r.status !== 0) {
    console.log(r.stdout || '')
    console.log(r.stderr || '')
    fail('提交失败', '常见原因：用户名/邮箱不合法，或存在 .git/hooks 拦截。')
  }
  ok(`已提交 ${count} 个文件`)
}

/* -------------------------------------------------------------- 推送 */
const existing = gitOut(['remote', 'get-url', 'origin'])
if (existing && existing !== remoteUrl) {
  warn(`origin 原指向 ${existing}，已改为 ${remoteUrl}`)
  git(['remote', 'set-url', 'origin', remoteUrl])
} else if (!existing) {
  const r = git(['remote', 'add', 'origin', remoteUrl])
  if (r.status !== 0) fail('添加远程仓库失败', r.stderr)
  ok(`已关联 origin → ${remoteUrl}`)
} else {
  ok(`origin 已指向 ${remoteUrl}`)
}

console.log()
info('开始推送。首次会弹出浏览器窗口让你登录 GitHub（Git Credential Manager）')
console.log(`${C.dim}  登录后凭据由系统凭据管理器保存，下次不用再输${C.reset}`)
line()

const push = git(['push', '-u', 'origin', 'main'], { stdio: 'inherit' })

if (push.status === 0) {
  console.log()
  ok('推送完成')
  console.log()
  console.log(`${C.bold}仓库地址${C.reset}  https://github.com/${username}/${repo}`)
  console.log(`${C.bold}克隆命令${C.reset}  git clone ${remoteUrl}`)
  console.log()
  line()
  rl.close()
  exit(0)
}

/* ------------------------------------------------------------ 失败指引 */
console.log()
bad('推送失败')
const hint = []
if (push.status === 128 || push.status === 1) {
  hint.push('可能是这几种情况，按顺序排查：')
  hint.push('')
  hint.push('1) 仓库还没在 GitHub 上创建 → 打开上面那个 /new 链接建一个空仓库')
  hint.push(`   地址应为：https://github.com/${username}/${repo}`)
  hint.push('')
  hint.push('2) 登录被取消或凭据失效 → 执行下面这条清掉旧凭据后重新运行本脚本')
  hint.push('   cmdkey /delete:git:https://github.com')
  hint.push('')
  hint.push('3) 网络连不上 GitHub（国内常见）→ 如果你有代理，给 git 单独设置：')
  hint.push('   git config --global http.proxy  http://127.0.0.1:7890')
  hint.push('   git config --global https.proxy http://127.0.0.1:7890')
  hint.push('   （端口换成你自己代理的端口；取消用 git config --global --unset http.proxy）')
} else {
  hint.push('把上面最后几行报错发给我，我帮你定位。')
}
console.log(hint.join('\n'))
console.log()
line()
rl.close()
exit(1)
