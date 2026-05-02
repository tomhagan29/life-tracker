export type WealthAccountType = "current" | "savings" | "credit" | "investment";

export type WealthAccountBalance = {
  type: WealthAccountType;
  balance: number;
};

export function getNetWorthBalance(account: WealthAccountBalance) {
  // Credit balances are stored signed: negative means debt, positive means an
  // overpayment or refund that should add to net worth.
  return account.balance;
}

export function getCreditDebt(balance: number) {
  return balance < 0 ? Math.abs(balance) : 0;
}
