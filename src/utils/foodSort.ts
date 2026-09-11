/**
 * Comparator to sort food items:
 * 1. Category "Makanan" first, sorted alphabetically by food name.
 * 2. Other categories sorted alphabetically by category name, then by food name within each category.
 * 3. Items without category placed at the end, sorted alphabetically by food name.
 */
export function compareFoodItems<
  T extends { name: string; foodCategory?: { name?: string | null } | null }
>(a: T, b: T): number {
  const catA = a.foodCategory?.name?.trim() || "";
  const catB = b.foodCategory?.name?.trim() || "";

  const isMakananA = catA.toLowerCase() === "makanan";
  const isMakananB = catB.toLowerCase() === "makanan";

  // 1. FoodCategory "Makanan" comes first
  if (isMakananA && !isMakananB) return -1;
  if (!isMakananA && isMakananB) return 1;

  // 2. If both are "Makanan", sort by food name
  if (isMakananA && isMakananB) {
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  }

  // 3. For other categories: sort by category name first
  if (catA !== catB) {
    if (!catA) return 1; // Items without category placed at the end
    if (!catB) return -1;
    const catComp = catA.localeCompare(catB, undefined, {
      sensitivity: "base",
    });
    if (catComp !== 0) return catComp;
  }

  // Within the same category (or both uncategorized), sort by food name
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function sortFoodItems<
  T extends { name: string; foodCategory?: { name?: string | null } | null }
>(items: T[]): T[] {
  return [...items].sort(compareFoodItems);
}
