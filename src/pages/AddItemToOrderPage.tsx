import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import MenuItemList from "../components/MenuItemList";
import { Order } from "../types/Order";
import { RawOrder, RawOrderItem, RawOption } from "../types/RawOrder";
import { FoodItem, APIFoodItem, UIFoodOption } from "../types/Food";
import { OrderTypes } from "../types/OrderType";
import { User } from "../types/User";
import SuccessMessage from "../components/SuccessMessage";

interface AddItemProps {
  user: User | null;
}

function mapOrderResponse(raw: RawOrder): Order {
  return {
    id: raw.id,
    orderNumber: raw.orderNumber,
    status: raw.status as Order["status"],
    remark: raw.remark,
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
          options: Array.isArray(item.options)
            ? item.options.map((opt: RawOption) => ({
                id: opt.id,
                name: opt.option?.name ?? "Option Name Not Found",
                quantity: opt.quantity,
                unitPrice: opt.unitPrice ?? 0,
                totalPrice: opt.totalPrice ?? 0,
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
  };
}

export default function AddItemToOrderPage({ user }: AddItemProps) {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  const [selectedItems, setSelectedItems] = useState<{
    [id: string]: {
      quantity: number;
      selectedOptions: {
        [optionId: string]: number;
      };
    };
  }>({});

  const fetchMenu = useCallback(
    async (outletId: string, orderTypeId: string) => {
      // Define processFoods inside useCallback to avoid dependency warning
      const processFoods = (foods: APIFoodItem[]): FoodItem[] => {
        return foods.map(
          (f): FoodItem => ({
            ...f,
            selected: false,
            quantity: 1,
            options:
              f.options?.map(
                (opt): UIFoodOption => ({
                  ...opt,
                  selected: false,
                  quantity: 1,
                })
              ) ?? [],
          })
        );
      };

      try {
        const [foodsRes] = await Promise.all([
          fetchWithAuth(
            `/api/foods?outletId=${outletId}&orderTypeId=${orderTypeId}`
          ),
        ]);
        const foods: APIFoodItem[] = await foodsRes.json();

        setMenu(processFoods(foods));
      } catch (error) {
        console.error("Fetching failed:", error);
        alert("Failed to load data.");
      }
    },
    [setMenu]
  );

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth(`/api/fetchOrder/${orderId}`);
        const data = await response.json();
        setOrder(mapOrderResponse(data));
      } catch (err) {
        setError("Failed to fetch order. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (orderSubmitted) {
      const timer = setTimeout(() => setOrderSubmitted(false), 3000); // 3 sec
      return () => clearTimeout(timer);
    }
  }, [orderSubmitted]);

  useEffect(() => {
    fetchWithAuth("/api/orderType")
      .then((res) => res.json())
      .then((types: OrderTypes[]) => {
        console.log("Fetched Order Types:", types); // ✅ Add this line
      });
  }, []);

  useEffect(() => {
    if (user?.outletId && order?.orderType?.id) {
      fetchMenu(user.outletId, order.orderType.id);
    }
  }, [user?.outletId, order?.orderType?.id, fetchMenu]);

  if (loading) return <div className="text-white text-center">Loading...</div>;
  if (error) return <div className="text-red-400 text-center">{error}</div>;
  if (!order)
    return <div className="text-white text-center">Order not found.</div>;

  const handleToggleSelect = (id: string) => {
    setSelectedItems((prev) =>
      id in prev
        ? Object.fromEntries(Object.entries(prev).filter(([key]) => key !== id))
        : {
            ...prev,
            [id]: { quantity: 1, selectedOptions: {} },
          }
    );
  };

  const handleChangeQuantity = (id: string, delta: number) => {
    setSelectedItems((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        const newItems = { ...prev };
        delete newItems[id];
        return newItems;
      }
      return {
        ...prev,
        [id]: { ...item, quantity: newQty },
      };
    });
  };

  const handleToggleOption = (foodId: string, optionId: string) => {
    setSelectedItems((prev) => {
      const item = prev[foodId];
      if (!item) return prev;

      const optionQty = item.selectedOptions[optionId] ?? 0;

      const newOptions = { ...item.selectedOptions };
      if (optionQty > 0) {
        delete newOptions[optionId];
      } else {
        newOptions[optionId] = 1;
      }

      return {
        ...prev,
        [foodId]: { ...item, selectedOptions: newOptions },
      };
    });
  };

  const handleChangeOptionQuantity = (
    foodId: string,
    optionId: string,
    delta: number
  ) => {
    setSelectedItems((prev) => {
      const item = prev[foodId];
      if (!item) return prev;

      const currentQty = item.selectedOptions[optionId] ?? 0;
      const newQty = currentQty + delta;

      const newOptions = { ...item.selectedOptions };
      if (newQty <= 0) {
        delete newOptions[optionId];
      } else {
        newOptions[optionId] = newQty;
      }

      return {
        ...prev,
        [foodId]: { ...item, selectedOptions: newOptions },
      };
    });
  };

  const getDisplayMenu = () => {
    return menu.map((item) => {
      const selection = selectedItems[item.id];
      const isSelected = !!selection;

      const enrichedOptions = (item.options ?? []).map((opt) => ({
        ...opt,
        selected: selection?.selectedOptions[opt.id] > 0,
        quantity: selection?.selectedOptions[opt.id] || 1,
      }));

      return {
        ...item,
        selected: isSelected,
        quantity: selection?.quantity || 1,
        options: enrichedOptions,
      };
    });
  };

  const buildAddItemsPayload = () => {
    return {
      items: Object.entries(selectedItems).map(([foodId, itemData]) => ({
        foodId,
        quantity: itemData.quantity,
        options: Object.entries(itemData.selectedOptions).map(
          ([optionId, quantity]) => ({
            optionId,
            quantity,
          })
        ),
      })),
    };
  };

  const handleUpdateOrder = async () => {
    if (!orderId) return;

    const payload = buildAddItemsPayload();

    if (payload.items.length === 0) {
      alert("No items selected.");
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/orders/${orderId}/add-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to update order:", errorData);
        alert("Failed to update order: " + errorData.error);
        return;
      }

      const resetMenu = menu.map((item) => ({
        ...item,
        selected: false,
        quantity: 1,
        options: item.options.map((opt) => ({
          ...opt,
          selected: false,
          quantity: 1,
        })),
      }));

      setMenu(resetMenu);
      setSelectedItems({});

      const updatedOrder = await fetchWithAuth(`/api/fetchOrder/${orderId}`);
      const data = await updatedOrder.json();
      setOrder(mapOrderResponse(data));

      setOrderSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error updating order:", error);
      alert("An unexpected error occurred.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 bg-gray-800  min-h-screen text-white rounded-xl border border-green-400 shadow">
      {orderSubmitted && <SuccessMessage orderNumber={order.orderNumber} />}
      <h1 className="text-xl font-bold text-green-400 mb-4">
        Order Number:{" "}
        <span className="font-bold text-yellow-300">{order.orderNumber}</span> -{" "}
        {order.orderType?.name}
      </h1>

      <div className="mb-4">
        <div>
          <span className="text-green-300 font-semibold">
            {order.waiterName}
          </span>
        </div>
        <div>
          Table Number:{" "}
          <span className="text-green-300 font-semibold">
            {order.tableNumber ?? "-"}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2 text-green-300">
          Current Items:
        </h2>
        {order.items.map((item) => (
          <div key={item.id} className="mb-2">
            <div>
              - {item.foodName} (Qty: {item.quantity})
            </div>
            {item.options.map((opt) => (
              <div key={opt.id} className="ml-4 text-sm text-gray-300">
                + {opt.name} (Qty: {opt.quantity})
              </div>
            ))}
          </div>
        ))}
      </div>

      <ul className="mt-4 space-y-2 mb-6">
        {getDisplayMenu()
          .filter((item) => item.selected)
          .map((item) => (
            <li key={item.id} className="text-yellow-300">
              - {item.name} (Qty: {item.quantity})
              {item.options.length > 0 && (
                <ul className="ml-4 text-sm text-yellow-300">
                  {item.options
                    .filter((opt) => opt.selected)
                    .map((opt) => (
                      <li key={opt.id}>
                        + {opt.name} (Qty: {opt.quantity})
                      </li>
                    ))}
                </ul>
              )}
            </li>
          ))}
      </ul>

      <MenuItemList
        menu={getDisplayMenu()}
        onToggleSelect={handleToggleSelect}
        onChangeQuantity={handleChangeQuantity}
        onToggleOption={handleToggleOption}
        onChangeOptionQuantity={handleChangeOptionQuantity}
      />
      <button
        type="button"
        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded w-full md:w-auto"
        onClick={() => window.history.back()}
        disabled={loading}
      >
        Cancel
      </button>
      <button
        onClick={handleUpdateOrder}
        className="mt-6 ml-3  bg-green-400 hover:bg-green-500 text-black font-bold px-4 py-2 rounded w-full md:w-auto"
      >
        Update Order
      </button>
    </div>
  );
}
