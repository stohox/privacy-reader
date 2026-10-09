// 端到端持久化验证：用真实 db/crypto 模块，写入后重开读回，确认落盘可靠
import { app } from 'electron'
import path from 'path'
import os from 'os'
import fs from 'fs'
import initSqlJs from 'sql.js'
import { initDb, books, chapters, persistNow } from '../src/main/db'

const tmp = path.join(os.tmpdir(), 'pr-persist-test-' + Date.now())
fs.mkdirSync(tmp, { recursive: true })
app.setPath('userData', tmp)

app.whenReady().then(async () => {
  try {
    await initDb()
    const id = books.create({ title: '水浒传_测试', author: '施耐庵', format: 'txt' })
    chapters.insertAll(
      id,
      [
        { title: '第一回 测试', paragraphs: ['张教頭私走延安府，鲁达大闹五台山。', '第二段正文内容。'] },
        { title: '第二回 测试', paragraphs: ['花和尚倒拔垂杨柳，豹子头误入白虎堂。'] }
      ]
    )
    persistNow()
    const dbFile = path.join(tmp, 'reader.db')
    const size = fs.statSync(dbFile).size
    console.log('RESULT_WRITTEN id=' + id + ' dbSize=' + size)
    // 真正模拟重启：用全新 sql.js 从磁盘文件重新加载并查询
    const SQL = await initSqlJs({
      locateFile: (f) => path.join(path.dirname(require.resolve('sql.js')), f)
    })
    const fresh = new SQL.Database(fs.readFileSync(dbFile))
    const bq = fresh.exec('SELECT title FROM books')
    const cq = fresh.exec('SELECT COUNT(*) FROM chapters')
    const bookTitles = (bq[0]?.values || []).map((v) => String(v[0]))
    const chapterCount = Number(cq[0]?.values?.[0]?.[0] ?? 0)
    console.log('RESULT_REOPEN books=' + bookTitles.join(',') + ' chapters=' + chapterCount)
    console.log(
      bookTitles.includes('水浒传_测试') && chapterCount === 2 ? 'PERSIST_OK' : 'PERSIST_FAIL'
    )
  } catch (e) {
    console.log('PERSIST_ERROR ' + (e as Error).message)
  } finally {
    app.quit()
  }
})
