import { accountCode, exercise, check } from './helpers.js'
import { savingsCode } from './inheritance.js'

const policies = `from abc import ABC, abstractmethod

class WithdrawalPolicy(ABC):
    @abstractmethod
    def total(self, amount):
        """Return the debit in integer cents, including any fee."""
        raise NotImplementedError

class NoFee(WithdrawalPolicy):
    def total(self, amount):
        Account._validate_amount(amount)
        return amount

class FlatFee(WithdrawalPolicy):
    def __init__(self, fee):
        if type(fee) is not int or fee < 0:
            raise ValueError("invalid fee")
        self.fee = fee

    def total(self, amount):
        Account._validate_amount(amount)
        return amount + self.fee

`
const interfaces = `from typing import Protocol

class BalanceReader(Protocol):
    @property
    def balance(self) -> int: ...

class PricingPolicy(Protocol):
    def total(self, amount: int) -> int: ...

`
const quote = `def quote_withdrawal(account: BalanceReader, policy: PricingPolicy, amount: int) -> int:
    Account._validate_amount(amount)
    total = policy.total(amount)
    if type(total) is not int or total < amount:
        raise ValueError("invalid policy total")
    if total > account.balance:
        raise ValueError("insufficient funds")
    return total

`
const serviceSetup = `from dataclasses import dataclass

class NotificationError(Exception):
    pass

@dataclass(frozen=True)
class Receipt:
    total: int
    balance: int
    notified: bool

class WithdrawalService:
    def __init__(self, policy: PricingPolicy, notifier):
        self.policy = policy
        self.notifier = notifier

`

export default {
  id: 'polymorphism', title: 'Polymorphism', subtitle: 'One contract, many behaviors',
  description: 'Connect the bank to different account types and pricing plugins. Progress from duck typing to ABCs, Protocols, and a composed service with explicit failure semantics.',
  createdAt: '2026-11-13T17:00:00Z', order: 3, tags: ['Python', 'OOP', 'Polymorphism', 'Design patterns'],
  level: 'Basic → Advanced', duration: '65 min', prerequisites: ['inheritance'],
  exercises: [
    exercise({ id: 'duck-typing', title: 'Many accounts, one report', level: 'Basic', duration: '10 min',
      intro: 'The bank now has ordinary and savings accounts. Build one report for both, and for a future partner’s account that does not inherit from your classes.',
      concepts: [
        { title: 'Depend on behavior', text: 'Polymorphism means the same operation can work with objects of different types. Duck typing asks whether an object supports the required operation, rather than checking its family tree. Here the common interface is the balance property.' },
        { title: 'Small contracts travel well', text: 'A report only needs to read balances; it should not demand deposit, withdraw, or a specific Account class. A narrow interface makes adapters, plugins, and test doubles easier to write.' },
      ],
      tasks: [{ title: 'Add the balances', text: 'Implement total_balances(accounts). Return the sum of each object’s integer balance property without modifying any account. Support lists, generators, and the empty iterable (return 0). Do not branch on concrete types.' }],
      mistakes: ['Using type(account) is Account rejects savings accounts and third-party adapters.', 'Iterating twice consumes a generator on the first pass.'],
      practices: ['Prefer the smallest interface the caller needs. Let a missing balance raise AttributeError rather than silently pretending the balance is zero.'],
      starterCode: accountCode + savingsCode + 'def total_balances(accounts):\n    pass\n',
      solutionCode: accountCode + savingsCode + 'def total_balances(accounts):\n    return sum(account.balance for account in accounts)\n',
      takeaway: 'Reporting can accept unrelated types. Next, define an explicit contract for interchangeable fee policies.',
      cases: [
        check('mixed_accounts', 'Ordinary and savings accounts use one operation.', 'a = Account("A", 100)\nb = SavingsAccount("S", 200)\nself.assertEqual(total_balances([a, b]), 300)\nself.assertEqual((a.balance, b.balance), (100, 200))'),
        check('structural', 'Unrelated objects with the same interface are accepted.', 'class Partner:\n    balance = 75\nself.assertEqual(total_balances([Partner()]), 75)'),
        check('generator', 'A single-pass iterable is supported.', 'self.assertEqual(total_balances(Account(str(i), i) for i in range(4)), 6)'),
        check('empty', 'An empty report totals zero.', 'self.assertEqual(total_balances([]), 0)'),
        check('missing_interface', 'Missing interfaces fail visibly.', 'with self.assertRaises(AttributeError):\n    total_balances([object()])'),
      ],
    }),
    exercise({ id: 'abstract-policies', title: 'Make the contract explicit', level: 'Intermediate', duration: '15 min',
      intro: 'The fee-account override changed what callers could safely assume. Move fee calculation out of the account hierarchy: a pricing policy quotes a total, while Account retains the same withdrawal behavior.',
      concepts: [
        { title: 'Nominal contracts with ABCs', text: 'An abstract base class (ABC) requires subclasses to implement abstract methods before instantiation. A missing implementation raises TypeError. An ABC cannot prove correct behavior: tests must still enforce the contract.' },
        { title: 'Substitutability includes semantics', text: 'Every policy accepts the same positive integer amount and returns an integer total at least that large. NoFee and FlatFee vary pricing without surprising callers about which values are accepted.' },
      ],
      tasks: [
        { title: 'Declare the abstraction', text: 'Mark WithdrawalPolicy.total with @abstractmethod. Keep the abstract class non-instantiable.' },
        { title: 'Implement two policies', text: 'NoFee.total(amount) returns amount; FlatFee.total(amount) returns amount + self.fee. Both must call Account._validate_amount first. Do not mutate an account.' },
      ],
      mistakes: ['An abstract method with an implementation is still abstract until overridden.', 'A compatible signature does not guarantee compatible behavior; every implementation must uphold validation and return-value guarantees.'],
      practices: ['Use an ABC when you control implementations and want explicit opt-in. Keep pricing calculations pure so they are easy to test and review.'],
      starterCode: accountCode + `from abc import ABC, abstractmethod

class WithdrawalPolicy(ABC):
    # Add the abstractmethod decorator.
    def total(self, amount):
        raise NotImplementedError

class NoFee(WithdrawalPolicy):
    def total(self, amount):
        pass

class FlatFee(WithdrawalPolicy):
    def __init__(self, fee):
        if type(fee) is not int or fee < 0:
            raise ValueError("invalid fee")
        self.fee = fee

    def total(self, amount):
        pass
`,
      solutionCode: accountCode + policies,
      takeaway: 'ABCs help owned implementations agree on a contract. Next, accept external plugins without forcing inheritance.',
      cases: [
        check('abstract', 'Incomplete policies cannot be instantiated.', 'with self.assertRaises(TypeError):\n    WithdrawalPolicy()\nclass Missing(WithdrawalPolicy):\n    pass\nwith self.assertRaises(TypeError):\n    Missing()'),
        check('no_fee', 'The no-fee policy returns the original amount.', 'self.assertEqual(NoFee().total(100), 100)'),
        check('flat_fee', 'Flat-fee pricing includes the fee and accepts zero fee.', 'self.assertEqual(FlatFee(10).total(100), 110)\nself.assertEqual(FlatFee(0).total(100), 100)'),
        check('shared_contract', 'Every policy rejects invalid amounts.', 'for policy in (NoFee(), FlatFee(10)):\n    for amount in (0, -1, True, 1.5, "100"):\n        with self.assertRaises(ValueError):\n            policy.total(amount)'),
        check('pure', 'Repeated pricing is deterministic and does not accumulate a fee.', 'p = FlatFee(10)\nself.assertEqual([p.total(100), p.total(100)], [110, 110])'),
      ],
    }),
    exercise({ id: 'structural-plugins', title: 'Welcome plugins with Protocols', level: 'Advanced', duration: '18 min',
      intro: 'A partner offers a pricing plugin that cannot inherit your ABC. Accept its behavior through a Protocol and validate the result at the boundary, before any money moves.',
      concepts: [
        { title: 'Structural typing', text: 'typing.Protocol describes an interface that static tools such as mypy or Pyright can check without inheritance. It does not automatically validate values or enforce types at runtime. We do not run a static type checker in this browser exercise.' },
        { title: 'Validate at the trust boundary', text: 'The supplied BalanceReader and PricingPolicy keep dependencies small. quote_withdrawal accepts any compatible object, checks plugin output, and returns the proposed debit without mutating state. Avoid runtime isinstance checks that exclude useful adapters.' },
      ],
      tasks: [
        { title: 'Quote a transaction', text: 'Complete quote_withdrawal(account, policy, amount). Validate amount using Account._validate_amount, then call policy.total(amount) exactly once.' },
        { title: 'Reject bad plugins and overdrafts', text: 'Raise ValueError("invalid policy total") if the quoted total is not an int (bool is invalid) or is less than amount. Raise ValueError("insufficient funds") if total exceeds account.balance. Otherwise return total. Do not withdraw any funds.' },
      ],
      mistakes: ['Type hints do not prevent a plugin returning None or True.', 'Calling the pricing plugin twice may give different answers or duplicate side effects.'],
      practices: ['Use Protocols at package boundaries when implementations are owned elsewhere. Runtime validation and static checks complement each other; neither replaces contract tests.'],
      starterCode: accountCode + policies + interfaces + 'def quote_withdrawal(account: BalanceReader, policy: PricingPolicy, amount: int) -> int:\n    pass\n',
      solutionCode: accountCode + policies + interfaces + quote,
      takeaway: 'You can now use both owned policies and structural plugins. Finally, compose them into one service with clear post-debit failure handling.',
      cases: [
        check('quote', 'A quote includes the fee but never debits the balance.', 'a = Account("A", 200)\nself.assertEqual(quote_withdrawal(a, FlatFee(10), 100), 110)\nself.assertEqual(a.balance, 200)'),
        check('external_plugin', 'Structural implementations need no inheritance.', 'class PartnerAccount:\n    balance = 500\nclass PartnerPolicy:\n    def total(self, amount):\n        return amount + 5\nself.assertEqual(quote_withdrawal(PartnerAccount(), PartnerPolicy(), 100), 105)'),
        check('bad_total', 'Invalid plugin results are rejected before state changes.', 'class Bad:\n    def __init__(self, value):\n        self.value = value\n    def total(self, amount):\n        return self.value\na = Account("A", 500)\nfor value in (None, True, 1.5, -1, 99):\n    with self.assertRaisesRegex(ValueError, "invalid policy total"):\n        quote_withdrawal(a, Bad(value), 100)\nself.assertEqual(a.balance, 500)'),
        check('insufficient', 'An unaffordable total fails even if the amount alone fits.', 'with self.assertRaisesRegex(ValueError, "insufficient funds"):\n    quote_withdrawal(Account("A", 100), FlatFee(10), 100)'),
        check('single_call', 'Invalid amounts never reach a plugin; valid quotes call it once.', 'class Counting:\n    calls = 0\n    def total(self, amount):\n        self.calls += 1\n        return amount\np = Counting()\nwith self.assertRaises(ValueError):\n    quote_withdrawal(Account("A", 100), p, 0)\nself.assertEqual(p.calls, 0)\nself.assertEqual(quote_withdrawal(Account("A", 100), p, 100), 100)\nself.assertEqual(p.calls, 1)'),
      ],
    }),
    exercise({ id: 'composed-service', title: 'Compose a reliable bank service', level: 'Advanced', duration: '22 min',
      intro: 'Bring the path together: a stable account, interchangeable pricing, and a replaceable notifier. Avoid a new subclass for every account × fee × notification combination.',
      concepts: [
        { title: 'Composition separates independent choices', text: 'WithdrawalService receives a policy and notifier instead of inheriting them. A notifier supports send(message). The service coordinates behavior; Account still owns its balance and validation.' },
        { title: 'A notification failure is not a failed debit', text: 'Once the account is debited, a notification outage must not invite a blind retry of the money operation. Return an immutable Receipt recording the debit and notification status. Catch only the expected NotificationError; do not hide programming errors.' },
        { title: 'Where this stops being production-ready', text: 'This in-memory exercise has no database transaction, concurrency control, durable outbox, or idempotency key. A large financial service needs those boundaries so retries and concurrent withdrawals cannot double-charge. Never “roll back” money with an ad hoc compensating deposit after a notification failure.' },
      ],
      tasks: [
        { title: 'Coordinate one debit', text: 'Implement WithdrawalService.withdraw(account, amount). Use quote_withdrawal, then account.withdraw(total) exactly once. If validation or debit fails, do not send any notification.' },
        { title: 'Notify after success', text: 'Send exactly f"Debited {total} cents" through self.notifier.send(message). Return Receipt(total, account.balance, True). If send raises NotificationError, keep the debit and return Receipt(total, account.balance, False).' },
      ],
      mistakes: ['Notifying before the debit can announce a transaction that failed.', 'Catching Exception hides unrelated bugs. Retrying the entire service call after a notification outage can double-debit.'],
      practices: ['Inject small collaborators rather than creating a subclass matrix. Test every collaborator’s failure boundary. Use an outbox and idempotency keys when implementing a durable real service.'],
      starterCode: accountCode + policies + interfaces + quote + serviceSetup + '    def withdraw(self, account, amount):\n        pass\n',
      solutionCode: accountCode + policies + interfaces + quote + serviceSetup + `    def withdraw(self, account, amount):
        total = quote_withdrawal(account, self.policy, amount)
        account.withdraw(total)
        try:
            self.notifier.send(f"Debited {total} cents")
        except NotificationError:
            return Receipt(total, account.balance, False)
        return Receipt(total, account.balance, True)
`,
      takeaway: 'You built one connected bank from protected state to reusable subclasses to a composed service. Interfaces keep the pieces replaceable; explicit contracts and failure semantics keep them understandable.',
      cases: [
        check('receipt', 'Successful debit returns an immutable receipt and one message.', 'class Notifier:\n    def __init__(self):\n        self.messages = []\n    def send(self, message):\n        self.messages.append(message)\na = Account("A", 500)\nn = Notifier()\nr = WithdrawalService(FlatFee(10), n).withdraw(a, 100)\nself.assertEqual(r, Receipt(110, 390, True))\nself.assertEqual(n.messages, ["Debited 110 cents"])\nwith self.assertRaises(AttributeError):\n    r.total = 0'),
        check('rejected', 'Rejection changes neither money nor notification state.', 'class Notifier:\n    def send(self, message):\n        raise AssertionError("must not notify")\na = Account("A", 100)\nwith self.assertRaises(ValueError):\n    WithdrawalService(FlatFee(10), Notifier()).withdraw(a, 100)\nself.assertEqual(a.balance, 100)'),
        check('notification_outage', 'A known notification outage reports the completed debit.', 'class Offline:\n    def send(self, message):\n        raise NotificationError("offline")\na = Account("A", 500)\nr = WithdrawalService(NoFee(), Offline()).withdraw(a, 100)\nself.assertEqual(r, Receipt(100, 400, False))\nself.assertEqual(a.balance, 400)'),
        check('single_debit', 'Pricing and debit occur exactly once and before notification.', 'events = []\nclass Policy:\n    def total(self, amount):\n        events.append("quote")\n        return amount\nclass Observed(Account):\n    def withdraw(self, amount):\n        events.append("debit")\n        super().withdraw(amount)\nclass Notifier:\n    def send(self, message):\n        events.append("notify")\nWithdrawalService(Policy(), Notifier()).withdraw(Observed("A", 500), 100)\nself.assertEqual(events, ["quote", "debit", "notify"])'),
        check('debit_failure', 'A failing debit never notifies even after a valid quote.', 'class Unavailable(Account):\n    def withdraw(self, amount):\n        raise RuntimeError("ledger offline")\nclass Notifier:\n    def send(self, message):\n        raise AssertionError("must not notify")\nwith self.assertRaisesRegex(RuntimeError, "ledger offline"):\n    WithdrawalService(NoFee(), Notifier()).withdraw(Unavailable("A", 500), 100)'),
        check('unexpected_error', 'Programming errors in a notifier are not silently swallowed.', 'class Buggy:\n    def send(self, message):\n        raise TypeError("bug")\na = Account("A", 500)\nwith self.assertRaises(TypeError):\n    WithdrawalService(NoFee(), Buggy()).withdraw(a, 100)\nself.assertEqual(a.balance, 400)'),
      ],
    }),
  ],
}
