// 端到端验证导入状态流转：注册监听器 → 创建任务 → 捕获状态序列直到 await_preview
// 结果同步写入 out/import-result.txt（headless electron 的 stdout 不可靠）
import { app } from 'electron'
import path from 'path'
import os from 'os'
import fs from 'fs'
import * as importer from '../src/main/importer'
import { initDb } from '../src/main/db'

app.disableHardwareAcceleration()
const tmp = path.join(os.tmpdir(), 'pr-import-test-' + Date.now())
fs.mkdirSync(tmp, { recursive: true })
app.setPath('userData', tmp)
const out = path.join(process.cwd(), 'out', 'import-result.txt')
const write = (s: string): void => {
  fs.writeFileSync(out, s, 'utf8')
}

app.whenReady().then(async () => {
  try {
    await initDb()
    const states: string[] = []
    importer.onTaskUpdate((t) => {
      states.push(`${t.state}(${t.progress})${t.error ? ' ERR:' + t.error : ''}`)
      write('LIVE: ' + states.join(' -> '))
    })
    const file = path.join(process.cwd(), 'samples', '西厢记_王实甫.txt')
    write('START file=' + file + ' exists=' + fs.existsSync(file))
    importer.createImportTask(file)
    setTimeout(() => {
      const ok = states.some((x) => x.startsWith('await_preview'))
      write('FINAL: ' + states.join(' -> ') + '\n' + (ok ? 'IMPORT_FLOW_OK' : 'IMPORT_FLOW_FAIL'))
      app.quit()
    }, 2500)
  } catch (e) {
    write('IMPORT_TEST_ERROR ' + (e as Error).stack)
    app.quit()
  }
})
