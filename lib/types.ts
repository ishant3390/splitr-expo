export interface User {
  id: string
  name: string
  avatar: string
  email?: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  paidBy: User
  splitWith: User[]
  date: string
  category: ExpenseCategory
  groupId: string
}

export interface Group {
  id: string
  name: string
  description?: string
  image?: string
  members: User[]
  expenses: Expense[]
  createdAt: string
}

export type ExpenseCategory =
  | "food"
  | "transport"
  | "accommodation"
  | "entertainment"
  | "shopping"
  | "other"

export interface Balance {
  user: User
  amount: number // positive = owed to you, negative = you owe them
}
