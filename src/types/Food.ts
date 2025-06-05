/** Category to which the food belongs */
export type FoodCategory = {
  id: string;
  name: string;
};

/** Option that can be added to a food item */
export type FoodOption = {
  quantity: number;
  selected: unknown;
  id: string;
  name: string;
  available: boolean;
  extraPrice: number;
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
