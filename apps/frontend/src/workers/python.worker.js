// Pyodide stays in a terminable worker; no user Python reaches the backend.
const runtimeUrl = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'
const harness = `
import contextlib, io, json, sys, traceback, types, unittest

class LimitedOutput(io.StringIO):
    def write(self, value):
        remaining = max(0, 20000 - self.tell())
        super().write(value[:remaining])
        return len(value)

class PracticeResult(unittest.TestResult):
    def __init__(self):
        super().__init__()
        self.rows = []
    def record(self, test, status, detail=""):
        self.rows.append({"name": test._testMethodName, "description": test.shortDescription(),
                          "status": status, "detail": detail[-8000:]})
    def addSuccess(self, test):
        super().addSuccess(test)
        self.record(test, "passed")
    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.record(test, "failed", self._exc_info_to_string(err, test))
    def addError(self, test, err):
        super().addError(test, err)
        self.record(test, "failed", self._exc_info_to_string(err, test))

output = LimitedOutput()
response = {"output": "", "tests": [], "error": None}
try:
    with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
        main_module = types.ModuleType("main")
        main_module.__dict__["__name__"] = "__main__" if practice_mode == "run" else "main"
        sys.modules["main"] = main_module
        exec(compile(practice_code, "main.py", "exec"), main_module.__dict__)
        if practice_mode == "submit":
            tests_module = types.ModuleType("practice_tests")
            exec(compile(practice_tests, "main_test.py", "exec"), tests_module.__dict__)
            result = PracticeResult()
            unittest.defaultTestLoader.loadTestsFromModule(tests_module).run(result)
            response["tests"] = result.rows
except BaseException:
    response["error"] = traceback.format_exc()[-8000:]
response["output"] = output.getvalue()
json.dumps(response)
`

self.onmessage = async ({ data }) => {
  try {
    importScripts(`${runtimeUrl}pyodide.js`)
    const python = await self.loadPyodide({ indexURL: runtimeUrl })
    self.postMessage({ type: 'ready' })
    python.globals.set('practice_code', data.code)
    python.globals.set('practice_tests', data.tests)
    python.globals.set('practice_mode', data.mode)
    const result = JSON.parse(await python.runPythonAsync(harness))
    self.postMessage({ type: 'result', result })
  } catch (error) {
    self.postMessage({ type: 'error', message: String(error.message || error) })
  }
}
