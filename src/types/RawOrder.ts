export type RawOrder = {
  id: string;
  outlet?: {
    name?: string;
  };
  orderNumber: string;
  status: string;
  remark?: string;
  customerName?: string;
  onlineCode?: string;
  diningTable?: {
    number?: number;
  };
  waiter?: {
    username?: string;
    id?: string;
  };
  items?: RawOrderItem[];
  orderType?: { id: string; name: string };
  waiterId?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  orderTypeDiscountPercentage?: number | null; // Percentage discount for the order type
};

export type RawOrderItem = {
  id: string;
  food?: {
    name?: string;
    foodCategory?: { id: string; name: string };
  };
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  options?: RawOption[];
  status: "ACTIVE" | "CANCELED";
};

export type RawOption = {
  id: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  option?: {
    name?: string;
  };
  status: "ACTIVE" | "CANCELED";
};
