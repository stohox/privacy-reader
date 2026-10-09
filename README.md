# Privacy Reader（多端隐私阅读应用 · Windows 验证版）

按《多端隐私阅读应用产品需求文档 v1.0》实现的 **Windows 验证版闭环**：
导入 → 归类 → 阅读 → 隐藏与恢复 → 批注/进度持久化 → 选段 AI 辅助。

技术路线：**React 18 + TypeScript + Electron**（本机无 Rust，未选 Tauri；
桌面隐藏需求由 Electron 窗口/快捷键/托盘承担）。数据层为 **SQLite（sql.js/WASM）**，
正文以「章节—段落—文本」统一模型存储，为后续 Capacitor 移动端与同步预留同一核心。

## 运行

```bash
npm install        # 已配置 npmmirror 镜像
npm run dev        # 开发模式（热更新）
npm run build      # 生产构建到 out/
npm start          # 预览构建产物

# 打包成可双击运行的 Windows 程序（产物在 dist/）
npm run dist:win   # 便携版 exe + 安装版 Setup.exe
npm run icon       # 重新生成 build/ 下的水墨风应用图标
```

测试素材在 `samples/`：公版全文《水浒传》（Project Gutenberg 版，71 回）、《西厢记》（古文岛版，五本二十五折，含"第X本·第X折"分章）、古文 TXT、英语 TXT、最小 EPUB。

## PRD 需求覆盖（P0 · 验证版范围）

| 需求 | 实现 |
|---|---|
| IN01/02 导入与任务状态 | TXT/EPUB/MD 本地导入；任务状态 排队→解析→待预览→完成/部分/失败/取消；100MB/5000 章上限 |
| 4.3 预览与去重 | 入库前可改标题/作者/语言/书库/标签；展示章节列表与完整性；文件名+大小+首块哈希指纹去重，重复时可选「打开已有/保留为新版本」 |
| LB01/02 书库与标签 | 多书库多标签（正文单份）、全部内容/未分类视图、批量移库/删除、回收站 30 天、删除书库默认仅解除归属 |
| LB03/04 分类 | 优先级 人工锁定→用户规则→关键词建议；建议展示理由与置信度、需人工确认（未校准不自动移动）；锁定维度不被覆盖，可重新分析 |
| RD01/02 阅读器 | 目录、章节切换、本书搜索、字号/行距/字体/三主题、书签、划线批注（关联章节+段落+偏移）；进度每 5 秒本地保存 |
| 6.1 位置锚点 | 章节+段落+字符偏移+上下文片段定位，跨字号可用；正文更新后按锚点重匹配 |
| PR01-03 隐私 | 全局快捷键（默认 Alt+Shift+H，可改，冲突退回应用内快捷键与「隐藏」按钮）；先遮盖正文/书名/笔记/译文/AI 面板再进入中性便签界面；失焦隐藏（默认关）、闲置隐藏（默认 5 分钟）、隐藏即锁 PIN（PIN 为 scrypt 哈希）；重启保持遮盖；隐藏时取消未完成的 AI 请求，返回结果不展示；托盘通用文案；忘记 PIN 仅重置本机锁并清除受保护正文 |
| DP01 加密 | 隐私书库正文 AES-256-GCM 静态加密，主密钥经 Windows DPAPI（safeStorage）保护；API Key 同样加密存放 |
| AI01-04 语言辅助 | 设置页配置 OpenAI 兼容接口（Base URL/Key/模型）；选段翻译/解释/提问；默认发送所选文本+相邻两段 ≤3000 字符；结果标注「AI 辅助内容」，可复制/存为笔记/重新生成/取消；按 内容版本+锚点+文本+模型 做缓存键并展示用量 |
| 10.2 可访问性 | 键盘可操作隐藏/恢复入口、焦点样式、深浅主题、字号缩放 |

## 已知限制（验证版如实声明）

- 同步、网页 URL 导入、书源适配器：仅预留数据模型与接口（变更记录表结构在 `src/main/db.ts`），未接入服务端。
- 全局快捷键与任务切换预览保护需按系统逐项实测；`SetWindowDisplayAffinity` 屏幕捕获保护未启用（P1 验证项）。
- 中文全文检索为 LIKE 扫描（索引表已分片），100MB 级库需换 FTS5 分词方案。
- 移动端（Capacitor / React Native）与 macOS 不在本版范围，见下方「手机端」。
- Windows 打包已配置（electron-builder，见「打包与分发」）；产物未做代码签名，首次运行 Windows SmartScreen 会提示「未知发布者」，点「仍要运行」即可。

## 打包与分发

用 electron-builder（配置见 `electron-builder.yml`）把 `out/` 产物封成可双击运行的 Windows 程序：

```bash
npm run dist:win
```

产物在 `dist/`：

- `隐私阅读器-便携版-0.1.0.exe` —— 免安装单文件，双击即用（内部自解压到临时目录再运行），最贴合"双击启动"。
- `隐私阅读器-安装版-0.1.0.exe` —— NSIS 安装向导，可选安装目录、创建桌面/开始菜单快捷方式，适合正式分发。

要点：

- 图标：`build/icon.png`（1024²，水墨线装书风），electron-builder 自动转 `.ico` 内嵌进 exe 与安装界面；改图后 `npm run icon` 重新生成。
- 未做代码签名（无证书），首次运行 Windows SmartScreen 会提示"未知发布者"，点"仍要运行/更多信息→仍要运行"即可；`CSC_IDENTITY_AUTO_DISCOVERY=false` 已让 CI 跳过签名。
- 数据落在系统用户数据目录（`%APPDATA%\privacy-reader`：`reader.db` 与 `settings.json`），便携版与安装版共用同一份数据；卸载安装版不会删这些数据。
- 应用是单实例（`requestSingleInstanceLock`）：若已有一个实例在跑，第二个会直接退出——这也是"双击没反应"的一个常见原因（多半是后台还留着一个实例）。

## 用 GitHub Actions 自动打包与下载

仓库已内置 `.github/workflows/build.yml`：

- 推送 `v*` 标签（如 `git tag v0.1.0 && git push origin v0.1.0`）→ 在 `windows-latest` 上 `npm ci` + `npm run dist:win` → 自动创建/更新 **GitHub Release** 并把两个 exe 作为下载资产上传。别人在你的仓库 **Releases** 页点一下就能下载 exe，无需本地装 Node/Electron。
- 普通 push / PR / 手动触发（Actions 页 "Run workflow"）→ 只构建并把产物挂在该次运行的 **Artifacts**（约 90 天过期，供自测）。

启用步骤：把项目推到 GitHub → 仓库 Settings → Actions → General → Workflow permissions 选 "Read and write permissions"（让 Release 步骤有权限发布）→ 打标签推送即可。

## 手机端

当前是 **Electron 桌面程序，不能直接跑在手机上**。PRD 里的"多端"在本验证版只落地了 Windows。上手机需要另起一套，主要路线与代价：

- **Capacitor 包壳**：复用 `src/renderer` 的 React 界面，但数据层要重写——手机没有 Node、没有 sql.js 的 `fs.readFileSync` 路径、没有 Windows DPAPI/safeStorage。需换成 Capacitor Filesystem + 一个 WASM/原生 SQLite，加密改用 Keystore/Keychain。工作量大，且导入大文件、托盘、全局快捷键在手机上无对应概念。
- **React Native / Flutter 重写**：性能与体验更好，但等于把阅读器、导入、隐私锁、AI 辅助各做一遍；`src/shared` 的数据模型可作跨端契约复用。
- 无论哪条路，"隐藏/中性界面/托盘/全局快捷键"这套桌面专属的隐私交互，在手机端要重新设计（如后台快照保护、生物识别解锁）。

结论：手机端是一个独立阶段，建议先把 Windows 版用顺、把 `src/shared` 的数据契约与同步接口稳定下来，再评估 Capacitor（复用 UI 多）还是 RN/Flutter（体验好、成本高）。

## 结构

```
src/main/       Electron 主进程：db(sql.js) / importer(TXT+EPUB) / ai(OpenAI 兼容)
                / privacy(隐藏状态机+快捷键+托盘) / crypto(PIN+AES-GCM+DPAPI) / settings
src/preload/    contextBridge 白名单 API
src/renderer/   React：继续阅读 / 书库 / 导入 / 阅读器(目录·批注·AI面板) / 设置 / 隐私中性界面
src/shared/     IPC 与数据模型类型（未来移动端复用）
scripts/parse-check.ts  解析引擎冒烟测试：npx esbuild 打包后 node 运行
```
