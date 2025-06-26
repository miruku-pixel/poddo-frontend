export interface Billing {
  id: string;
  orderId: string;
  orderNumber: string;
  entityId: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  changeGiven: number;
  paymentType: string;
  cashierId: string;
  cashier: {
    id: string;
    username: string;
  };
  receiptNumber: string;
  remark?: string;
  createdAt: string;
  paidAt: string;
}
