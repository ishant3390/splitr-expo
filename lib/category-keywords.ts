// Shared keyword-to-category mapping used by both screen-helpers (category inference)
// and category-icons (icon inference from description). Extracted to avoid circular deps.

export const KEYWORD_TO_CATEGORY: Array<{ keywords: string[]; category: string }> = [
  {
    keywords: ["dinner", "lunch", "breakfast", "pizza", "burger", "coffee", "cafe", "restaurant", "food", "meal", "snack", "drink", "bar", "brunch", "sushi", "taco", "sandwich", "bakery", "dessert", "takeout", "takeaway", "doordash", "ubereats", "grubhub"],
    category: "food",
  },
  {
    keywords: ["uber", "lyft", "taxi", "cab", "gas", "fuel", "parking", "toll", "flight", "train", "bus", "metro", "subway", "transport", "commute", "ferry", "amtrak", "greyhound"],
    category: "transport",
  },
  {
    keywords: ["hotel", "airbnb", "hostel", "motel", "rent", "mortgage", "lodging", "accommodation"],
    category: "accommodation",
  },
  {
    keywords: ["movie", "cinema", "netflix", "concert", "show", "gaming", "ticket", "theater", "theatre", "spotify", "hulu", "disney", "streaming", "entertainment"],
    category: "entertainment",
  },
  {
    keywords: ["grocery", "groceries", "supermarket", "costco", "market", "produce", "walmart", "target", "trader joe", "whole foods", "safeway", "aldi"],
    category: "groceries",
  },
  {
    keywords: ["amazon", "shop", "store", "mall", "clothes", "clothing", "shoes", "outfit", "fashion", "apparel"],
    category: "shopping",
  },
  {
    keywords: ["pharmacy", "doctor", "medicine", "hospital", "clinic", "gym", "fitness", "dental", "dentist", "medical", "prescription", "vitamin", "therapy"],
    category: "health",
  },
  {
    keywords: ["electric", "electricity", "water bill", "internet", "wifi", "phone bill", "cable", "insurance", "utility", "utilities"],
    category: "utilities",
  },
  {
    keywords: ["office", "work", "business", "conference", "meeting", "subscription", "software", "aws", "github", "slack"],
    category: "work",
  },
  {
    keywords: ["tuition", "course", "textbook", "books", "school", "class", "workshop", "training", "education", "udemy", "coursera"],
    category: "education",
  },
];
