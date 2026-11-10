"""Run with Vite on :5173 and Python Playwright installed.
PLAYWRIGHT_CHROMIUM_EXECUTABLE may select a system Chromium.
"""
import json
import os
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[4]
stories = json.loads(subprocess.check_output([
    'node', '--input-type=module', '-e',
    "import {readdirSync} from 'node:fs'; const dir='./apps/frontend/src/data/readingExercises/'; const modules=await Promise.all(readdirSync(dir).filter(f=>f.endsWith('.js') && f!=='index.js').map(f=>import(dir+f))); console.log(JSON.stringify(modules.map(m=>m.story).filter(Boolean)))",
], cwd=root))
base = os.environ.get('UI_BASE_URL', 'http://localhost:5173')
with sync_playwright() as p:
    executable = os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
    browser = p.chromium.launch(**({'executable_path': executable} if executable else {}))
    cases = 0
    for width in (320, 390, 430, 768, 1440):
        page = browser.new_page(viewport={'width': width, 'height': 900})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for story in stories:
            answers = {s['id']: s['answer'] for s in story['steps'] if 'answer' in s}
            page.goto(f"{base}/reading-exercises/{story['id']}")
            page.wait_for_selector('.story-words')
            # Every passage and checkpoint, including their unsolved options.
            for index in range(len(story['steps']) + 1):
                page.evaluate('(v) => localStorage.setItem(v.key, JSON.stringify(v.session))', {
                    'key': f"story-session:{story['id']}",
                    'session': {'index': index, 'answers': {s['id']: answers[s['id']] for s in story['steps'][:index] if s['id'] in answers}, 'mistakes': 0},
                })
                page.reload()
                page.wait_for_selector('.story-player')
                for pinyin in (True, False):
                    if not pinyin:
                        page.get_by_role('button', name='Story settings', exact=True).click()
                        page.get_by_label('Show pinyin').uncheck()
                        page.get_by_role('button', name='Story settings', exact=True).click()
                    overflow = page.evaluate('''() => ({page: document.documentElement.scrollWidth > innerWidth,
                        text: [...document.querySelectorAll('.story-words, .word-help, .choice, .event-list li')].some(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== 'inline')})''')
                    if any(overflow.values()):
                        print(page.evaluate("[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({cls:e.className,text:e.textContent.slice(0,30),w:e.getBoundingClientRect().width}))"))
                    assert not any(overflow.values()), (story['id'], width, index, pinyin, overflow)
                    cases += 1
            # Exercise real progression and word help, then restart.
            page.get_by_role('button', name='Read again', exact=True).click()
            page.locator('.word-help').first.click()
            page.get_by_role('button', name='Close word meaning', exact=True).click()
            page.get_by_role('button', name='Continue', exact=False).click()
            step = story['steps'][1]
            for answer in step['answer']:
                option = next(o for o in step['options'] if o['id'] == answer)
                page.locator('.choice').nth(step['options'].index(option)).click()
            page.get_by_role('button', name='Check answer', exact=True).click()
            assert page.locator('.solved-checkpoint').count() == 1
            page.get_by_role('button', name='Continue', exact=False).click()
            page.reload()
            page.wait_for_selector('#step-' + story['steps'][2]['id'])
        assert not errors, errors
        page.close()
    browser.close()
    print(f'PASS: {cases} layout states across four exercises, five widths, pinyin on/off; word help, answer, continue, restart and resume interactions.')
