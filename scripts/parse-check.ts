// 解析引擎冒烟测试（node 环境直接运行，不启动 Electron）
import fs from 'fs'
import { zipSync, strToU8 } from 'fflate'
import { parseTxt, parseEpub, decodeText, detectLanguage, suggestClassification, fingerprint } from '../src/main/importer'

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else console.log('PASS:', msg)
}

// 1. TXT 章节切分 + UTF-8
const txt = [
  '第一章 始计',
  '昔孔子厄於陳蔡。子曰：「可以一战。」',
  '之乎者也，夫惟圣人为能言之。',
  '',
  '第二章 务外',
  '孟子见梁惠王。王曰：叟不远千里而来！'
].join('\n')
const t1 = parseTxt(txt, '测试古文')
assert(t1.chapters.length === 2, `TXT 分章 = 2，实际 ${t1.chapters.length}`)
assert(t1.chapters[0].title.includes('第一章'), 'TXT 章节标题识别')
const lang = detectLanguage(txt)
assert(lang === 'zh' || lang === 'zh-classical', `中文检测: ${lang}`)

// 2. GBK 解码（电信、新代）
const gbkBuf = Buffer.from([0xb5, 0xe7, 0xd0, 0xc5, 0xa1, 0xa2, 0xd0, 0xc2, 0xb4, 0xfa])
const gbk = decodeText(gbkBuf)
assert(gbk.includes('电信'), `GBK 解码: ${gbk.slice(0, 6)}`)

// 3. 英文 TXT
const en = 'Chapter 1\nThe quick brown fox jumps over the lazy dog, again and again for many words here. '.repeat(5)
assert(detectLanguage(en) === 'en', '英文检测')
assert(parseTxt(en, 'Book').chapters.length >= 1, '英文分章')

// 4. 分类建议
const sug = suggestClassification('红楼梦研究', '', 'zh', '这是一部关于清代小说与命运、爱情、诗歌的文学散文研究，涉及历史王朝与哲学伦理。')
assert(sug.confidence > 0, `分类建议置信 ${sug.confidence.toFixed(2)} 理由: ${sug.reason}`)

// 5. EPUB 解析（内存构造最小 EPUB）
const files: Record<string, Uint8Array> = {
  'mimetype': strToU8('application/epub+zip'),
  'META-INF/container.xml': strToU8(
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
  ),
  'OEBPS/content.opf': strToU8(`<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>示例电子书</dc:title><dc:creator>张三</dc:creator><dc:language>zh</dc:language>
  </metadata>
  <manifest>
    <item id="ch1" href="c1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="c2.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx"><itemref idref="ch1"/><itemref idref="ch2"/></spine>
</package>`),
  'OEBPS/c1.xhtml': strToU8('<html><body><h2>卷一·入门</h2><p>第一段内容，之乎者也。</p><p>第二段。</p></body></html>'),
  'OEBPS/c2.xhtml': strToU8('<html><body><p>卷二正文，没有标题标签。</p></body></html>'),
  'OEBPS/toc.ncx': strToU8(
    '<ncx><navMap><navPoint><navLabel><text>卷一·入门</text></navLabel><content src="c1.xhtml"/></navPoint><navPoint><navLabel><text>卷二</text></navLabel><content src="c2.xhtml"/></navPoint></navMap></ncx>'
  )
}
const buf = Buffer.from(zipSync(files))
const ep = parseEpub(buf, 'fallback')
assert(ep.title === '示例电子书', `EPUB 标题: ${ep.title}`)
assert(ep.author === '张三', 'EPUB 作者')
assert(ep.chapters.length === 2, `EPUB 章节数 = 2，实际 ${ep.chapters.length}`)
assert(ep.chapters[0].title === '卷一·入门', `EPUB 章名: ${ep.chapters[0].title}`)
assert(ep.integrity === 'complete', 'EPUB 完整性')
assert(fingerprint(buf, 'a.epub').length === 64, '指纹生成')

// 6. 真实样本书籍：水浒传（回）与西厢记（本/折）
if (fs.existsSync('samples/水浒传_施耐庵.txt')) {
  const sh = parseTxt(fs.readFileSync('samples/水浒传_施耐庵.txt', 'utf8'), '水浒传')
  assert(sh.chapters.length >= 70, `水浒传 分回 ≥70，实际 ${sh.chapters.length}`)
}
if (fs.existsSync('samples/西厢记_王实甫.txt')) {
  const xj = parseTxt(fs.readFileSync('samples/西厢记_王实甫.txt', 'utf8'), '西厢记')
  assert(xj.chapters.length === 25, `西厢记 分折 = 25，实际 ${xj.chapters.length}`)
  assert(xj.chapters[0].title.includes('第一本'), `西厢记首章标题: ${xj.chapters[0].title}`)
}

console.log(process.exitCode ? '\n存在失败项' : '\n全部通过')
fs.writeFileSync('out/parse-check.txt', 'ok')
