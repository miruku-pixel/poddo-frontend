export type UserRole =
  | "SUPERUSER"
  | "OWNER"
  | "ADMIN"
  | "CASHIER"
  | "CHEF"
  | "WAITER";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  outletId: string;
  outlet: string;
  outletAccess: string[]; // just outlet IDs
}
