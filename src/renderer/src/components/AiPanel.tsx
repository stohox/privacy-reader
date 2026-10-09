import { ReactNode, useEffect, useRef, useState } from 'react'
import type { AiTaskType } from '../../../shared/types'
import type { SelectionInfo } from '../views/ReaderView'

interface Props {
  bookId: number
  contentVersion: number
  language: string
  selection: SelectionInfo
  onClose: () => void
  onSaveNote: (note: string) => void
}

const TASK_LABEL: Record<AiTaskType, string> = { translate: '翻译', explain: '解释', qa: '提问' }

export default function AiPanel({ bookId, contentVersion, language, selection, onClose, onSaveNote }: Props): ReactNode {
  const [task, setTask] = useState<AiTaskType>(selection.task ?? 'translate')
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [usage, setUsage] = useState('')
  const reqRef = useRef<string>('')
  const [stale, setStale] = useState(false)

  const request = async (): Promise<void> => {
    setLoading(true)
    setError('')
    setResult('')
    setStale(false)
    const requestId = crypto.randomUUID()
    reqRef.current = requestId
    const context = [selection.prevContext, selection.nextContext].filter(Boolean).join('\n')
    const r = await window.reader.aiRequest({
      requestId,
      bookId,
      contentVersion,
      taskType: task,
      text: selection.text,
      context,
      language,
      targetLanguage: 'zh',
      chapterAnchor: `${selection.chapterIdx}:${selection.paraIdx}:${selection.startOffset}`,
      question: task === 'qa' ? question : undefined
    })
    if (reqRef.current !== requestId) return // 已被新请求取代
    setLoading(false)
    if (r.ok) {
      setResult(r.result ?? '')
      setUsage(`${r.fromCache ? '来自本机缓存 · ' : ''}${r.usage?.estCostNote ?? ''}`)
      setNote(`【AI 辅助·${TASK_LABEL[task]}】\n${r.result ?? ''}`)
    } else if (r.canceled) {
      setError('已取消。原文不受影响。')
    } else {
      setError(r.error ?? '请求失败')
    }
  }

  useEffect(() => {
    request()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, task])

  return (
    <aside className="side-panel ai-panel">
      <div className="ai-head">
        <h4>AI 辅助理解</h4>
        <button className="mini" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="ai-quote">「{selection.text.slice(0, 80)}{selection.text.length > 80 ? '…' : ''}」</div>
      <div className="row tabs">
        {(['translate', 'explain', 'qa'] as AiTaskType[]).map((t) => (
          <button key={t} className={task === t ? 'on' : ''} onClick={() => setTask(t)}>
            {TASK_LABEL[t]}
          </button>
        ))}
      </div>
      {task === 'qa' && (
        <div className="row">
          <input value={question} placeholder="就这段问点什么…" onChange={(e) => setQuestion(e.target.value)} />
          <button onClick={request} disabled={loading || !question.trim()}>
            发送
          </button>
        </div>
      )}
      {stale && <div className="badge warn">结果已过期：所选文本变化后请重新请求</div>}
      {loading && (
        <div className="ai-loading">
          <span className="dim">等待云端结果（首屏目标 8 秒内）…</span>
          <button
            onClick={() => {
              window.reader.aiCancel(reqRef.current)
              setLoading(false)
              setError('已取消。')
            }}
          >
            取消
          </button>
        </div>
      )}
      {error && <div className="task-error">{error}</div>}
      {result && (
        <div className="ai-result">
          <div className="ai-label">AI 辅助内容 · 原文未改动</div>
          <div className="ai-body">{result.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
          {usage && <div className="dim small">{usage}</div>}
          <div className="row">
            <button
              className="btn-link"
              onClick={() => navigator.clipboard.writeText(result).catch(() => undefined)}
            >
              复制
            </button>
            <button className="btn-link" onClick={request}>
              重新生成
            </button>
          </div>
          <label className="ai-note">
            附为笔记保存
            <textarea value={note} rows={3} onChange={(e) => setNote(e.target.value)} />
            <button
              onClick={() => {
                onSaveNote(note)
                onClose()
              }}
            >
              保存为批注
            </button>
          </label>
        </div>
      )}
      <p className="dim small">
        云端处理范围：所选文本 + 相邻段落，合计 ≤3000 字符。译文与解释均标注为 AI 辅助内容，不确定处已在文中说明。
      </p>
    </aside>
  )
}
