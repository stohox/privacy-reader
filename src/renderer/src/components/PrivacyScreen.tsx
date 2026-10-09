import { ReactNode, useEffect, useRef, useState } from 'react'
import { useStore } from '../store'

/** 隐私中性界面：先遮盖原文/书名/笔记/译文，展示空白便签工作区。
 *  locked 状态额外要求 PIN 验证后才能恢复阅读。 */
export default function PrivacyScreen({ state }: { state: 'neutral' | 'locked' }): ReactNode {
  const s = useStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [note, setNote] = useState(s.settings?.neutralText || '')
  const pinRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state === 'locked') pinRef.current?.focus()
  }, [state])

  useEffect(() => {
    const off = window.reader.on('privacy:focus-input', () => pinRef.current?.focus())
    return off
  }, [])

  const reveal = async (): Promise<void> => {
    const r = await window.reader.reveal(pin)
    if (!r.ok) {
      setError(r.error || '解锁失败')
      setPin('')
      pinRef.current?.focus()
    } else {
      setError('')
    }
  }

  const resetPin = async (): Promise<void> => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    await window.reader.resetPin()
    setConfirmReset(false)
    setError('已重置本机隐私锁。受保护缓存需重新导入。')
  }

  return (
    <div className="neutral" data-theme="light">
      <div className="neutral-window">
        <div className="neutral-bar">
          <span>{s.settings?.neutralTitle || '工作笔记'}</span>
        </div>
        <textarea
          className="neutral-note"
          value={note}
          placeholder={state === 'locked' ? '……' : '随手记点什么…'}
          onChange={(e) => setNote(e.target.value)}
        />
        {(state === 'locked' || s.settings?.hasPin) && (
          <div className="unlock">
            {error && <div className="unlock-err">{error}</div>}
            <div className="unlock-row">
              <input
                ref={pinRef}
                type="password"
                inputMode="numeric"
                value={pin}
                placeholder="输入 PIN 恢复阅读"
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && reveal()}
                aria-label="PIN"
              />
              <button onClick={reveal} className="btn-primary">
                恢复
              </button>
              <button className="btn-link" onClick={resetPin}>
                {confirmReset ? '确认重置？本机受保护正文将被清除' : '忘记 PIN'}
              </button>
            </div>
          </div>
        )}
        {state === 'neutral' && !s.settings?.hasPin && (
          <div className="neutral-actions">
            <button className="btn-link" onClick={() => window.reader.reveal('')}>
              返回阅读
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
