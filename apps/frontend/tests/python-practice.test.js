import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { starterCode, solutionCode, testCode } from '../src/data/pythonPractice.js'

// Exercise the exact worker harness with Python's standard library. The browser
// test separately verifies the Pyodide runtime and termination behavior.
const worker = readFileSync(new URL('../src/workers/python.worker.js', import.meta.url), 'utf8')
const harness = worker.match(/const harness = `([\s\S]*?)`/)[1]
function execute(code, mode = 'submit') {
  const input = JSON.stringify({ code, mode, tests: testCode })
  const program = `import json, sys\npayload=json.loads(sys.argv[1])\npractice_code=payload['code']\npractice_mode=payload['mode']\npractice_tests=payload['tests']\n${harness}\nprint(json.dumps(response))`
  const child = spawnSync('python3', ['-c', program, input], { encoding: 'utf8', timeout: 10000 })
  assert.equal(child.status, 0, child.stderr)
  return JSON.parse(child.stdout)
}
const success = execute(solutionCode)
assert.equal(success.error, null)
assert.equal(success.tests.length, 9)
assert.ok(success.tests.every(row => row.status === 'passed'))
const starter = execute(starterCode)
assert.ok(starter.tests.some(row => row.status === 'failed'))
const broken = execute(solutionCode.replace('self.__balance += amount', 'self.__balance -= amount'))
assert.equal(broken.tests.filter(row => row.status === 'failed').length, 1)
assert.match(broken.tests.find(row => row.status === 'failed').detail, /AssertionError/)
assert.match(execute('raise ValueError("example")', 'run').error, /ValueError: example/)
assert.match(execute('if :', 'run').error, /SyntaxError/)
assert.match(execute(solutionCode, 'run').output, /Balance: 150.0/)
assert.equal(execute('print("x" * 100000)', 'run').output.length, 20000)
