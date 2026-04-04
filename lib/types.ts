// ---- Payment Handles ----

export interface PaymentHandles {
  venmoUsername?: string;    // "ajay-w" (no @)
  paypalUsername?: string;   // "ajaywadhara"
  cashAppTag?: string;       // "$ajay" or "ajay"
  upiVpa?: string;           // "ajay@okicici"
  revolutTag?: string;       // "ajay123"
  monzoMe?: string;          // "ajaywadhara"
  zelleContact?: string;     // email or phone
}

// ---- User ----

export interface UserDto {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  profileImageUrl?: string;
  defaultCurrency?: string;
  referralCode?: string;
  isPremium?: boolean;
  premiumUntil?: string;
  preferences?: UserPreferences;
  paymentHandles?: PaymentHandles;
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export interface UserPreferences {
  notifications?: boolean;
  emailDigest?: string;
  defaultSplitType?: string;
  nudgeGraceDays?: number;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  defaultCurrency?: string;
  preferences?: UserPreferences;
  paymentHandles?: PaymentHandles;
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface FxSnapshotDto {
  baseCurrency: string;
  quoteCurrency: string;
  rateSource: string;
  quotedAt: string;
  roundingMode?: string;
  roundingScale?: number;
  rateDecimal?: string;
  rateNumerator?: string;
  rateDenominator?: string;
  providerTimestamp?: string;
  fetchedAt?: string;
  fallbackLevel?: number;
}

export interface ConvertedMinorAmountDto {
  currency: string;
  amountMinor: number;
}

/** Raw shape from GET /v1/users/me/balance (multi-currency) */
export interface UserBalanceRawDto {
  totalOwed: CurrencyAmount[];
  totalOwing: CurrencyAmount[];
  /** Optional deterministic aggregates provided by backend to avoid FE recomputation. */
  totalOwedCents?: number;
  totalOwingCents?: number;
  /** @deprecated Backward-compatible alias for totalOwingCents during rollout. */
  totalOwesCents?: number;
  netBalanceCents?: number;
  normalizedCurrency?: string;
  /** FX-converted net balance in user's default currency (BE-17) */
  netBalanceConverted?: ConvertedBalance;
  groupBalances?: Array<{
    groupId: string;
    groupName: string;
    balanceCents: number;
  }>;
}

/** FX-converted net balance returned by backend (BE-17) */
export interface ConvertedBalance {
  amount: number;
  currency: string;
  isEstimate: boolean;
  ratesAsOf?: string;
}

/** Normalized single-currency balance used by the UI */
export interface UserBalanceDto {
  totalOwedCents: number;
  totalOwesCents: number;
  netBalanceCents: number;
  normalizedCurrency?: string;
  /** FX-converted net balance in user's default currency (BE-17) */
  netBalanceConverted?: ConvertedBalance;
  totalOwedByCurrency?: CurrencyAmount[];
  totalOwingByCurrency?: CurrencyAmount[];
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
  profileImageUrl?: string;
}

// ---- Group ----

export interface GroupDto {
  id: string;
  name: string;
  description?: string;
  groupType?: string;
  emoji?: string;
  defaultCurrency?: string;
  /** Legacy/alternate backend field used by some responses. */
  currency?: string;
  simplifyDebts?: boolean;
  inviteCode?: string;
  imageUrl?: string;
  bannerImageUrl?: string;
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
  version?: number;
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

export interface InviteByEmailRequest {
  email: string;
  name?: string;
}

export interface UpdateMemberRequest {
  role?: string;
  displayName?: string;
  notificationsEnabled?: boolean;
}

export interface InviteByPhoneRequest {
  phone: string;
  name?: string;
}

// ---- Device Contacts Matching ----

export interface DeviceContact {
  name: string;
  email?: string;
  phone?: string;
}

export interface ContactMatchRequest {
  contacts: DeviceContact[];
}

export interface MatchedContact {
  contactIndex: number;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface UnmatchedContact {
  contactIndex: number;
  name: string;
  email?: string;
  phone?: string;
}

export interface ContactMatchResponse {
  matched: MatchedContact[];
  unmatched: UnmatchedContact[];
}

// ---- Expense ----

export interface ExpenseDto {
  id: string;
  groupId: string;
  description: string;
  amountCents: number;
  currency?: string;
  convertedAmount?: ConvertedMinorAmountDto;
  convertedAmountCents?: number;
  convertedCurrency?: string;
  fxSnapshot?: FxSnapshotDto;
  fxSnapshotId?: string;
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
  receiptImageUrl?: string | null;
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
  convertedAmount?: ConvertedMinorAmountDto | number;
  convertedAmountCents?: number;
  convertedCurrency?: string;
  fxSnapshot?: FxSnapshotDto;
  fxSnapshotId?: string;
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
  /** Creditor's payment handles — only populated in settlement suggestions context */
  toUserPaymentHandles?: PaymentHandles;
  /** ISO date of the oldest unsettled expense between the two users in this group */
  oldestExpenseDate?: string;
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

// ---- Cross-Group Settlement ----

export interface CrossGroupSuggestion {
  groupId: string;
  groupName: string;
  currency?: string;
  suggestions: SettlementSuggestionDto[];
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

// ---- Mentions ----

export interface MentionRecord {
  trigger: "@" | "#";
  displayName: string;
  id: string; // "userId:abc" | "guestUserId:abc" | "groupId:abc"
}

// ---- Push Token ----

export interface PushTokenDto {
  id: string;
  token: string;
  deviceId: string;
  deviceName?: string;
  platform: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

export interface RegisterPushTokenRequest {
  token: string;
  deviceId: string;
  deviceName?: string;
  platform: string;
}

// ---- Notification ----

export interface NotificationDto {
  id: string;
  notificationType: string;
  groupId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  deliveryStatus: string;
  createdAt: string;
}

// ---- Receipt Scan ----

export interface ReceiptLineItem {
  description: string;
  amountCents: number;
  quantity?: number;
}

export interface ReceiptConfidence {
  overall: number;
  total: number;
  date: number;
  merchant: number;
  lineItems: number;
}

export interface ReceiptScanResultDto {
  merchant: string | null;
  date: string | null;
  currency: string | null;
  subtotalCents: number | null;
  taxCents: number | null;
  tipCents: number | null;
  totalCents: number;
  lineItems: ReceiptLineItem[];
  confidence: ReceiptConfidence;
  rawText?: string;
}

export interface ReceiptScanResponseDto {
  receipt: ReceiptScanResultDto;
  dailyScansUsed: number;
  dailyScanLimit: number;
}

// ---- Chat ----

export interface ChatGroupOption {
  groupId: string;
  name: string;
  emoji?: string;
  members: string[];
  lastActivity?: string;
}

export interface ChatExpensePreview {
  description: string;
  totalAmountCents: number;
  currency: string;
  groupId: string;
  groupName: string;
  groupEmoji?: string;
  splits: Array<{ name: string; amountCents: number }>;
  payerName: string;
  expenseDate: string;
}

export interface ChatGroupPreview {
  name: string;
  memberNames: string[];
}

export interface ChatActionRequired {
  action: "select_group" | "confirm_expense" | "confirm_create_group";
  requestId: string;
  options?: ChatGroupOption[];
  expensePreview?: ChatExpensePreview;
  groupPreview?: ChatGroupPreview;
}

export interface ChatExpenseCreated {
  id: string;
  groupId: string;
  description: string;
  totalAmountCents: number;
  currency: string;
  groupName: string;
  groupEmoji?: string;
  perPersonCents: number;
  splitCount: number;
}

export interface ChatQuotaDto {
  dailyUsed: number;
  dailyLimit: number;
  resetsAt: string;
  tier: "free" | "premium";
}

export type ChatSSEEvent =
  | { type: "thinking"; conversationId: string }
  | { type: "text_chunk"; content: string; conversationId: string }
  | { type: "text"; content: string; conversationId: string }
  | { type: "action_required"; action: ChatActionRequired; conversationId: string }
  | { type: "expense_created"; expense: ChatExpenseCreated; conversationId: string }
  | { type: "quota"; dailyUsed: number; dailyLimit: number; resetsAt: string }
  | { type: "quota_exceeded"; dailyUsed: number; dailyLimit: number; resetsAt: string; message: string }
  | { type: "error"; message: string; code?: string };

// ---- Legacy aliases for backward compat ----

export type ExpenseCategory =
  | "food"
  | "transport"
  | "accommodation"
  | "entertainment"
  | "shopping"
  | "other";
