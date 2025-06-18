/** Category to which the food belongs */
export type FoodCategory = {
  id: string;
  name: string;
};

// NEW: Define FoodOptionCategory type to match Prisma schema
export type FoodOptionCategory = {
  id: string;
  name: string;
  selectionType: string; // e.g., "SINGLE_REQUIRED", "MULTIPLE_OPTIONAL"
  minSelections: number;
  maxSelections?: number | null;
  quantityRule: string; // e.g., "NONE", "MATCH_PARENT_QTY", "CUSTOM_RANGE"
};

/** Option that can be added to a food item */
export type FoodOption = {
  quantity?: number; // Optional quantity for custom range options
  selected?: boolean; // Optional selected state for UI
  id: string;
  name: string;
  available: boolean;
  extraPrice: number;
  foodId: string;
  foodOptionCategory?: FoodOptionCategory | null;
};

/** Pricing based on order type */
export type FoodPrice = {
  id: string;
  price: number;
  orderTypeId: string;
  orderType: {
    id: string;
    name: string;
  };
};

/** Data received from backend */
export type APIFoodItem = {
  id: string;
  name: string;
  available: boolean;
  outletId: string;
  foodCategoryId?: string | null;
  foodCategory?: FoodCategory | null;
  imageUrl?: string;
  options: FoodOption[];
  prices: FoodPrice[];
  createdAt: string;
};

/** Extended option with UI-specific state */
export type UIFoodOption = FoodOption & {
  selected: boolean;
  quantity: number;
};

/** Frontend state used for rendering and managing selection */
export type FoodItem = APIFoodItem & {
  selected: boolean;
  quantity: number;
  options: UIFoodOption[];
};
