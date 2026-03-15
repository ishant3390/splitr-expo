import type { LucideIcon } from "lucide-react-native";
import {
  Utensils,
  Pizza,
  Coffee,
  Beer,
  Sandwich,
  IceCream,
  Car,
  CarTaxiFront,
  Bus,
  Plane,
  Train,
  Fuel,
  ParkingCircle,
  Home,
  Hotel,
  Bed,
  Building,
  Gamepad2,
  Film,
  Music,
  Ticket,
  Tv,
  ShoppingBag,
  ShoppingCart,
  Store,
  Heart,
  Pill,
  Dumbbell,
  Stethoscope,
  CreditCard,
  Receipt,
  TrendingUp,
  PiggyBank,
  Briefcase,
  Laptop,
  Gift,
  PartyPopper,
  Wifi,
  Zap,
  Droplets,
  Phone,
  PawPrint,
  GraduationCap,
  BookOpen,
  Shirt,
  Repeat,
  ShieldCheck,
  Pencil,
  MoreHorizontal,
  PlusCircle,
  Trash2,
  UserPlus,
  UserMinus,
  Handshake,
  Users,
  Banknote,
  Smartphone,
  Building2,
  Wallet,
  Archive,
  ArchiveRestore,
} from "lucide-react-native";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CategoryIconConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  darkBg?: string;
  label: string;
}

// ─── Category Icon Map ──────────────────────────────────────────────────────
// 13 color-coded groups mapping backend icon name strings to icon configs.

export const CATEGORY_ICON_MAP: Record<string, CategoryIconConfig> = {
  // Food (amber)
  restaurant:       { icon: Utensils,     color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Restaurant" },
  food_and_drink:   { icon: Utensils,     color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Food & Drink" },
  food:             { icon: Utensils,     color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Food" },
  fastfood:         { icon: Pizza,        color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Fast Food" },
  pizza:            { icon: Pizza,        color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Pizza" },
  local_cafe:       { icon: Coffee,       color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Cafe" },
  coffee:           { icon: Coffee,       color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Coffee" },
  local_bar:        { icon: Beer,         color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Bar" },
  bar:              { icon: Beer,         color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Bar" },
  groceries:        { icon: ShoppingCart,  color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Groceries" },
  local_grocery_store: { icon: ShoppingCart, color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Groceries" },
  sandwich:         { icon: Sandwich,     color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Sandwich" },
  dessert:          { icon: IceCream,     color: "#d97706", bg: "#fef3c7", darkBg: "#451a03", label: "Dessert" },

  // Transport (blue)
  directions_car:   { icon: Car,          color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Car" },
  transport:        { icon: Car,          color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Transport" },
  car:              { icon: Car,          color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Car" },
  bus:              { icon: Bus,          color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Bus" },
  flight:           { icon: Plane,        color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Flight" },
  travel:           { icon: Plane,        color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Travel" },
  train:            { icon: Train,        color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Train" },
  gas:              { icon: Fuel,         color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Gas" },
  fuel:             { icon: Fuel,         color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Fuel" },
  parking:          { icon: ParkingCircle, color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Parking" },
  taxi:             { icon: CarTaxiFront, color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Taxi" },
  rideshare:        { icon: CarTaxiFront, color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Rideshare" },
  uber:             { icon: CarTaxiFront, color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Uber" },
  lyft:             { icon: CarTaxiFront, color: "#2563eb", bg: "#dbeafe", darkBg: "#172554", label: "Lyft" },

  // Home (violet)
  accommodation:    { icon: Home,         color: "#7c3aed", bg: "#ede9fe", darkBg: "#2e1065", label: "Accommodation" },
  home:             { icon: Home,         color: "#7c3aed", bg: "#ede9fe", darkBg: "#2e1065", label: "Home" },
  house:            { icon: Home,         color: "#7c3aed", bg: "#ede9fe", darkBg: "#2e1065", label: "Home" },
  hotel:            { icon: Hotel,        color: "#7c3aed", bg: "#ede9fe", darkBg: "#2e1065", label: "Hotel" },
  bed:              { icon: Bed,          color: "#7c3aed", bg: "#ede9fe", darkBg: "#2e1065", label: "Lodging" },
  rent:             { icon: Building,     color: "#7c3aed", bg: "#ede9fe", darkBg: "#2e1065", label: "Rent" },

  // Entertainment (pink)
  sports_esports:   { icon: Gamepad2,     color: "#db2777", bg: "#fce7f3", darkBg: "#500724", label: "Gaming" },
  entertainment:    { icon: Gamepad2,     color: "#db2777", bg: "#fce7f3", darkBg: "#500724", label: "Entertainment" },
  movie:            { icon: Film,         color: "#db2777", bg: "#fce7f3", darkBg: "#500724", label: "Movie" },
  theaters:         { icon: Film,         color: "#db2777", bg: "#fce7f3", darkBg: "#500724", label: "Theater" },
  music:            { icon: Music,        color: "#db2777", bg: "#fce7f3", darkBg: "#500724", label: "Music" },
  concert:          { icon: Ticket,       color: "#db2777", bg: "#fce7f3", darkBg: "#500724", label: "Concert" },
  streaming:        { icon: Tv,           color: "#db2777", bg: "#fce7f3", darkBg: "#500724", label: "Streaming" },

  // Shopping (orange)
  shopping_bag:     { icon: ShoppingBag,  color: "#ea580c", bg: "#ffedd5", darkBg: "#431407", label: "Shopping" },
  shopping:         { icon: ShoppingBag,  color: "#ea580c", bg: "#ffedd5", darkBg: "#431407", label: "Shopping" },
  shopping_cart:    { icon: ShoppingCart,  color: "#ea580c", bg: "#ffedd5", darkBg: "#431407", label: "Shopping" },
  store:            { icon: Store,        color: "#ea580c", bg: "#ffedd5", darkBg: "#431407", label: "Store" },

  // Health (red)
  health:           { icon: Heart,        color: "#dc2626", bg: "#fee2e2", darkBg: "#450a0a", label: "Health" },
  local_hospital:   { icon: Stethoscope,  color: "#dc2626", bg: "#fee2e2", darkBg: "#450a0a", label: "Hospital" },
  fitness_center:   { icon: Dumbbell,     color: "#dc2626", bg: "#fee2e2", darkBg: "#450a0a", label: "Fitness" },
  pharmacy:         { icon: Pill,         color: "#dc2626", bg: "#fee2e2", darkBg: "#450a0a", label: "Pharmacy" },
  medical:          { icon: Stethoscope,  color: "#dc2626", bg: "#fee2e2", darkBg: "#450a0a", label: "Medical" },

  // Finance (emerald)
  payments:         { icon: CreditCard,   color: "#059669", bg: "#d1fae5", darkBg: "#022c22", label: "Payments" },
  receipt:          { icon: Receipt,      color: "#059669", bg: "#d1fae5", darkBg: "#022c22", label: "Receipt" },
  investment:       { icon: TrendingUp,   color: "#059669", bg: "#d1fae5", darkBg: "#022c22", label: "Investment" },
  savings:          { icon: PiggyBank,    color: "#059669", bg: "#d1fae5", darkBg: "#022c22", label: "Savings" },
  subscription:     { icon: Repeat,       color: "#059669", bg: "#d1fae5", darkBg: "#022c22", label: "Subscription" },
  insurance:        { icon: ShieldCheck,  color: "#059669", bg: "#d1fae5", darkBg: "#022c22", label: "Insurance" },

  // Work (slate)
  work:             { icon: Briefcase,    color: "#475569", bg: "#f1f5f9", darkBg: "#1e293b", label: "Work" },
  business:         { icon: Briefcase,    color: "#475569", bg: "#f1f5f9", darkBg: "#1e293b", label: "Business" },
  office:           { icon: Laptop,       color: "#475569", bg: "#f1f5f9", darkBg: "#1e293b", label: "Office" },

  // Gifts (fuchsia)
  card_giftcard:    { icon: Gift,         color: "#c026d3", bg: "#fae8ff", darkBg: "#4a044e", label: "Gift Card" },
  gifts:            { icon: Gift,         color: "#c026d3", bg: "#fae8ff", darkBg: "#4a044e", label: "Gifts" },
  gift:             { icon: Gift,         color: "#c026d3", bg: "#fae8ff", darkBg: "#4a044e", label: "Gift" },
  party:            { icon: PartyPopper,  color: "#c026d3", bg: "#fae8ff", darkBg: "#4a044e", label: "Party" },

  // Utilities (sky)
  wifi:             { icon: Wifi,         color: "#0284c7", bg: "#e0f2fe", darkBg: "#082f49", label: "WiFi" },
  utilities:        { icon: Zap,          color: "#0284c7", bg: "#e0f2fe", darkBg: "#082f49", label: "Utilities" },
  electric_bolt:    { icon: Zap,          color: "#0284c7", bg: "#e0f2fe", darkBg: "#082f49", label: "Electric" },
  water_drop:       { icon: Droplets,     color: "#0284c7", bg: "#e0f2fe", darkBg: "#082f49", label: "Water" },
  phone:            { icon: Phone,        color: "#0284c7", bg: "#e0f2fe", darkBg: "#082f49", label: "Phone" },

  // Household (indigo)
  laundry:          { icon: Shirt,        color: "#4f46e5", bg: "#e0e7ff", darkBg: "#1e1b4b", label: "Laundry" },

  // Pets (purple)
  pets:             { icon: PawPrint,     color: "#9333ea", bg: "#f3e8ff", darkBg: "#3b0764", label: "Pets" },

  // Education (cyan)
  school:           { icon: GraduationCap, color: "#0891b2", bg: "#cffafe", darkBg: "#083344", label: "School" },
  education:        { icon: BookOpen,     color: "#0891b2", bg: "#cffafe", darkBg: "#083344", label: "Education" },

  // Default (slate)
  other:            { icon: MoreHorizontal, color: "#64748b", bg: "#f1f5f9", darkBg: "#1e293b", label: "Other" },
  more_horiz:       { icon: MoreHorizontal, color: "#64748b", bg: "#f1f5f9", darkBg: "#1e293b", label: "Other" },
};

const DEFAULT_ICON: CategoryIconConfig = {
  icon: MoreHorizontal,
  color: "#64748b",
  bg: "#f1f5f9",
  darkBg: "#1e293b",
  label: "Other",
};

/**
 * Resolves a backend icon name string to a CategoryIconConfig.
 * - Case-insensitive exact match
 * - Substring fuzzy match for compound keys (e.g. "local_restaurant" → "restaurant")
 * - Falls back to default slate MoreHorizontal icon
 */
export function getCategoryIcon(iconName?: string): CategoryIconConfig {
  if (!iconName) return DEFAULT_ICON;
  const key = iconName.toLowerCase();

  // Exact match
  if (CATEGORY_ICON_MAP[key]) return CATEGORY_ICON_MAP[key];

  // Fuzzy: check if any map key is a substring of the input, or vice versa
  for (const mapKey of Object.keys(CATEGORY_ICON_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return CATEGORY_ICON_MAP[mapKey];
    }
  }

  return DEFAULT_ICON;
}

// ─── Activity Icons ─────────────────────────────────────────────────────────

export const ACTIVITY_ICON_MAP: Record<string, CategoryIconConfig> = {
  expense_created:    { icon: PlusCircle,  color: "#0d9488", bg: "#ccfbf1", label: "Added" },
  expense_updated:    { icon: Pencil,      color: "#f59e0b", bg: "#fef3c7", label: "Updated" },
  expense_deleted:    { icon: Trash2,      color: "#ef4444", bg: "#fee2e2", label: "Deleted" },
  member_joined:      { icon: UserPlus,    color: "#8b5cf6", bg: "#ede9fe", label: "Joined" },
  member_joined_via_invite: { icon: UserPlus, color: "#8b5cf6", bg: "#ede9fe", label: "Joined" },
  member_added:       { icon: UserPlus,    color: "#8b5cf6", bg: "#ede9fe", label: "Added" },
  member_removed:     { icon: UserMinus,   color: "#ef4444", bg: "#fee2e2", label: "Removed" },
  member_left:        { icon: UserMinus,   color: "#ef4444", bg: "#fee2e2", label: "Left" },
  settlement_created: { icon: Handshake,   color: "#059669", bg: "#d1fae5", label: "Settled" },
  group_created:      { icon: Users,       color: "#2563eb", bg: "#dbeafe", label: "Created" },
  group_archived:     { icon: Archive,     color: "#64748b", bg: "#f1f5f9", label: "Archived" },
  group_unarchived:   { icon: ArchiveRestore, color: "#2563eb", bg: "#dbeafe", label: "Unarchived" },
  group_deleted:      { icon: Trash2,      color: "#ef4444", bg: "#fee2e2", label: "Deleted" },
  group_updated:      { icon: Pencil,      color: "#f59e0b", bg: "#fef3c7", label: "Updated" },
};

/**
 * Returns icon config for an activity item.
 * Prefers category icon if a categoryName is available, otherwise uses activity type icon.
 */
export function getActivityIcon(
  type: string,
  categoryName?: string
): CategoryIconConfig {
  if (categoryName) {
    const catIcon = getCategoryIcon(categoryName);
    if (catIcon !== DEFAULT_ICON) return catIcon;
  }
  return ACTIVITY_ICON_MAP[type] ?? DEFAULT_ICON;
}

// ─── Payment Method Icons ───────────────────────────────────────────────────

export const PAYMENT_METHOD_ICON_MAP: Record<string, CategoryIconConfig> = {
  cash:            { icon: Banknote,    color: "#059669", bg: "#d1fae5", label: "Cash" },
  venmo:           { icon: Smartphone,  color: "#7c3aed", bg: "#ede9fe", label: "Venmo" },
  zelle:           { icon: Zap,         color: "#2563eb", bg: "#dbeafe", label: "Zelle" },
  paypal:          { icon: CreditCard,  color: "#2563eb", bg: "#dbeafe", label: "PayPal" },
  bank_transfer:   { icon: Building2,   color: "#475569", bg: "#f1f5f9", label: "Bank" },
  other:           { icon: Wallet,      color: "#64748b", bg: "#f1f5f9", label: "Other" },
};

const DEFAULT_PAYMENT: CategoryIconConfig = {
  icon: Wallet,
  color: "#64748b",
  bg: "#f1f5f9",
  label: "Other",
};

/**
 * Returns icon config and label for a payment method key.
 */
export function getPaymentMethodIcon(key?: string): CategoryIconConfig {
  if (!key) return DEFAULT_PAYMENT;
  return PAYMENT_METHOD_ICON_MAP[key.toLowerCase()] ?? DEFAULT_PAYMENT;
}
