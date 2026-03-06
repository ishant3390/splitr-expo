// ---- User ----

export interface UserDto {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  defaultCurrency?: string;
  referralCode?: string;
  isPremium?: boolean;
  premiumUntil?: string;
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  notifications?: boolean;
  emailDigest?: string;
  defaultSplitType?: string;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  defaultCurrency?: string;
  preferences?: UserPreferences;
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

/** Raw shape from GET /v1/users/me/balance (multi-currency) */
export interface UserBalanceRawDto {
  totalOwed: CurrencyAmount[];
  totalOwing: CurrencyAmount[];
  groupBalances?: Array<{
    groupId: string;
    groupName: string;
    balanceCents: number;
  }>;
}

/** Normalized single-currency balance used by the UI */
export interface UserBalanceDto {
  totalOwedCents: number;
  totalOwesCents: number;
  netBalanceCents: number;
  groupBalances?: Array<{
    groupId: string;
    groupName: string;
    balanceCents: number;
  }>;
}

export interface UserSummaryDto {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

// ---- Group ----

export interface GroupDto {
  id: string;
  name: string;
  description?: string;
  groupType?: string;
  emoji?: string;
  defaultCurrency?: string;
  simplifyDebts?: boolean;
  inviteCode?: string;
  imageUrl?: string;
  isArchived?: boolean;
  archivedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  version?: number;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  groupType?: string;
  emoji?: string;
  defaultCurrency?: string;
  simplifyDebts?: boolean;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  defaultCurrency?: string;
  simplifyDebts?: boolean;
  isArchived?: boolean;
  version?: number;
}

// ---- Group Members ----

export interface GroupMemberDto {
  id: string;
  user?: UserSummaryDto;
  guestUser?: GuestUserDto;
  role?: string;
  displayName?: string;
  notificationsEnabled?: boolean;
  balance?: number;
  joinedAt?: string;
  leftAt?: string;
}

export interface GuestUserDto {
  id: string;
  name: string;
  email?: string;
}

export interface AddMemberRequest {
  email: string;
  role?: string;
  displayName?: string;
}

export interface AddGuestMemberRequest {
  name: string;
  email?: string;
}

export interface UpdateMemberRequest {
  role?: string;
  displayName?: string;
  notificationsEnabled?: boolean;
}

// ---- Expense ----

export interface ExpenseDto {
  id: string;
  groupId: string;
  description: string;
  amountCents: number;
  currency?: string;
  date: string;
  category?: CategoryDto;
  splitType?: string;
  notes?: string;
  locationName?: string;
  payers: ExpensePayerDto[];
  splits: ExpenseSplitDto[];
  createdBy?: UserSummaryDto;
  createdByGuest?: GuestUserDto;
  inputMetadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export interface CategoryDto {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface ExpensePayerDto {
  id: string;
  user?: UserSummaryDto;
  guestUser?: GuestUserDto;
  amountPaid: number;
}

export interface ExpenseSplitDto {
  id: string;
  user?: UserSummaryDto;
  guestUser?: GuestUserDto;
  splitAmount: number;
  percentage?: number;
  shares?: number;
}

export interface CreateExpenseRequest {
  description: string;
  totalAmount: number;
  currency?: string;
  categoryId?: string;
  expenseDate: string;
  splitType: string;
  notes?: string;
  payers: PayerRequest[];
  splits: SplitRequest[];
  inputMetadata?: Record<string, unknown>;
}

export interface UpdateExpenseRequest {
  description?: string;
  totalAmount?: number;
  currency?: string;
  categoryId?: string;
  expenseDate?: string;
  splitType?: string;
  notes?: string;
  payers?: PayerRequest[];
  splits?: SplitRequest[];
  inputMetadata?: Record<string, unknown>;
  version?: number;
}

export interface PayerRequest {
  userId?: string;
  guestUserId?: string;
  amountPaid: number;
}

export interface SplitRequest {
  userId?: string;
  guestUserId?: string;
  splitAmount?: number;
  percentage?: number;
  shares?: number;
}

export interface ExpenseListResponse {
  data: ExpenseDto[];
  pagination: Pagination;
  summary: ExpenseSummary;
}

export interface Pagination {
  nextCursor?: string;
  hasMore?: boolean;
  totalCount?: number;
}

export interface ExpenseSummary {
  totalCount?: number;
  totals?: CurrencyAmount[];
  /** @deprecated Use totals[] instead */
  totalAmount?: number;
  /** @deprecated Use totals[] instead */
  currency?: string;
}

// ---- Activity ----

export interface ActivityLogDto {
  id: string;
  groupId?: string;
  groupName?: string;
  activityType: string;
  expenseId?: string;
  settlementId?: string;
  actorUserId?: string;
  actorUserName?: string;
  actorGuestId?: string;
  actorGuestName?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// ---- Settlement ----

export interface SettlementDto {
  id: string;
  groupId: string;
  payerUser?: UserSummaryDto;
  payerGuest?: GuestUserDto;
  payeeUser?: UserSummaryDto;
  payeeGuest?: GuestUserDto;
  amount: number;
  currency: string;
  paymentMethod?: string;
  paymentReference?: string;
  settlementDate: string;
  notes?: string;
  createdBy?: UserSummaryDto;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface SettlementSuggestionDto {
  fromUser?: UserSummaryDto;
  fromGuest?: GuestUserDto;
  toUser?: UserSummaryDto;
  toGuest?: GuestUserDto;
  amount: number;
  currency: string;
}

export interface CreateSettlementRequest {
  payerUserId?: string;
  payerGuestUserId?: string;
  payeeUserId?: string;
  payeeGuestUserId?: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  paymentReference?: string;
  settlementDate: string;
  notes?: string;
}

export interface UpdateSettlementRequest {
  payerUserId?: string;
  payerGuestUserId?: string;
  payeeUserId?: string;
  payeeGuestUserId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentReference?: string;
  settlementDate?: string;
  notes?: string;
  version?: number;
}

// ---- Invite / Join ----

export interface GroupInvitePreviewDto {
  groupId: string;
  name: string;
  emoji?: string;
  groupType?: string;
  memberCount: number;
  isArchived?: boolean;
}

export interface JoinGroupRequest {
  inviteCode: string;
}

// ---- Contacts ----

export interface ContactDto {
  userId?: string;
  guestUserId?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isGuest: boolean;
}

// ---- Legacy aliases for backward compat ----

export type ExpenseCategory =
  | "food"
  | "transport"
  | "accommodation"
  | "entertainment"
  | "shopping"
  | "other";
