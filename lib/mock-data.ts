import type { User, Group, Expense } from "./types"

export const currentUser: User = {
  id: "1",
  name: "You",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  email: "you@email.com",
}

export const users: User[] = [
  currentUser,
  {
    id: "2",
    name: "Sarah",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    id: "3",
    name: "Mike",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
  },
  {
    id: "4",
    name: "Emma",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
  },
  {
    id: "5",
    name: "James",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
  },
]

export const groups: Group[] = [
  {
    id: "1",
    name: "Beach Getaway",
    description: "Weekend trip to Malibu",
    members: [users[0], users[1], users[2], users[3]],
    expenses: [],
    createdAt: "2026-01-15",
  },
  {
    id: "2",
    name: "Movie Night",
    description: "Weekly movie hangout",
    members: [users[0], users[1], users[4]],
    expenses: [],
    createdAt: "2026-01-20",
  },
  {
    id: "3",
    name: "Ski Trip 2026",
    description: "Colorado skiing adventure",
    members: [users[0], users[2], users[3], users[4]],
    expenses: [],
    createdAt: "2026-01-10",
  },
]

export const expenses: Expense[] = [
  {
    id: "1",
    description: "Dinner at Coastal Kitchen",
    amount: 156.5,
    paidBy: users[1],
    splitWith: [users[0], users[1], users[2], users[3]],
    date: "2026-01-22",
    category: "food",
    groupId: "1",
  },
  {
    id: "2",
    description: "Beach umbrella rental",
    amount: 45.0,
    paidBy: users[0],
    splitWith: [users[0], users[1], users[2], users[3]],
    date: "2026-01-22",
    category: "entertainment",
    groupId: "1",
  },
  {
    id: "3",
    description: "Gas for road trip",
    amount: 68.3,
    paidBy: users[2],
    splitWith: [users[0], users[1], users[2], users[3]],
    date: "2026-01-21",
    category: "transport",
    groupId: "1",
  },
  {
    id: "4",
    description: "Movie tickets",
    amount: 45.0,
    paidBy: users[0],
    splitWith: [users[0], users[1], users[4]],
    date: "2026-01-20",
    category: "entertainment",
    groupId: "2",
  },
  {
    id: "5",
    description: "Popcorn & drinks",
    amount: 32.5,
    paidBy: users[1],
    splitWith: [users[0], users[1], users[4]],
    date: "2026-01-20",
    category: "food",
    groupId: "2",
  },
  {
    id: "6",
    description: "Ski passes",
    amount: 480.0,
    paidBy: users[0],
    splitWith: [users[0], users[2], users[3], users[4]],
    date: "2026-01-12",
    category: "entertainment",
    groupId: "3",
  },
  {
    id: "7",
    description: "Cabin rental",
    amount: 850.0,
    paidBy: users[3],
    splitWith: [users[0], users[2], users[3], users[4]],
    date: "2026-01-11",
    category: "accommodation",
    groupId: "3",
  },
]

// Helper function to calculate balances
export function calculateBalances(userId: string): { total: number; details: { user: User; amount: number }[] } {
  let total = 0
  const balanceMap = new Map<string, number>()

  expenses.forEach((expense) => {
    const splitAmount = expense.amount / expense.splitWith.length
    const isUserInSplit = expense.splitWith.some((u) => u.id === userId)

    if (expense.paidBy.id === userId && isUserInSplit) {
      // User paid, others owe them
      expense.splitWith.forEach((u) => {
        if (u.id !== userId) {
          const current = balanceMap.get(u.id) || 0
          balanceMap.set(u.id, current + splitAmount)
          total += splitAmount
        }
      })
    } else if (isUserInSplit && expense.paidBy.id !== userId) {
      // Someone else paid, user owes them
      const current = balanceMap.get(expense.paidBy.id) || 0
      balanceMap.set(expense.paidBy.id, current - splitAmount)
      total -= splitAmount
    }
  })

  const details = Array.from(balanceMap.entries())
    .map(([id, amount]) => ({
      user: users.find((u) => u.id === id)!,
      amount,
    }))
    .filter((b) => Math.abs(b.amount) > 0.01)
    .sort((a, b) => b.amount - a.amount)

  return { total, details }
}

export function getGroupExpenses(groupId: string): Expense[] {
  return expenses.filter((e) => e.groupId === groupId)
}

export function getRecentActivity(limit = 5): Expense[] {
  return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit)
}
