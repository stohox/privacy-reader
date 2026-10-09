// 向隔离 profile（通过 --user-data-dir 指定）播种一本书：解析→确认入库→持久化
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import * as importer from '../src/main/importer'
import { initDb, persistNow } from '../src/main/db'

app.disableHardwareAcceleration()
const out = path.join(process.cwd(), 'out', 'seed-result.txt')
const write = (s: string): void => fs.writeFileSync(out, s, 'utf8')

app.whenReady().then(async () => {
  try {
    await initDb()
    const file = path.join(process.cwd(), 'samples', '水浒传_施耐庵.txt')
    const task = importer.createImportTask(file)
    let state = ''
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 250))
      const t = importer.getTask(task.id)
      state = t?.state ?? ''
      if (state === 'await_preview' || state === 'done' || state === 'partial' || t?.error) break
    }
    write('parsed state=' + state)
    const r = importer.confirmImport({
      taskId: task.id,
      title: '水浒传',
      author: '施耐庵',
      language: 'zh',
      libraryIds: [],
      tagNames: [],
      privateLibraryIds: [],
      duplicateAction: 'new',
      keyProvider: () => Buffer.alloc(32)
    })
    persistNow()
    write('SEEDED bookId=' + r.bookId)
    setTimeout(() => app.quit(), 300)
  } catch (e) {
    write('SEED_ERROR ' + (e as Error).stack)
    app.quit()
  }
})
