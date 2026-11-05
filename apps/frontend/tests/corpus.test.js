import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { characterLabel, highlightedText, useCorpusPage } from '../src/composables/useCorpusPage.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const response = (items, next_cursor = null) => ({ ok: true, json: async () => ({ items, next_cursor }) })

test('corpus pages use opaque cursors, append results, and reset for a different filter', async () => {
  const urls = []
  globalThis.fetch = async url => {
    urls.push(url)
    return urls.length === 1 ? response([{ id: 1 }], 'opaque=cursor+') : response([{ id: 2 }])
  }
  const page = useCorpusPage(2)
  await page.reset('/api/corpus/characters?sort=occurrence_count')
  await page.load()
  assert.deepEqual(page.items.map(item => item.id), [1, 2])
  assert.equal(new URL(urls[1], 'http://localhost').searchParams.get('cursor'), 'opaque=cursor+')
  await page.reset('/api/corpus/characters?character=学')
  assert.deepEqual(page.items.map(item => item.id), [2])
  assert.equal(new URL(urls[2], 'http://localhost').searchParams.has('cursor'), false)
  page.dispose()
})

test('a late response cannot replace a newer character or segment selection', async () => {
  let finishOld
  globalThis.fetch = async url => url.includes('/old')
    ? new Promise(resolve => { finishOld = resolve }) : response([{ id: 2 }])
  const page = useCorpusPage()
  const old = page.reset('/old')
  await page.reset('/new')
  finishOld(response([{ id: 1 }]))
  await old
  assert.deepEqual(page.items.map(item => item.id), [2])
  assert.equal(page.loading, false)
  page.dispose()
})

test('a failed next page preserves existing rows and retries the same cursor', async () => {
  let call = 0
  globalThis.fetch = async () => {
    call += 1
    if (call === 2) return { ok: false, status: 503 }
    return call === 1 ? response([{ id: 1 }], 'next') : response([{ id: 2 }])
  }
  const page = useCorpusPage()
  await page.reset('/characters')
  await page.load()
  assert.deepEqual(page.items.map(item => item.id), [1])
  assert.equal(page.nextCursor, 'next')
  assert.match(page.error, /unavailable/)
  await page.load()
  assert.deepEqual(page.items.map(item => item.id), [1, 2])
  assert.equal(page.error, '')
  page.dispose()
})

test('malformed pages show an error rather than looking like an empty corpus', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ unexpected: true }) })
  const page = useCorpusPage()
  await page.reset('/characters')
  assert.equal(page.loaded, false)
  assert.match(page.error, /unexpected/)
  page.dispose()
})

test('highlight ranges use Unicode code points and preserve punctuation and whitespace', () => {
  const text = '😀谢𠀀谢。\r\n'
  const parts = highlightedText(text, [{ start_offset: 1, end_offset: 2 }, { start_offset: 3, end_offset: 4 }])
  assert.equal(parts.map(part => part.text).join(''), text)
  assert.deepEqual(parts.filter(part => part.match).map(part => part.text), ['谢', '谢'])
  assert.deepEqual(highlightedText('谢谢。', [{ start_offset: 0, end_offset: 2 }]), [
    { text: '谢谢', match: true }, { text: '。', match: false },
  ])
})

test('invisible characters have readable labels without changing Chinese or astral characters', () => {
  assert.equal(characterLabel(' '), 'Space')
  assert.equal(characterLabel('\n'), 'Line feed')
  assert.equal(characterLabel('𠀀'), '𠀀')
  assert.equal(characterLabel('学'), '学')
  assert.equal(characterLabel('\r\n'), 'Carriage return + Line feed')
  assert.equal(characterLabel('\u200b'), 'U+200B')
})
