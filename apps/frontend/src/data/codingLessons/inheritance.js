import { accountCode, exercise, check } from './helpers.js'

const savingsSignature = `class SavingsAccount(Account):
    def __init__(self, number, balance=0, rate_bps=100):
`
export const savingsCode = savingsSignature + `        if type(rate_bps) is not int or not 0 <= rate_bps <= 10000:
            raise ValueError("invalid rate")
        super().__init__(number, balance)
        self.rate_bps = rate_bps

`
export const interestCode = savingsCode + `    def apply_interest(self):
        interest = self.balance * self.rate_bps // 10000
        if interest:
            self.deposit(interest)
        return interest

`
export const feeCode = `class FeeAccount(Account):
    def __init__(self, number, balance=0, fee=10):
        if type(fee) is not int or fee < 0:
            raise ValueError("invalid fee")
        super().__init__(number, balance)
        self.fee = fee

    def withdraw(self, amount):
        self._validate_amount(amount)
        super().withdraw(amount + self.fee)

`

export default {
  id: 'inheritance', title: 'Inheritance', subtitle: 'Grow the bank without duplicating it',
  description: 'Extend our bank from a basic subclass to safe overrides and cooperative mixins. Learn what super() really means and when to stop inheriting.',
  createdAt: '2026-11-13T16:00:00Z', order: 2, tags: ['Python', 'OOP', 'Inheritance'],
  level: 'Basic → Advanced', duration: '60 min', prerequisites: ['encapsulation'],
  exercises: [
    exercise({ id: 'savings-account', title: 'A new kind of account', level: 'Basic', duration: '12 min',
      intro: 'The original vault is working. Now the kingdom wants savings accounts. Reuse the supplied Account rather than copying deposit and withdraw. All money from here onward is integer cents.',
      concepts: [
        { title: 'Inheritance is an “is-a” promise', text: 'A SavingsAccount is an Account: clients still get number, balance, deposit, and withdraw. Account uses a read-only balance property and a single-underscore internal field. A subclass should use public behavior whenever possible.' },
        { title: 'Initialize the parent exactly once', text: 'super().__init__ delegates initialization to the next class in the method resolution order (MRO). It is not a magic reference to a fixed parent. The base class already validates balances; do not duplicate that logic.' },
      ],
      tasks: [
        { title: 'Extend Account', text: 'Complete SavingsAccount.__init__(number, balance=0, rate_bps=100). Call super().__init__(number, balance) and save rate_bps on the instance.' },
        { title: 'Validate the rate', text: 'Accept only integer rate_bps from 0 through 10000, inclusive; reject bool and all other values with ValueError("invalid rate"). 100 basis points equals 1%.' },
        { title: 'Inherit the contract', text: 'Do not reimplement deposit or withdraw. Negative balances, fractional cents, and bool balances must still fail using Account’s validation.' },
      ],
      mistakes: ['Forgetting super().__init__ leaves number and balance uninitialized.', 'bool is a subclass of int in Python. type(value) is int deliberately rejects True as a money value.'],
      practices: ['Keep a base class small and stable. Prefer a public property over depending on its internal field name.'],
      starterCode: accountCode + savingsSignature + '        pass\n', solutionCode: accountCode + savingsCode,
      takeaway: 'You now have a complete savings account with inherited behavior. Next, add interest using that same interface.',
      cases: [
        check('defaults', 'Default rate is 100 bps and balance is zero.', 'a = SavingsAccount("S")\nself.assertIsInstance(a, Account)\nself.assertEqual((a.number, a.balance, a.rate_bps), ("S", 0, 100))'),
        check('inherited_operations', 'Inherited methods operate on the initialized parent balance.', 'a = SavingsAccount("S", 1000, 250)\na.deposit(100)\na.withdraw(50)\nself.assertEqual(a.balance, 1050)'),
        check('rate_boundaries', 'Zero and 10000 basis points are allowed.', 'for rate in (0, 10000):\n    self.assertEqual(SavingsAccount("S", 0, rate).rate_bps, rate)'),
        check('invalid_rates', 'Invalid rates are rejected consistently.', 'for rate in (-1, 10001, True, 1.5, "100"):\n    with self.assertRaisesRegex(ValueError, "invalid rate"):\n        SavingsAccount("S", 0, rate)'),
        check('base_validation', 'Invalid balances still use the parent contract.', 'for balance in (-1, True, 2.5):\n    with self.assertRaises(ValueError):\n        SavingsAccount("S", balance)'),
      ],
    }),
    exercise({ id: 'interest', title: 'Grow the treasure safely', level: 'Intermediate', duration: '12 min',
      intro: 'Your savings constructor is supplied below. Add interest without bypassing the account’s mutation rules. The code from the previous exercise is included, so you can work on one new idea at a time.',
      concepts: [{ title: 'Reuse behavior, not representation', text: 'Calculate interest from the public balance, then use deposit to apply it. Integer cents require an explicit rounding policy: this exercise rounds down on every application with // 10000. Real systems document rounding, tax, and compounding rules.' }],
      tasks: [
        { title: 'Calculate interest', text: 'Implement SavingsAccount.apply_interest(). Compute balance * rate_bps // 10000. Return the integer interest credited.' },
        { title: 'Apply through deposit', text: 'Call self.deposit(interest) only when interest is greater than zero. A zero balance or zero rate must be a no-op. Repeated calls compound from the new balance.' },
      ],
      mistakes: ['Calling deposit(0) violates the inherited validation.', 'Using / returns a float. Financial rounding should be intentional.'],
      practices: ['Keep rounding policy explicit and test tiny balances. Route state changes through the same validated method used by clients.'],
      starterCode: accountCode + savingsCode + '    def apply_interest(self):\n        pass\n', solutionCode: accountCode + interestCode,
      takeaway: 'New behavior can reuse existing methods. Next, override a method while keeping failure atomic.',
      cases: [
        check('interest', 'Interest is credited and returned in cents.', 'a = SavingsAccount("S", 10000, 250)\nself.assertEqual(a.apply_interest(), 250)\nself.assertEqual(a.balance, 10250)'),
        check('zero_cases', 'Zero rate and small balances do not call an invalid deposit.', 'for balance, rate in ((0, 100), (99, 100), (100, 0)):\n    a = SavingsAccount("S", balance, rate)\n    self.assertEqual(a.apply_interest(), 0)\n    self.assertEqual(a.balance, balance)'),
        check('rounding', 'Fractions of a cent round down.', 'a = SavingsAccount("S", 1050, 125)\nself.assertEqual(a.apply_interest(), 13)\nself.assertEqual(a.balance, 1063)'),
        check('compounding', 'Each call uses the updated balance.', 'a = SavingsAccount("S", 10000, 1000)\na.apply_interest()\nself.assertEqual(a.apply_interest(), 1100)\nself.assertEqual(a.balance, 12100)'),
        check('uses_deposit', 'Mutation delegates to the public deposit method.', 'class Observed(SavingsAccount):\n    def deposit(self, amount):\n        self.seen = amount\n        super().deposit(amount)\na = Observed("S", 10000)\na.apply_interest()\nself.assertEqual(a.seen, 100)'),
      ],
    }),
    exercise({ id: 'withdrawal-fees', title: 'Override without half a transaction', level: 'Intermediate', duration: '16 min',
      intro: 'The kingdom adds a fee-paying account. A failed withdrawal must never charge a fee or subtract any money. This small extension exposes an important substitutability tradeoff.',
      concepts: [
        { title: 'An override must preserve guarantees', text: 'FeeAccount is deliberately advertised as a different withdrawal policy: clients need amount + fee available. This strengthens the base precondition, so it is NOT a drop-in replacement where callers assume every withdrawal up to balance succeeds. Production APIs should expose total cost or compose a fee policy instead; we make that explicit in the next lesson.' },
        { title: 'Failure atomicity', text: 'Validate the requested amount, then delegate a SINGLE withdrawal of amount + fee to the parent. Two separate withdrawals can leave the ledger partly changed when the second one fails.' },
      ],
      tasks: [
        { title: 'Validate before adding the fee', text: 'Implement FeeAccount.withdraw(amount). First call self._validate_amount(amount). Zero or negative requests remain invalid even when a positive fee would hide them.' },
        { title: 'Withdraw once', text: 'Delegate amount + self.fee to super().withdraw(). Return None. If insufficient funds or invalid input is raised, preserve the original balance.' },
      ],
      mistakes: ['Withdrawing amount first and fee second can charge the customer for a failed operation.', 'An override that silently changes preconditions can surprise callers even when its signature is unchanged.'],
      practices: ['Document changed policies at the API boundary. Prefer composition for fee policies in a large system; never weaken failure guarantees.'],
      starterCode: accountCode + feeCode.slice(0, feeCode.indexOf('    def withdraw')) + '    def withdraw(self, amount):\n        pass\n', solutionCode: accountCode + feeCode,
      takeaway: 'You saw why an override can be technically valid yet semantically incompatible. We will replace fee inheritance with composition later.',
      cases: [
        check('fee', 'A successful transaction subtracts amount plus fee.', 'a = FeeAccount("F", 100, 10)\nself.assertIsNone(a.withdraw(50))\nself.assertEqual(a.balance, 40)'),
        check('exact_total', 'The exact total cost can consume the full balance.', 'a = FeeAccount("F", 100, 10)\na.withdraw(90)\nself.assertEqual(a.balance, 0)'),
        check('atomic_failure', 'An unaffordable fee must not partly change the balance.', 'a = FeeAccount("F", 100, 10)\nwith self.assertRaisesRegex(ValueError, "insufficient funds"):\n    a.withdraw(95)\nself.assertEqual(a.balance, 100)'),
        check('invalid_request', 'Invalid requests cannot be hidden by a fee.', 'a = FeeAccount("F", 100, 10)\nfor amount in (0, -1, True, 2.5):\n    with self.assertRaises(ValueError):\n        a.withdraw(amount)\n    self.assertEqual(a.balance, 100)'),
        check('no_fee', 'Zero-fee accounts retain ordinary withdrawal behavior.', 'a = FeeAccount("F", 100, 0)\na.withdraw(100)\nself.assertEqual(a.balance, 0)'),
      ],
    }),
    exercise({ id: 'cooperative-mixins', title: 'Follow the method resolution order', level: 'Advanced', duration: '20 min',
      intro: 'The bank now needs withdrawal limits and an audit trail. Practice a deliberately small cooperative hierarchy, then learn why a production codebase might choose composition instead.',
      concepts: [
        { title: 'super() follows the MRO', text: 'In AuditedAccount(AuditMixin, LimitMixin, Account), AuditMixin delegates to LimitMixin, which delegates to Account. Each participant calls super exactly once. Hard-coding Account.withdraw skips other mixins.' },
        { title: 'Order matters', text: 'Append an audit event only AFTER a successful delegation. The supplied constructor uses keyword-only limit and forwards remaining arguments. Cooperative constructors must agree on forwarding conventions; unrelated third-party classes often do not.' },
      ],
      tasks: [
        { title: 'Enforce the limit', text: 'Complete LimitMixin.withdraw(amount): validate the amount, raise ValueError("limit exceeded") when amount > self.limit, otherwise delegate with super().withdraw(amount).' },
        { title: 'Audit success only', text: 'Complete AuditMixin.withdraw(amount): delegate with super(), then append ("withdraw", amount) to self.events. Failed calls must leave events and balance unchanged. Return None.' },
      ],
      mistakes: ['Calling Account.withdraw directly bypasses classes between you and Account in the MRO.', 'Auditing before delegation records transactions that never happened. Class-level lists accidentally share events between accounts.'],
      practices: ['Inspect Class.__mro__ when debugging super chains. Keep mixins narrow and state requirements explicit. Prefer injected policies/services once order-dependent interactions become hard to reason about.'],
      starterCode: accountCode + `class AuditMixin:
    def __init__(self, *args, **kwargs):
        self.events = []
        super().__init__(*args, **kwargs)

    def withdraw(self, amount):
        pass

class LimitMixin:
    def __init__(self, *args, limit=100, **kwargs):
        self.limit = limit
        super().__init__(*args, **kwargs)

    def withdraw(self, amount):
        pass

class AuditedAccount(AuditMixin, LimitMixin, Account):
    pass
`,
      solutionCode: accountCode + `class AuditMixin:
    def __init__(self, *args, **kwargs):
        self.events = []
        super().__init__(*args, **kwargs)

    def withdraw(self, amount):
        super().withdraw(amount)
        self.events.append(("withdraw", amount))

class LimitMixin:
    def __init__(self, *args, limit=100, **kwargs):
        self.limit = limit
        super().__init__(*args, **kwargs)

    def withdraw(self, amount):
        self._validate_amount(amount)
        if amount > self.limit:
            raise ValueError("limit exceeded")
        super().withdraw(amount)

class AuditedAccount(AuditMixin, LimitMixin, Account):
    pass
`,
      takeaway: 'Inheritance reuses behavior, but deep hierarchies couple policies to ordering. Next, use shared interfaces and composition to vary behavior independently.',
      cases: [
        check('chain', 'Both limit and audit behavior participate.', 'a = AuditedAccount("A", 500, limit=100)\na.withdraw(80)\nself.assertEqual(a.balance, 420)\nself.assertEqual(a.events, [("withdraw", 80)])'),
        check('limit', 'Limit rejection leaves state and audit unchanged.', 'a = AuditedAccount("A", 500, limit=100)\nwith self.assertRaisesRegex(ValueError, "limit exceeded"):\n    a.withdraw(101)\nself.assertEqual((a.balance, a.events), (500, []))'),
        check('funds', 'Base rejection also produces no audit entry.', 'a = AuditedAccount("A", 10, limit=100)\nwith self.assertRaises(ValueError):\n    a.withdraw(20)\nself.assertEqual((a.balance, a.events), (10, []))'),
        check('invalid', 'Validation applies before mutation or logging.', 'a = AuditedAccount("A", 500)\nfor amount in (0, -1, True):\n    with self.assertRaises(ValueError):\n        a.withdraw(amount)\nself.assertEqual((a.balance, a.events), (500, []))'),
        check('independent_events', 'Audit logs belong to individual instances.', 'a = AuditedAccount("A", 500)\nb = AuditedAccount("B", 500)\na.withdraw(10)\nself.assertEqual(b.events, [])'),
        check('alternate_mro', 'Cooperative delegation still works with reversed mixin order.', 'class Reordered(LimitMixin, AuditMixin, Account):\n    pass\na = Reordered("R", 500, limit=100)\na.withdraw(100)\nself.assertEqual((a.balance, a.events), (400, [("withdraw", 100)]))'),
      ],
    }),
  ],
}
