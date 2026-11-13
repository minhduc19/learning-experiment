"""Exercise the lesson catalog, editor, navigation, and real browser Python.
UI_BASE_URL=http://localhost:5180 python apps/frontend/tests/browser/coding-lessons.py
"""
import json
import os
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[4]
lessons = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {codingLessons} from './apps/frontend/src/data/codingLessons/index.js';console.log(JSON.stringify(codingLessons))"], cwd=root, text=True))
base = os.getenv('UI_BASE_URL', 'http://localhost:5180')
with sync_playwright() as p:
    options = {'executable_path': os.getenv('PLAYWRIGHT_CHROMIUM_EXECUTABLE', '/usr/bin/chromium'), 'args': ['--no-sandbox']}
    if os.getenv('HTTPS_PROXY'):
        options['proxy'] = {'server': os.environ['HTTPS_PROXY'], 'bypass': 'localhost,127.0.0.1'}
    browser = p.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, ignore_https_errors=True)
    errors = []
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.goto(base + '/coding-lessons')
    expect(page.locator('.library-card')).to_have_count(3)
    assert page.locator('.library-card').first.get_attribute('data-lesson-id') == 'polymorphism'
    page.screenshot(path='/tmp/coding-library-desktop.png', full_page=True)
    page.get_by_label('Sort by').select_option('oldest')
    expect(page.locator('.library-card').first).to_have_attribute('data-lesson-id', 'encapsulation')
    page.get_by_role('button', name='OOP', exact=True).click()
    page.get_by_role('button', name='Inheritance', exact=True).click()
    expect(page.locator('.library-card')).to_have_count(1)
    page.reload()
    expect(page.locator('.library-card')).to_have_count(1)
    page.get_by_role('button', name='Clear filters').click()
    page.get_by_role('button', name='DSA', exact=True).click()
    expect(page.get_by_text('No lessons match yet.')).to_be_visible()
    page.get_by_role('button', name='Show all lessons').click()
    page.get_by_label('Find a lesson').fill('plugins')
    expect(page.locator('.library-card')).to_have_count(1)
    expect(page.locator('.library-card').first).to_have_attribute('data-lesson-id', 'polymorphism')
    # Keep a legacy draft and ensure the old URL still opens it.
    page.evaluate("localStorage.setItem('python-practice-bank-account-v1', 'print(42)')")
    page.goto(base + '/python-practice')
    field = page.get_by_role('textbox', name='main.py Python code editor')
    expect(field).to_have_value('print(42)')
    expect(page).to_have_url(base + '/coding-lessons/encapsulation/bank-account')
    # Real Tab key editing, selection, dedent, and an escape path from the editor.
    field.fill('a\nb')
    field.evaluate('(e) => e.setSelectionRange(0, e.value.length)')
    field.press('Tab')
    expect(field).to_have_value('    a\n    b')
    expect(field).to_be_focused()
    field.press('Shift+Tab')
    expect(field).to_have_value('a\nb')
    field.fill('ab')
    field.press('End')
    field.press('Tab')
    expect(field).to_have_value('ab  ')
    field.press('Escape')
    field.press('Tab')
    expect(field).not_to_be_focused()
    # Route changes must isolate drafts, output, and the active solution tab.
    page.goto(base + '/coding-lessons/inheritance/savings-account')
    field.fill('# draft one')
    page.get_by_role('button', name='Solution', exact=True).click()
    page.locator('.lab-exercise-list').get_by_role('link', name='2. Grow the treasure safely').click()
    expect(field).to_be_visible()
    expect(field).not_to_have_value('# draft one')
    expect(page.get_by_role('tab', name='solution.py')).to_have_count(0)
    field.fill('# draft two')
    page.locator('.lab-exercise-navigation').get_by_role('link', name='Previous', exact=False).click()
    expect(field).to_have_value('# draft one')
    # Every lesson and exercise uses its own tests and stores completion separately.
    for lesson in lessons:
        for exercise in lesson['exercises']:
            path = f"/coding-lessons/{lesson['id']}/{exercise['id']}"
            page.goto(base + path)
            expect(page.locator('#lesson-title')).to_have_text(exercise['title'])
            field.fill(exercise['solutionCode'])
            page.get_by_role('button', name='Submit answer', exact=True).click()
            expect(page.locator('.lab-results-heading')).to_contain_text(f"{exercise['testCount']} / {exercise['testCount']} passed", timeout=120000)
            expect(page.locator('.lab-exercise-navigation')).to_contain_text('Completed on this device')
            assert page.locator('.lab-test').count() == exercise['testCount']
            if exercise['id'] == 'cooperative-mixins':
                page.locator('.lab-exercise-navigation').get_by_role('link', name='Next: Polymorphism').click()
                expect(page).to_have_url(base + '/coding-lessons/polymorphism/duck-typing')
    page.goto(base + '/coding-lessons')
    expect(page.locator('[data-lesson-id="inheritance"]')).to_contain_text('4 / 4 complete')
    expect(page.locator('[data-lesson-id="polymorphism"]')).to_contain_text('4 / 4 complete')
    for width in (390, 768, 1440):
        page.set_viewport_size({'width': width, 'height': 900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
    page.set_viewport_size({'width': 390, 'height': 900})
    page.screenshot(path='/tmp/coding-library-mobile.png', full_page=True)
    page.goto(base + '/coding-lessons/polymorphism/composed-service')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path='/tmp/coding-exercise-mobile.png', full_page=True)
    page.goto(base + '/coding-lessons/missing/missing')
    expect(page.get_by_role('heading', name='Coding lesson not found')).to_be_visible()
    assert not errors, errors
    browser.close()
print('PASS: library sort/search/tags, legacy drafts, Tab/Shift+Tab/Escape, isolated exercises, all 9 real Python submissions, progress, invalid routes, and responsive layouts')
