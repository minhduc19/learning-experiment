const key = 'ideas-bookmarks-v1'
export function loadBookmarks(storage) {
  try { const ids = JSON.parse(storage.getItem(key)); return Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === 'string'))] : [] } catch { return [] }
}
export function saveBookmarks(storage, ids) { try { storage.setItem(key, JSON.stringify(ids)); return true } catch { return false } }
export function sortBookmarked(pages, ids) { const saved = new Set(ids); return [...pages.filter(page => saved.has(page.path)), ...pages.filter(page => !saved.has(page.path))] }
