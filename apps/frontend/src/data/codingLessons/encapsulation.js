export const starterCode = `class BankAccount:
    def __init__(self, account_number: str, initial_balance: float):
        # Store the account number and balance as private attributes.
        pass

    def get_account_number(self) -> str:
        pass

    def get_balance(self) -> float:
        pass

    def deposit(self, amount: float) -> None:
        # Reject zero or negative deposits with ValueError.
        pass

    def withdraw(self, amount: float) -> None:
        # Reject invalid amounts and insufficient funds.
        pass


if __name__ == "__main__":
    account = BankAccount("DRAGON-001", 100.0)
    account.deposit(50.0)
    print("Account:", account.get_account_number())
    print("Balance:", account.get_balance())
`

export const solutionCode = `class BankAccount:
    def __init__(self, account_number: str, initial_balance: float):
        self.__account_number = account_number
        self.__balance = initial_balance

    def get_account_number(self) -> str:
        return self.__account_number

    def get_balance(self) -> float:
        return self.__balance

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("cannot deposit zero or negative funds")
        self.__balance += amount

    def withdraw(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("cannot withdraw zero or negative funds")
        if amount > self.__balance:
            raise ValueError("insufficient funds")
        self.__balance -= amount


if __name__ == "__main__":
    account = BankAccount("DRAGON-001", 100.0)
    account.deposit(50.0)
    print("Account:", account.get_account_number())
    print("Balance:", account.get_balance())
`

export const testCode = `import unittest
from main import BankAccount


class BankAccountTests(unittest.TestCase):
    def setUp(self):
        self.account = BankAccount("DRAGON-001", 100.0)

    def test_account_number(self):
        """The getter returns the original account number."""
        self.assertEqual(self.account.get_account_number(), "DRAGON-001")

    def test_initial_balance(self):
        """The getter returns the starting balance."""
        self.assertEqual(self.account.get_balance(), 100.0)

    def test_private_attributes(self):
        """Account details are stored in private attributes."""
        self.assertEqual(self.account._BankAccount__account_number, "DRAGON-001")
        self.assertEqual(self.account._BankAccount__balance, 100.0)

    def test_deposit(self):
        """A deposit increases the balance and returns None."""
        self.assertIsNone(self.account.deposit(25.5))
        self.assertEqual(self.account.get_balance(), 125.5)

    def test_withdraw(self):
        """A withdrawal decreases the balance and returns None."""
        self.assertIsNone(self.account.withdraw(40.0))
        self.assertEqual(self.account.get_balance(), 60.0)

    def test_withdraw_all(self):
        """Withdrawing the entire balance is allowed."""
        self.account.withdraw(100.0)
        self.assertEqual(self.account.get_balance(), 0.0)

    def test_invalid_deposit(self):
        """Zero and negative deposits raise ValueError without changing the balance."""
        for amount in (0, -10):
            with self.assertRaisesRegex(ValueError, "^cannot deposit zero or negative funds$"):
                self.account.deposit(amount)
            self.assertEqual(self.account.get_balance(), 100.0)

    def test_invalid_withdrawal(self):
        """Zero and negative withdrawals raise ValueError without changing the balance."""
        for amount in (0, -10):
            with self.assertRaisesRegex(ValueError, "^cannot withdraw zero or negative funds$"):
                self.account.withdraw(amount)
            self.assertEqual(self.account.get_balance(), 100.0)

    def test_insufficient_funds(self):
        """An overdraft raises ValueError and preserves the balance."""
        with self.assertRaisesRegex(ValueError, "^insufficient funds$"):
            self.account.withdraw(101.0)
        self.assertEqual(self.account.get_balance(), 100.0)
`

export default {
  id: 'encapsulation', title: 'Encapsulation', subtitle: 'Protect the dragon’s gold',
  description: 'Build the bank at the heart of our learning path. Protect state with private attributes and a small public interface.',
  createdAt: '2026-11-13T15:00:00Z', order: 1,
  tags: ['Python', 'OOP', 'Encapsulation'], level: 'Foundation', duration: '15 min',
  prerequisites: [],
  exercises: [{
    id: 'bank-account', title: 'Protect the dragon’s gold', level: 'Foundation', duration: '15 min',
    intro: 'Every great kingdom needs a trustworthy bank. Build a BankAccount that keeps its treasure safe, one method at a time.',
    concepts: [{ title: 'Hide representation, expose behavior', text: 'An account owns its balance. Callers deposit and withdraw through methods so validation lives in one place. Double underscores trigger name mangling; they prevent accidental clashes, not deliberate access or security attacks.' }],
    tasks: [
      { title: 'Set up the vault', text: 'In __init__, store account_number as self.__account_number and initial_balance as self.__balance.' },
      { title: 'Let the banker look inside', text: 'Return the private values using get_account_number() and get_balance().' },
      { title: 'Add to the treasure', text: 'deposit(amount) adds to the balance. For amounts ≤ 0, raise ValueError("cannot deposit zero or negative funds").' },
      { title: 'Withdraw wisely', text: 'withdraw(amount) subtracts from the balance. First reject amounts ≤ 0 with ValueError("cannot withdraw zero or negative funds"). Then reject overdrafts with ValueError("insufficient funds"). Both methods return None; rejected transactions leave the balance unchanged.' },
    ],
    mistakes: ['A private __balance in a subclass is a DIFFERENT attribute, not access to the parent’s __balance. Use the parent’s public methods.', 'Check the requested amount, not whether the current balance is negative.'],
    practices: ['Keep mutation and validation together. This introductory float-based exercise is not a production financial ledger: the next lesson explicitly moves to integer cents.'],
    starterCode, solutionCode, testCode, testCount: 9,
    expectedOutput: 'Account: DRAGON-001\nBalance: 150.0',
    takeaway: 'The public interface protects the balance. Next, reuse that behavior through inheritance without reaching into private attributes.',
  }],
}
