import { useEffect, useState, useCallback } from "react";
import { Order } from "../types/Order";
import OrderStatus from "../components/OrderStatus";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { User } from "../types/User";
import { UserRole } from "../types/User";
import { RawOrder, RawOrderItem, RawOption } from "../types/RawOrder";

interface OrderStatusProps {
  user: User | null; // Receive the user prop
  UserRole?: UserRole | null;
}

const mapOrderResponse = (raw: RawOrder): Order => {
  return {
    id: raw.id,
    orderNumber: raw.orderNumber,
    status: raw.status as Order["status"],
    remark: raw.remark,
    tableNumber: raw.diningTable?.number?.toString(),
    customerName: raw.customerName,
    onlineCode: raw.onlineCode,
    waiterName: raw.waiter?.username ?? "-",
    items: Array.isArray(raw.items)
      ? raw.items.map((item: RawOrderItem) => ({
          id: item.id,
          foodName: item.food?.name ?? "Unknown",
          foodCategoryName: item.food?.foodCategory?.name ?? "Other",
          quantity: item.quantity,
          status: item.status,
          options: Array.isArray(item.options)
            ? item.options.map((opt: RawOption) => ({
                id: opt.id,
                name: opt.option?.name ?? "Option Name Not Found",
                quantity: opt.quantity,
                status: opt.status,
                unitPrice: 0, // <-- add this
                totalPrice: 0, // <-- add this
              }))
            : [],
          unitPrice: 0, // Provide a default value or map from raw if available
          totalPrice: 0, // Provide a default value or map from raw if available
        }))
      : [],
    waiterId: raw.waiterId || raw.waiter?.id || "",
    subtotal: raw.subtotal ?? 0,
    tax: raw.tax ?? 0,
    discount: raw.discount ?? 0,
    total: raw.total ?? 0,
    orderType: raw.orderType ?? { id: "", name: "Unknown" },
  };
};

export default function StatusPage({ user }: OrderStatusProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefreshOrders = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (user?.outletId) {
      const fetchOrders = async () => {
        try {
          const response = await fetchWithAuth(
            `/api/status?outletId=${user.outletId}&refreshKey=${refreshKey}`,
            { method: "GET" }
          );
          if (!response.ok) throw new Error("Failed to fetch");
          const rawData = await response.json();
          setOrders(rawData.map(mapOrderResponse));
        } catch (error) {
          console.error("Error fetching orders:", error);
          alert("Failed to load orders");
          setOrders([]);
        } finally {
          setLoading(false);
        }
      };
      fetchOrders();
    }
  }, [user?.outletId, refreshKey]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl text-white font-semibold mb-4">Active Orders</h1>

      <OrderStatus
        orders={orders}
        currentUserId={user?.id}
        currentUserRole={user?.role}
        onStatusUpdateSuccess={handleRefreshOrders}
      />
    </div>
  );
}
