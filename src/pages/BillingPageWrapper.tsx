import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import BillingPage from "./BillingPage";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { Order } from "../types/Order";
import { RawOrder, RawOrderItem, RawOption } from "../types/RawOrder";

function mapOrderResponse(raw: RawOrder): Order {
  return {
    id: raw.id,
    outletName: raw.outlet?.name ?? "Unknown Outlet",
    orderNumber: raw.orderNumber,
    status: raw.status as Order["status"],
    remark: raw.remark,
    customerName: raw.customerName,
    onlineCode: raw.onlineCode,
    tableNumber: raw.diningTable?.number?.toString(),
    waiterName: raw.waiter?.username ?? "-",
    items: Array.isArray(raw.items)
      ? raw.items.map((item: RawOrderItem) => ({
          id: item.id,
          foodName: item.food?.name ?? "Unknown",
          foodCategoryName: item.food?.foodCategory?.name ?? "Other",
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? 0,
          totalPrice: item.totalPrice ?? 0,
          status: item.status,
          options: Array.isArray(item.options)
            ? item.options.map((opt: RawOption) => ({
                id: opt.id,
                name: opt.option?.name ?? "Option Name Not Found",
                quantity: opt.quantity,
                unitPrice: opt.unitPrice ?? 0,
                totalPrice: opt.totalPrice ?? 0,
                status: opt.status,
              }))
            : [],
        }))
      : [],
    waiterId: raw.waiterId || raw.waiter?.id || "",
    subtotal: raw.subtotal ?? 0,
    tax: raw.tax ?? 0,
    discount: raw.discount ?? 0,
    total: raw.total ?? 0,
    orderType: raw.orderType ?? { id: "", name: "Unknown" },
    orderTypeDiscountPercentage: raw.orderTypeDiscountPercentage ?? undefined, // Assuming this is included in the raw data
  };
}

export default function BillingPageWrapper() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchWithAuth(`/api/fetchOrder/${orderId}`)
        .then((res) => res.json())
        .then((data) => setOrder(mapOrderResponse(data)));
    }
  }, [orderId]);

  if (!order) return <div>Loading...</div>;
  return <BillingPage order={order} />;
}
