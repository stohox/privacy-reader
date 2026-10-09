import crypto from 'crypto'
import { AiRequestPayload, AiResultPayload, AiTaskType } from '../shared/types'
import { aiCache } from './db'
import { loadSettings, saveSettings, getApiKey } from './settings'

const MAX_CONTEXT_CHARS = 3000
const inflight = new Map<string, AbortController>()

function buildSystemPrompt(taskType: AiTaskType, language: string): string {
  if (taskType === 'translate') {
    return language === 'en'
      ? '你是一位严谨的典籍与文本翻译者。请把用户提供的英文选段翻译成自然中文。要求：先给译文；如为长句，附一句主干结构说明；区分字面含义与语境含义。不要改写或编造原文内容。'
      : '你是一位严谨的古文注译者。请对用户提供的古文选段：1) 给出保留原文的白话翻译；2) 逐词或关键词注释（含通假、多义词）；3) 简要说明语法与省略成分；4) 指出典故、年代等不确定之处并明确标注为推测。不得编造出处；没有来源依据的解释要标注为推断。'
  }
  if (taskType === 'explain') {
    return '你是阅读辅助讲解者。请针对用户选中的文本解释：词义、句法结构、上下文作用；对存在歧义之处列出可能解释及依据，明确标注哪些是推断。原文保持不动。'
  }
  return '你是阅读问答助手。请基于所选文本及上下文回答用户问题；不确定之处明确说明；不得编造文献出处。'
}

function estimateTokens(s: string): number {
  // 粗略估算：中文按字、英文按 4 字符/token
  const cjk = (s.match(/[\u4e00-\u9fff]/g) || []).length
  return Math.ceil(cjk + (s.length - cjk) / 4)
}

export async function runAi(req: AiRequestPayload): Promise<AiResultPayload> {
  const settings = loadSettings()
  const key = getApiKey()
  if (!key) {
    return { requestId: req.requestId, ok: false, error: '尚未在设置页配置 AI 服务密钥。原文阅读不受影响。' }
  }
  // 请求范围控制：所选文本 + 最多相邻两段，合计 ≤3000 字符
  const context = (req.context || '').slice(0, MAX_CONTEXT_CHARS)
  const text = (req.text || '').slice(0, MAX_CONTEXT_CHARS - Math.min(context.length, MAX_CONTEXT_CHARS))

  const cacheKey = crypto
    .createHash('sha256')
    .update(
      JSON.stringify([req.bookId, req.contentVersion, req.chapterAnchor ?? '', req.taskType, req.language, req.targetLanguage, settings.aiModel, text, context])
    )
    .digest('hex')
  const cached = aiCache.get(cacheKey)
  if (cached) {
    return {
      requestId: req.requestId,
      ok: true,
      result: cached.result,
      fromCache: true,
      usage: { promptTokens: 0, completionTokens: 0, estCostNote: '来自本机缓存，未消耗额度' }
    }
  }

  const controller = new AbortController()
  inflight.set(req.requestId, controller)
  const baseUrl = (settings.aiBaseUrl || '').replace(/\/+$/, '')
  const messages = [
    { role: 'system', content: buildSystemPrompt(req.taskType, req.language) },
    {
      role: 'user',
      content: `【语言】${req.language}\n【所选文本】\n${text}\n${context ? `\n【相邻上下文，仅供理解参考】\n${context}` : ''}${
        req.taskType === 'qa' && req.question ? `\n【问题】${req.question}` : ''
      }`
    }
  ]
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: settings.aiModel, messages, temperature: 0.3, stream: false }),
      signal: controller.signal
    })
    if (!res.ok) {
      const reason =
        res.status === 401
          ? '密钥无效或过期'
          : res.status === 429
            ? '服务限流或额度不足，稍后重试'
            : res.status >= 500
              ? '上游服务异常'
              : `服务返回 ${res.status}`
      void res
      return { requestId: req.requestId, ok: false, error: `${reason}。已保留原文与既有缓存结果，可取消或重试。` }
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const content = data.choices?.[0]?.message?.content?.trim() ?? ''
    const tokens = (data.usage?.prompt_tokens ?? estimateTokens(JSON.stringify(messages))) +
      (data.usage?.completion_tokens ?? estimateTokens(content))
    aiCache.put(cacheKey, req.taskType, content, settings.aiModel, tokens)
    const usage = loadSettings().aiUsage
    saveSettings({ aiUsage: { calls: usage.calls + 1, estTokens: usage.estTokens + tokens } })
    return {
      requestId: req.requestId,
      ok: true,
      result: content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        estCostNote: `本次约 ${tokens} token · 累计 ${usage.calls + 1} 次调用`
      }
    }
  } catch (e) {
    const err = e as Error
    if (err.name === 'AbortError') return { requestId: req.requestId, ok: false, canceled: true }
    return { requestId: req.requestId, ok: false, error: `网络或服务不可用：${err.message}。原文与已缓存解释仍可查看。` }
  } finally {
    inflight.delete(req.requestId)
  }
}

export function cancelAi(requestId: string): void {
  inflight.get(requestId)?.abort()
}

export function cancelAllAi(): void {
  for (const c of inflight.values()) c.abort()
  inflight.clear()
}
