import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

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
    []
  );

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth(`/api/fetchOrder/${orderId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch order.");
        }
        const data = await response.json();
        setOrder(mapOrderResponse(data));
      } catch (err) {
        // Catch as any for simpler error handling, or unknown and check instanceof Error
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
        console.log("Fetched Order Types (not directly used here):", types);
      })
      .catch((error) => console.error("Error fetching order types:", error));
  }, []);

  useEffect(() => {
    if (user?.outletId && order?.orderType?.id) {
      fetchMenu(user.outletId, order.orderType.id);
    }
  }, [user?.outletId, order?.orderType?.id, fetchMenu]);

  if (loading)
    return (
      <div className="text-white text-center">Loading order details...</div>
    );
  if (error)
    return <div className="text-red-400 text-center">Error: {error}</div>;
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

    setIsUpdatingOrder(true); // Start loading animation

    try {
      const payload = buildAddItemsPayload(); // This can now throw errors if validation fails

      if (payload.items.length === 0) {
        alert("No new items selected to add.");
        return;
      }

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
        // Using alert here, consider a custom modal for better UX
        alert(
          "Failed to add items to order: " +
            (errorData.error || errorData.message || "Unknown error")
        );
        return; // Don't redirect on failure
      }

      navigate("/status");

      // On successful update, navigate to status page
    } catch (error) {
      // Catch validation errors from buildAddItemsPayload or fetch errors
      console.error("Error updating order:", error);
      // Display the specific error message from validation or fetch
      alert("An unexpected error occurred while updating the order.");
    } finally {
      setIsUpdatingOrder(false); // Stop loading animation
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
      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t border-green-400">
        <button
          type="button"
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded w-full sm:w-auto transition duration-200"
          onClick={() => window.history.back()}
          disabled={loading || isUpdatingOrder} // Disable if initial loading or submitting
        >
          Cancel
        </button>
        <button
          onClick={handleUpdateOrder}
          disabled={isUpdatingOrder} // Disable if currently updating
          className={`bg-green-400 hover:bg-green-500 text-black font-bold px-4 py-2 rounded w-full sm:w-auto transition duration-200 flex items-center justify-center ${
            isUpdatingOrder ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isUpdatingOrder ? (
            <svg
              className="animate-spin h-5 w-5 text-black" // Spinner for dark text
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            "Update Order"
          )}
        </button>
      </div>
    </div>
  );
}
