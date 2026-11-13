"""Real browser Python execution checks. Requires Vite and Python Playwright.
UI_BASE_URL=http://localhost:5174 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium python apps/frontend/tests/browser/python-practice.py
"""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[4]
solution = subprocess.check_output(['node', '--input-type=module', '-e',
    "import {solutionCode} from './apps/frontend/src/data/codingLessons/encapsulation.js';process.stdout.write(solutionCode)"], cwd=root, text=True)
with sync_playwright() as p:
    options = {'executable_path': os.getenv('PLAYWRIGHT_CHROMIUM_EXECUTABLE', '/usr/bin/chromium'), 'args': ['--no-sandbox']}
    if os.getenv('HTTPS_PROXY'):
        options['proxy'] = {'server': os.environ['HTTPS_PROXY'], 'bypass': 'localhost,127.0.0.1'}
    browser = p.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, ignore_https_errors=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(os.getenv('UI_BASE_URL', 'http://localhost:5174') + '/python-practice')
    field = page.get_by_role('textbox', name='main.py Python code editor')
    expect(field).to_be_visible()
    page.screenshot(path='/tmp/python-practice-desktop.png', full_page=True)
    page.get_by_role('tab', name='main_test.py').click()
    expect(page.get_by_role('textbox')).to_have_attribute('readonly', '')
    page.get_by_role('button', name='Solution', exact=False).click()
    expect(page.get_by_role('textbox')).to_have_value(solution)
    page.get_by_role('tab', name='main.py', exact=False).first.click()
    field.fill('print("Hello from Python")')
    page.reload()
    expect(field).to_have_value('print("Hello from Python")')
    page.get_by_role('button', name='Run', exact=True).click()
    expect(page.locator('.lab-stdout')).to_contain_text('Hello from Python', timeout=120000)
    field.fill('raise ValueError("A useful error")')
    page.get_by_role('button', name='Run', exact=True).click()
    expect(page.locator('.lab-traceback')).to_contain_text('A useful error', timeout=120000)
    field.fill(solution)
    page.get_by_role('button', name='Submit answer').click()
    expect(page.locator('.lab-results-heading')).to_contain_text('9 / 9 passed', timeout=120000)
    assert page.locator('.lab-test').count() == 9
    page.screenshot(path='/tmp/python-practice-passed.png', full_page=True)
    field.fill(solution.replace('self.__balance += amount', 'self.__balance -= amount'))
    page.get_by_role('button', name='Submit answer').click()
    expect(page.locator('.lab-results-heading')).to_contain_text('8 / 9 passed', timeout=120000)
    page.locator('.lab-test').filter(has_text='deposit').filter(has_text='failed').first.locator('summary').click()
    expect(page.locator('.lab-test[open] pre')).to_contain_text('AssertionError')
    field.fill('while True:\n    pass')
    page.get_by_role('button', name='Run', exact=True).click()
    expect(page.locator('.lab-traceback')).to_contain_text('exceeded 5 seconds', timeout=120000)
    page.get_by_role('button', name='Run', exact=True).click()
    page.get_by_role('button', name='Stop', exact=False).click()
    expect(page.locator('.lab-traceback')).to_contain_text('Execution stopped')
    field.fill('print("Recovered")')
    page.get_by_role('button', name='Run', exact=True).click()
    expect(page.locator('.lab-stdout')).to_contain_text('Recovered', timeout=120000)
    for width in (390, 768, 1440):
        page.set_viewport_size({'width': width, 'height': 900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
    page.set_viewport_size({'width': 390, 'height': 900})
    page.screenshot(path='/tmp/python-practice-mobile.png', full_page=True)
    assert not errors, errors
    browser.close()
    print('PASS: real Python output, exceptions, passing/failing tests, timeout, stop/recovery, draft persistence, tabs, and responsive layouts')
