import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import MenuItemList from "../components/MenuItemList";
import { Order } from "../types/Order";
import { RawOrder, RawOrderItem, RawOption } from "../types/RawOrder";
import { FoodItem, APIFoodItem, UIFoodOption, OrderCartSet } from "../types/Food";
import { sortFoodItems } from "../utils/foodSort";
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
          remark: item.remark || null,
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

  // Set-based cart state for new items being added
  const [cartSets, setCartSets] = useState<OrderCartSet[]>([]);
  const [editingSet, setEditingSet] = useState<OrderCartSet | null>(null);

  const fetchMenu = useCallback(
    async (outletId: string, orderTypeId: string) => {
      const processFoods = (foods: APIFoodItem[]): FoodItem[] => {
        return sortFoodItems(
          foods.map(
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
          )
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
      const timer = setTimeout(() => setOrderSubmitted(false), 3000);
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

  const isSameSetConfiguration = (a: OrderCartSet, b: OrderCartSet): boolean => {
    const sameFood = a.foodId === b.foodId;
    const sameCut = (a.selectedCut?.id || null) === (b.selectedCut?.id || null);
    const sameSambal = (a.selectedSambal?.id || null) === (b.selectedSambal?.id || null);
    const sameRemark =
      (a.remark || "").trim().toLowerCase() === (b.remark || "").trim().toLowerCase();

    return sameFood && sameCut && sameSambal && sameRemark;
  };

  const handleSaveSet = (
    incomingSet: OrderCartSet,
    editingTempId?: string | null
  ) => {
    setCartSets((prevSets) => {
      if (editingTempId) {
        return prevSets.map((s) =>
          s.tempId === editingTempId ? { ...incomingSet, tempId: editingTempId } : s
        );
      }

      const matchIndex = prevSets.findIndex((s) =>
        isSameSetConfiguration(s, incomingSet)
      );

      if (matchIndex !== -1) {
        const updated = [...prevSets];
        updated[matchIndex] = {
          ...updated[matchIndex],
          quantity: updated[matchIndex].quantity + incomingSet.quantity,
        };
        return updated;
      }

      return [...prevSets, incomingSet];
    });

    setEditingSet(null);
  };

  const handleDeleteSet = (tempId: string) => {
    setCartSets((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const buildAddItemsPayload = () => {
    return {
      items: cartSets.map((set) => {
        const options: { optionId: string; quantity: number }[] = [];
        if (set.selectedCut) {
          options.push({ optionId: set.selectedCut.id, quantity: set.quantity });
        }
        if (set.selectedSambal) {
          options.push({ optionId: set.selectedSambal.id, quantity: set.quantity });
        }
        (set.otherOptions || []).forEach((opt) => {
          options.push({ optionId: opt.id, quantity: (opt.quantity || 1) * set.quantity });
        });

        return {
          foodId: set.foodId,
          quantity: set.quantity,
          options,
          remark: set.remark || null,
        };
      }),
    };
  };

  const handleUpdateOrder = async () => {
    if (!orderId) return;

    setIsUpdatingOrder(true);

    try {
      const payload = buildAddItemsPayload();

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
        alert(
          "Failed to add items to order: " +
            (errorData.error || errorData.message || "Unknown error")
        );
        return;
      }

      navigate("/status");
    } catch (error) {
      console.error("Error updating order:", error);
      alert("An unexpected error occurred while updating the order.");
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-gray-800 min-h-screen text-white rounded-xl border border-green-400 shadow">
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

      {/* Existing Items in Order */}
      <div className="mb-6 p-4 bg-gray-900/70 rounded-xl border border-gray-700">
        <h2 className="text-base font-semibold mb-2 text-green-300">
          Already Ordered Items:
        </h2>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="text-sm">
              <div className="font-medium">
                • {item.foodName} (Qty: {item.quantity})
              </div>
              {item.options.map((opt) => (
                <div key={opt.id} className="ml-4 text-xs text-gray-400">
                  + {opt.name} (Qty: {opt.quantity})
                </div>
              ))}
              {item.remark && (
                <div className="ml-4 text-xs text-yellow-300 italic">
                  Note: {item.remark}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Newly Selected Sets to Add */}
      {cartSets.length > 0 && (
        <div className="mb-6 p-4 bg-emerald-950/40 rounded-xl border border-emerald-500/50">
          <h2 className="text-base font-semibold mb-3 text-emerald-300">
            New Items to Add ({cartSets.length} {cartSets.length === 1 ? "Set" : "Sets"}):
          </h2>
          <div className="space-y-2">
            {cartSets.map((set, idx) => (
              <div
                key={set.tempId}
                className="flex items-center justify-between p-2.5 bg-gray-900/90 rounded-lg border border-gray-700 text-sm"
              >
                <div>
                  <span className="font-bold text-emerald-400 mr-2">#{idx + 1}</span>
                  <span className="font-semibold text-white mr-2">{set.foodName}</span>
                  <span className="text-emerald-300 font-bold">x{set.quantity}</span>
                  <div className="flex flex-wrap gap-1 mt-1 text-xs">
                    {set.selectedCut && (
                      <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40">
                        Varian: {set.selectedCut.name}
                      </span>
                    )}
                    {set.selectedSambal && (
                      <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40">
                        Sambal: {set.selectedSambal.name}
                      </span>
                    )}
                  </div>
                  {set.remark && (
                    <div className="text-xs text-yellow-300 italic mt-0.5">
                      Note: {set.remark}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSet(set.tempId)}
                  className="text-xs px-2.5 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition cursor-pointer font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Grid */}
      <h2 className="text-lg font-bold text-white mb-3">Add Menu Items:</h2>
      <MenuItemList
        menu={menu}
        cartSets={cartSets}
        onSaveSet={handleSaveSet}
        editingSet={editingSet}
        onCloseEdit={() => setEditingSet(null)}
      />

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t border-green-400">
        <button
          type="button"
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-xl w-full sm:w-auto transition duration-200 font-medium cursor-pointer"
          onClick={() => window.history.back()}
          disabled={loading || isUpdatingOrder}
        >
          Cancel
        </button>
        <button
          onClick={handleUpdateOrder}
          disabled={isUpdatingOrder || cartSets.length === 0}
          className={`bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-300 hover:to-emerald-300 text-slate-950 font-bold px-6 py-2.5 rounded-xl w-full sm:w-auto transition duration-200 flex items-center justify-center cursor-pointer ${
            isUpdatingOrder || cartSets.length === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isUpdatingOrder ? "Updating..." : `Add ${cartSets.length} Set(s) to Order`}
        </button>
      </div>
    </div>
  );
}

