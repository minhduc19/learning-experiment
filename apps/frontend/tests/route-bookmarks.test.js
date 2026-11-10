import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadBookmarks, saveBookmarks, sortBookmarked } from '../src/composables/routeBookmarks.js'
test('bookmarks persist, tolerate damaged storage, and sort without changing route order', () => {
  let value = null
  const storage = { getItem: () => value, setItem: (key, text) => { value = text } }
  assert.deepEqual(loadBookmarks(storage), [])
  assert.equal(saveBookmarks(storage, ['/b']), true)
  assert.deepEqual(loadBookmarks(storage), ['/b'])
  const pages = [{ path: '/a' }, { path: '/b' }, { path: '/c' }]
  assert.deepEqual(sortBookmarked(pages, loadBookmarks(storage)).map(p => p.path), ['/b', '/a', '/c'])
  assert.deepEqual(pages.map(p => p.path), ['/a', '/b', '/c'])
  value = '{bad'; assert.deepEqual(loadBookmarks(storage), [])
  value = '["/a",3,"/a"]'; assert.deepEqual(loadBookmarks(storage), ['/a'])
  assert.equal(saveBookmarks(undefined, []), false)
  assert.deepEqual(loadBookmarks(undefined), [])
})
