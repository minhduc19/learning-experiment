// A lesson owns ordered exercises. Tests stay visible and execute in the worker.
export function exercise({ cases, ...content }) {
  return {
    ...content,
    testCount: cases.length,
    testCode: `import unittest\nimport main\nfrom main import *\n\nclass ExerciseTests(unittest.TestCase):\n${cases.map(({ name, description, body }) => `    def test_${name}(self):\n        ${JSON.stringify(description)}\n${body.split('\n').map(line => '        ' + line).join('\n')}\n`).join('\n')}`,
  }
}
export const check = (name, description, body) => ({ name, description, body })

// A small shared domain carries learners from inheritance to polymorphism.
// Integer cents avoid teaching floating-point arithmetic for financial ledgers.
export const accountCode = `class Account:
    def __init__(self, number, balance=0):
        if type(balance) is not int or balance < 0:
            raise ValueError("balance must be nonnegative integer cents")
        self.number = number
        self._balance = balance

    @property
    def balance(self):
        return self._balance

    @staticmethod
    def _validate_amount(amount):
        if type(amount) is not int or amount <= 0:
            raise ValueError("amount must be positive integer cents")

    def deposit(self, amount):
        self._validate_amount(amount)
        self._balance += amount

    def withdraw(self, amount):
        self._validate_amount(amount)
        if amount > self.balance:
            raise ValueError("insufficient funds")
        self._balance -= amount

`
