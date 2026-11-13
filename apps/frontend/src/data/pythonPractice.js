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
