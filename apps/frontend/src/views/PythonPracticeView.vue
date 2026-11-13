<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { starterCode, solutionCode, testCode } from '../data/pythonPractice'
import '../styles/python-practice.css'

const storageKey = 'python-practice-bank-account-v1'
let saved = null
try { saved = localStorage.getItem(storageKey) } catch { /* Private browsing can disable storage. */ }
const code = ref(saved ?? starterCode)
const activeTab = ref('main')
const solutionOpen = ref(false)
const checked = ref([])
const output = ref(null)
const phase = ref('idle')
const mode = ref('run')
const savedState = ref('Saved on this device')
const editor = ref(null)
const scroll = ref({ x: 0, y: 0 })
const fontSize = ref(14)
let worker = null
let timer = null
const busy = computed(() => phase.value === 'loading' || phase.value === 'running')
const tabs = computed(() => [{ id: 'main', label: 'main.py' }, { id: 'tests', label: 'main_test.py', locked: true }, ...(solutionOpen.value ? [{ id: 'solution', label: 'solution.py', locked: true }] : [])])
const source = computed(() => activeTab.value === 'tests' ? testCode : activeTab.value === 'solution' ? solutionCode : code.value)
const lines = computed(() => source.value.split('\n').length)
const passed = computed(() => output.value?.tests.filter(test => test.status === 'passed').length ?? 0)
const allPassed = computed(() => output.value?.tests.length > 0 && passed.value === output.value.tests.length && !output.value.error)
const resultTitle = computed(() => !output.value ? 'Your next discovery starts here.' : output.value.error ? 'Something needs your attention' : output.value.tests.length ? allPassed.value ? 'Quest complete. Nicely done.' : 'A few things to work on' : 'Program finished')
watch(code, value => {
  try { localStorage.setItem(storageKey, value); savedState.value = 'Saved on this device' }
  catch { savedState.value = 'Draft cannot be saved on this device' }
})
watch(activeTab, () => { scroll.value = { x: 0, y: 0 }; nextTick(() => { if (editor.value) { editor.value.scrollTop = 0; editor.value.scrollLeft = 0 } }) })
const escape = text => text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const highlighted = computed(() => {
  const pattern = /#[^\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:class|def|if|else|elif|return|raise|pass|import|from|for|in|with|as|try|except|None|True|False|self)\b|\b\d+(?:\.\d+)?\b/g
  let end = 0
  let html = ''
  for (const match of source.value.matchAll(pattern)) {
    html += escape(source.value.slice(end, match.index))
    const token = match[0]
    const type = token.startsWith('#') ? 'comment' : /^["']/.test(token) ? 'string' : /^\d/.test(token) ? 'number' : 'keyword'
    html += `<span class="py-${type}">${escape(token)}</span>`
    end = match.index + token.length
  }
  return html + escape(source.value.slice(end)) + '\n'
})
function selectTab(id) { activeTab.value = id }
function tabKey(event, index) {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.value.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.value.length) % tabs.value.length
  activeTab.value = tabs.value[next].id
  nextTick(() => document.getElementById(`py-tab-${activeTab.value}`)?.focus())
}
function keydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    execute(event.shiftKey ? 'submit' : 'run')
  }
  // Normal Tab navigation remains available; Alt+Tab inserts indentation.
  if (event.altKey && event.key === 'Tab' && activeTab.value === 'main') {
    event.preventDefault()
    const field = event.target
    const position = field.selectionStart
    code.value = code.value.slice(0, position) + '    ' + code.value.slice(field.selectionEnd)
    nextTick(() => { field.selectionStart = field.selectionEnd = position + 4 })
  }
}
function dispose() { clearTimeout(timer); worker?.terminate(); worker = null }
function stop(message = 'Execution stopped. Your code is still saved.') {
  dispose()
  phase.value = 'idle'
  output.value = { tests: [], output: '', error: message }
}
function execute(nextMode) {
  if (busy.value) return
  mode.value = nextMode
  phase.value = 'loading'
  output.value = null
  try {
    worker = new Worker(new URL('../workers/python.worker.js', import.meta.url))
    timer = setTimeout(() => stop('Python could not start within 90 seconds. Check your connection and try again.'), 90000)
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        phase.value = 'running'
        clearTimeout(timer)
        timer = setTimeout(() => stop('Execution exceeded 5 seconds. Check for an infinite loop and run again.'), 5000)
      } else if (data.type === 'result') {
        output.value = data.result
        phase.value = 'idle'
        dispose()
      } else {
        stop(`Python could not start. Check that cdn.jsdelivr.net is reachable, then try again.\n${data.message}`)
      }
    }
    worker.onerror = () => stop('The Python worker stopped unexpectedly. Try again, or check your browser connection.')
    worker.postMessage({ mode: nextMode, code: code.value, tests: testCode })
  } catch (error) { stop(`Unable to start Python: ${error.message}`) }
}
function reset() {
  if (!window.confirm('Replace your saved code with the starter code?')) return
  code.value = starterCode
  activeTab.value = 'main'
  checked.value = []
  output.value = null
}
onBeforeUnmount(dispose)
</script>

<template>
  <main class="python-lab">
    <header class="lab-topbar">
      <RouterLink to="/ideas" class="lab-brand" aria-label="Back to Ideas"><span class="lab-mark">✧</span><span>CODE<span class="lab-brand-light">QUEST</span></span></RouterLink>
      <span class="lab-top-divider"></span>
      <span class="lab-course">THE PYTHON PATH <span>/</span> Object-oriented programming</span>
      <span class="lab-local"><span></span> Personal workspace</span>
    </header>
    <div class="lab-lessonbar">
      <div><span class="lab-chapter">CHAPTER 03</span><span class="lab-chapter-name">Encapsulation</span></div>
      <div class="lab-lesson-progress" aria-label="Lesson 6 of 8"><i v-for="n in 8" :key="n" :class="{ filled: n < 6, current: n === 6 }"></i><span>06 / 08</span></div>
      <RouterLink to="/ideas" class="lab-exit">All exercises ↗</RouterLink>
    </div>
    <div class="lab-workspace">
      <section class="lab-instructions" aria-labelledby="lesson-title">
        <div class="lab-lesson-eyebrow"><span>✦ PRACTICE</span><span>~15 MIN</span></div>
        <h1 id="lesson-title">Protect the<br><em>dragon’s gold.</em></h1>
        <p class="lab-intro">Every great kingdom needs a trustworthy bank. Build a <code>BankAccount</code> that keeps its treasure safe, one method at a time.</p>
        <div class="lab-tags"><span>Python</span><span>Classes</span><span>Encapsulation</span></div>
        <div class="lab-section-heading"><h2>Your assignment</h2><span>{{ checked.length }} / 4</span></div>
        <p class="lab-assignment-intro">Complete the <code>BankAccount</code> class in <strong>main.py</strong>. Mark each step as you go.</p>
        <div class="lab-task"><label><input v-model="checked" type="checkbox" value="constructor"><span>01</span><strong>Set up the vault</strong></label><p>In <code>__init__</code>, store <code>account_number</code> as <code>self.__account_number</code> and <code>initial_balance</code> as <code>self.__balance</code>.</p></div>
        <div class="lab-task"><label><input v-model="checked" type="checkbox" value="getters"><span>02</span><strong>Let the banker look inside</strong></label><p>Return the private values using <code>get_account_number()</code> and <code>get_balance()</code>.</p></div>
        <div class="lab-task"><label><input v-model="checked" type="checkbox" value="deposit"><span>03</span><strong>Add to the treasure</strong></label><p><code>deposit(amount)</code> adds to the balance. For amounts ≤ 0, raise <code>ValueError("cannot deposit zero or negative funds")</code>.</p></div>
        <div class="lab-task"><label><input v-model="checked" type="checkbox" value="withdraw"><span>04</span><strong>Withdraw wisely</strong></label><p><code>withdraw(amount)</code> subtracts from the balance. First reject amounts ≤ 0 with <code>ValueError("cannot withdraw zero or negative funds")</code>. Then reject amounts above the balance with <code>ValueError("insufficient funds")</code>.</p></div>
        <aside class="lab-tip"><span>✧</span><div><strong>A little wisdom</strong><p>Two leading underscores make an attribute private through Python’s name mangling. Access it through a method instead.</p></div></aside>
        <p class="lab-return-note">Both transaction methods should return <code>None</code>. Rejected transactions must leave the balance unchanged.</p>
        <div class="lab-example"><span>EXPECTED OUTPUT · RUN</span><pre>Account: DRAGON-001
Balance: 150.0</pre></div>
      </section>
      <section class="lab-coding" aria-label="Python coding workspace">
        <div class="lab-editor-header"><span><i></i> WORKSPACE</span><label>Text size <select v-model="fontSize" aria-label="Editor text size"><option :value="13">13px</option><option :value="14">14px</option><option :value="16">16px</option><option :value="18">18px</option></select></label></div>
        <div class="lab-tabs" role="tablist" aria-label="Python files"><button v-for="(tab, index) in tabs" :id="`py-tab-${tab.id}`" :key="tab.id" role="tab" :aria-selected="activeTab === tab.id" :tabindex="activeTab === tab.id ? 0 : -1" aria-controls="python-editor-panel" @click="selectTab(tab.id)" @keydown="tabKey($event, index)"><span :class="tab.locked ? 'lab-lock' : 'lab-python-icon'">{{ tab.locked ? '▣' : 'Py' }}</span>{{ tab.label }}<span v-if="tab.id === 'main'" class="lab-file-dot"></span></button></div>
        <div id="python-editor-panel" class="lab-editor" role="tabpanel" :aria-labelledby="`py-tab-${activeTab}`" :style="{ '--editor-font-size': fontSize + 'px' }">
          <div class="lab-gutter" aria-hidden="true"><div :style="{ transform: `translateY(-${scroll.y}px)` }"><span v-for="line in lines" :key="line">{{ line }}</span></div></div>
          <div class="lab-code-surface"><pre aria-hidden="true" class="lab-code-highlight" :style="{ transform: `translate(-${scroll.x}px, -${scroll.y}px)` }" v-html="highlighted"></pre><textarea ref="editor" :value="source" :readonly="activeTab !== 'main'" :aria-label="activeTab === 'main' ? 'main.py Python code editor' : `${activeTab === 'tests' ? 'main_test.py tests' : 'solution.py reference solution'} (read only)`" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" @input="code = $event.target.value" @keydown="keydown" @scroll="scroll = { x: $event.target.scrollLeft, y: $event.target.scrollTop }"></textarea></div>
        </div>
        <div class="lab-editor-status"><span>{{ activeTab === 'main' ? savedState : 'Read only · ' + (activeTab === 'tests' ? 'These are the tests used by Submit' : 'Reference solution') }}</span><span>Python 3.12 <b>·</b> UTF-8</span></div>
        <div class="lab-actions"><button class="lab-submit" aria-label="Submit answer" :disabled="busy" @click="execute('submit')"><span>▷</span> Submit answer</button><button class="lab-run" aria-label="Run" :disabled="busy" title="Ctrl/Cmd + Enter" @click="execute('run')"><span aria-hidden="true">▷</span> Run</button><button class="lab-solution" aria-label="Solution" @click="solutionOpen = true; activeTab = 'solution'">◉ <span>Solution</span></button><button v-if="busy" class="lab-stop" @click="stop()">■ Stop</button><button class="lab-reset" :disabled="busy" aria-label="Reset to starter code" title="Reset to starter code" @click="reset">↺</button></div>
        <section class="lab-results" aria-labelledby="output-title" :aria-busy="busy">
          <div class="lab-results-heading"><h2 id="output-title">CONSOLE <span>/ {{ mode === 'submit' ? 'TEST RESULTS' : 'OUTPUT' }}</span></h2><span v-if="output?.tests.length" :class="allPassed ? 'lab-pass' : 'lab-fail'">{{ passed }} / {{ output.tests.length }} passed</span><span v-else class="lab-runtime-label">IN-BROWSER PYTHON</span></div>
          <div v-if="busy" class="lab-console-empty" role="status"><span class="lab-spinner"></span><strong>{{ phase === 'loading' ? 'Preparing your Python workspace…' : mode === 'submit' ? 'Checking your solution…' : 'Running your code…' }}</strong><p>{{ phase === 'loading' ? 'The first run downloads Python. This can take a moment.' : 'Execution stops automatically after 5 seconds.' }}</p></div>
          <div v-else class="lab-console-content">
            <div class="lab-result-summary" role="status"><span :class="{ 'lab-pass': allPassed, 'lab-fail': output?.error }">{{ output ? allPassed ? '✓' : '›' : '⌘' }}</span><div><strong>{{ resultTitle }}</strong><p v-if="!output">Run your code to experiment. Submit to check all 9 tests.</p><p v-else-if="allPassed">Your bank keeps its promises. All 9 checks passed.</p><p v-else-if="output.tests.length">Open a failed check below to see what to fix, then submit again.</p></div></div>
            <pre v-if="output?.output" class="lab-stdout">{{ output.output }}{{ output.output.length >= 20000 ? '\n[Output truncated to 20,000 characters]' : '' }}</pre><pre v-if="output?.error" class="lab-traceback">{{ output.error }}</pre>
            <p v-if="output && !output.error && !output.output && !output.tests.length" class="lab-no-output">No output. Add a <code>print()</code> call to see a value here.</p>
            <details v-for="test in output?.tests || []" :key="test.name" class="lab-test"><summary><span :class="test.status === 'passed' ? 'lab-pass' : 'lab-fail'">{{ test.status === 'passed' ? '✓' : '×' }}</span>{{ test.name.replace('test_', '').replaceAll('_', ' ') }}<span class="lab-test-badge">{{ test.status }}</span></summary><p>{{ test.description }}</p><pre v-if="test.detail">{{ test.detail }}</pre></details>
          </div>
        </section>
        <footer class="lab-footer"><span>⌨ Ctrl / ⌘ + Enter to run</span><span>Your code runs locally in your browser.</span></footer>
      </section>
    </div>
  </main>
</template>
