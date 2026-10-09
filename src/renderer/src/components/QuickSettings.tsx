import { ReactNode } from 'react'
import { useStore } from '../store'

/**
 * 一站式调节面板：用单一入口（Ctrl+, 或 ⚙ 按钮）打开，
 * 集中管理字号、栏宽、行距、专注透明度、文字明暗、配色、置顶等，
 * 避免记忆大量组合键。沉浸（专注）态同样可用。
 */
export default function QuickSettings(): ReactNode {
  const s = useStore()
  const st = s.settings
  if (!s.quickOpen || !st) return null

  const close = (): void => s.setQuickOpen(false)

  const num = (v: string, fallback: number): number => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }

  return (
    <>
      <div className="quick-backdrop" onClick={close} />
      <div className="quick-panel" role="dialog" aria-label="快速调节">
        <div className="quick-head">
          <span className="quick-title">快速调节</span>
          <button className="quick-close" onClick={close} title="关闭（Esc）">
            ✕
          </button>
        </div>

        <div className="quick-section">
          <div className="quick-section-title">阅读版面</div>

          <label className="quick-row">
            <span className="quick-label">字号 {st.readerFontSize}px</span>
            <input
              type="range"
              min={12}
              max={32}
              step={1}
              value={st.readerFontSize}
              onChange={(e) => void s.updateSettings({ readerFontSize: num(e.target.value, 18) })}
            />
          </label>

          <label className="quick-row">
            <span className="quick-label">正文栏宽 {st.readerWidth}px</span>
            <input
              type="range"
              min={480}
              max={1100}
              step={20}
              value={st.readerWidth}
              onChange={(e) => void s.updateSettings({ readerWidth: num(e.target.value, 820) })}
            />
          </label>

          <label className="quick-row">
            <span className="quick-label">正文栏高 {st.readerHeight ?? 100}%</span>
            <input
              type="range"
              min={30}
              max={100}
              step={5}
              value={st.readerHeight ?? 100}
              title="专注态下正文浮层的高度（占屏百分比），缩短后可当作一条可拖动的窄带"
              onChange={(e) => void s.updateSettings({ readerHeight: num(e.target.value, 100) })}
            />
          </label>

          <label className="quick-row">
            <span className="quick-label">行距 {st.readerLineHeight.toFixed(1)}</span>
            <input
              type="range"
              min={1.3}
              max={2.6}
              step={0.1}
              value={st.readerLineHeight}
              onChange={(e) => void s.updateSettings({ readerLineHeight: num(e.target.value, 1.8) })}
            />
          </label>
        </div>

        <div className="quick-section">
          <div className="quick-section-title">专注悬浮</div>

          <label className="quick-row">
            <span className="quick-label">透明度 {Math.round(st.focusOpacity * 100)}%</span>
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.05}
              value={st.focusOpacity}
              onChange={(e) => void s.updateSettings({ focusOpacity: num(e.target.value, 1) })}
            />
          </label>

          <label className="quick-row">
            <span className="quick-label">文字明暗</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={st.focusTextBrightness ?? 0.96}
              title="文字明暗（黑↔白），描边自动取对比色"
              onChange={(e) => void s.updateSettings({ focusTextBrightness: num(e.target.value, 0.96) })}
            />
          </label>

          <div className="quick-btns">
            <button className={st.focusTextColor === 'light' ? 'on' : ''} onClick={() => void s.updateSettings({ focusTextColor: 'light', focusTextBrightness: 0.96 })}>
              白字
            </button>
            <button className={st.focusTextColor === 'dark' ? 'on' : ''} onClick={() => void s.updateSettings({ focusTextColor: 'dark', focusTextBrightness: 0.08 })}>
              深字
            </button>
            <button className={st.focusAlwaysOnTop ? 'on' : ''} onClick={() => void s.toggleAlwaysOnTop()} title="窗口浮在其他程序之上">
              置顶
            </button>
          </div>
        </div>

        <div className="quick-foot">
          <button className={st.stealthMode ? 'on' : ''} onClick={() => void s.toggleStealth()} title="切换专注（去读书化）视图">
            {st.stealthMode ? '退出专注' : '进入专注'}
          </button>
          <button
            onClick={() => {
              s.setView('settings')
              close()
            }}
          >
            全部设置
          </button>
          <span className="quick-tip">Ctrl+, 开/关 · Esc 关闭 · 空格/方向键翻页 · Ctrl+滚轮改字号 · 专注态双击 Esc 隐藏到托盘</span>
        </div>
      </div>
    </>
  )
}
