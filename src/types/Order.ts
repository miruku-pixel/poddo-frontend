export type OrderStatus = "PENDING" | "SERVED" | "CANCELED";

export interface OrderItemOption {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status?: "ACTIVE" | "CANCELED";
}

export interface OrderItem {
  id: string;
  foodName: string;
  foodCategoryName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  options: OrderItemOption[];
  status?: "ACTIVE" | "CANCELED";
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  remark?: string;
  tableNumber?: string;
  customerName?: string;
  onlineCode?: string;
  waiterName: string;
  items: OrderItem[];
  waiterId: string;
  tax: number;
  discount: number;
  subtotal: number;
  total: number;
  orderType?: { id: string; name: string };
  orderTypeDiscountPercentage?: number; // Percentage discount for the order type
}
