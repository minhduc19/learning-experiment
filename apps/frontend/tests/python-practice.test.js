import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { codingLessons, listLessons, codingTags, draftKey } from '../src/data/codingLessons/index.js'
import { indentCode } from '../src/composables/codeIndentation.js'
import { starterCode, solutionCode, testCode } from '../src/data/codingLessons/encapsulation.js'

// Exercise the exact worker harness with Python's standard library. The browser
// test separately verifies the Pyodide runtime and termination behavior.
const worker = readFileSync(new URL('../src/workers/python.worker.js', import.meta.url), 'utf8')
const harness = worker.match(/const harness = `([\s\S]*?)`/)[1]
function execute(code, mode = 'submit', tests = testCode) {
  const input = JSON.stringify({ code, mode, tests })
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

// Every exercise is standalone, has a failing starter and a passing reference.
for (const lesson of codingLessons) {
  assert.ok(Number.isFinite(Date.parse(lesson.createdAt)))
  assert.ok(lesson.tags.every(tag => codingTags.includes(tag)))
  assert.equal(new Set(lesson.exercises.map(task => task.id)).size, lesson.exercises.length)
  for (const task of lesson.exercises) {
    const result = execute(task.solutionCode, 'submit', task.testCode)
    assert.equal(result.error, null, `${lesson.id}/${task.id}: ${result.error}`)
    assert.equal(result.tests.length, task.testCount)
    assert.ok(result.tests.every(row => row.status === 'passed'), JSON.stringify({ lesson: lesson.id, task: task.id, tests: result.tests.filter(row => row.status !== 'passed') }))
    const starter = execute(task.starterCode, 'submit', task.testCode)
    assert.ok(starter.error || starter.tests.some(row => row.status !== 'passed'), `Starter already passes ${lesson.id}/${task.id}`)
    assert.ok(task.concepts.length && task.mistakes.length && task.practices.length)
  }
}
assert.deepEqual(listLessons().map(lesson => lesson.id), ['polymorphism', 'inheritance', 'encapsulation'])
assert.deepEqual(listLessons({ sort: 'oldest' }).map(lesson => lesson.id), ['encapsulation', 'inheritance', 'polymorphism'])
assert.deepEqual(listLessons({ tags: ['OOP', 'Inheritance'] }).map(lesson => lesson.id), ['inheritance'])
assert.equal(listLessons({ tags: ['DSA'] }).length, 0)
assert.equal(listLessons({ search: 'plugins' })[0].id, 'polymorphism')
assert.equal(draftKey(codingLessons[0], codingLessons[0].exercises[0]), 'python-practice-bank-account-v1')
assert.notEqual(draftKey(codingLessons[1], codingLessons[1].exercises[0]), draftKey(codingLessons[1], codingLessons[1].exercises[1]))
assert.deepEqual(indentCode('x', 0, 0), { value: '    x', start: 4, end: 4 })
assert.deepEqual(indentCode('ab', 2, 2), { value: 'ab  ', start: 4, end: 4 })
assert.equal(indentCode('a\nb', 0, 3).value, '    a\n    b')
assert.equal(indentCode('a\nb', 0, 2).value, '    a\nb')
assert.equal(indentCode('    a\n  b', 0, 9, true).value, 'a\nb')
assert.deepEqual(indentCode('    x', 2, 2, true), { value: 'x', start: 0, end: 0 })
assert.equal(indentCode('\tx', 1, 1, true).value, 'x')
assert.deepEqual(indentCode('\n', 0, 0), { value: '    \n', start: 4, end: 4 })
