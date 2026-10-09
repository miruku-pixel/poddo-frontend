import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DiningTableSelector from "../components/DiningTableSelector";
import MenuItemList from "../components/MenuItemList";
import OrderSummary from "../components/OrderSummary";
import OrderTypeSelector, { OrderType } from "../components/OrderTypeSelector";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { User } from "../types/User";
import { DiningTable } from "../types/DiningTable";
import { FoodItem, APIFoodItem, UIFoodOption, OrderCartSet } from "../types/Food";
import { sortFoodItems } from "../utils/foodSort";
import LOGO from "../assets/LOGO_PODDO.webp";

// Simplified InputField component
function InputField({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-white mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-800 text-white border border-green-300 rounded p-2"
          placeholder={label}
        />
      </div>
    </div>
  );
}

interface OrderEntryProps {
  user: User | null;
}

export default function OrderEntry({ user }: OrderEntryProps) {
  const navigate = useNavigate();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [orderRemark, setOrderRemark] = useState<string>("");

  const [selectedOrderTypeId, setSelectedOrderTypeId] = useState<string>("");
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | null>(
    null
  );

  const [orderTypes, setOrderTypes] = useState<OrderType[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [onlineCode, setOnlineCode] = useState<string>("");

  // Set-based Cart State
  const [cartSets, setCartSets] = useState<OrderCartSet[]>([]);
  const [editingSet, setEditingSet] = useState<OrderCartSet | null>(null);

  const fetchMenuAndTables = useCallback(
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
        const [foodsRes, tablesRes] = await Promise.all([
          fetchWithAuth(
            `/api/foods?outletId=${outletId}&orderTypeId=${orderTypeId}`
          ),
          fetchWithAuth(`/api/diningTable?outletId=${outletId}`),
        ]);
        const foods: APIFoodItem[] = await foodsRes.json();
        const tables = await tablesRes.json();
        setTables(tables);
        setMenu(processFoods(foods));
      } catch (error) {
        console.error("Fetching failed:", error);
        alert("Failed to load data.");
      }
    },
    [setTables, setMenu]
  );

  useEffect(() => {
    if (user?.outletId && selectedOrderTypeId) {
      fetchMenuAndTables(user.outletId, selectedOrderTypeId);
    }
  }, [user?.outletId, selectedOrderTypeId, fetchMenuAndTables]);

  // Fetch order types once on mount
  useEffect(() => {
    fetchWithAuth("/api/orderType")
      .then((res) => res.json())
      .then((types: OrderType[]) => {
        setOrderTypes(types);
        const dineIn = types.find((t) => t.name === "Dine In");
        if (dineIn) {
          setSelectedOrderTypeId(dineIn.id);
          setSelectedOrderType(dineIn);
        }
      });
  }, []);

  // Check if two sets share the same configuration (food, cut, sambal, and remark)
  const isSameSetConfiguration = (a: OrderCartSet, b: OrderCartSet): boolean => {
    const sameFood = a.foodId === b.foodId;
    const sameCut = (a.selectedCut?.id || null) === (b.selectedCut?.id || null);
    const sameSambal = (a.selectedSambal?.id || null) === (b.selectedSambal?.id || null);
    const sameRemark =
      (a.remark || "").trim().toLowerCase() === (b.remark || "").trim().toLowerCase();

    return sameFood && sameCut && sameSambal && sameRemark;
  };

  // Save / Add / Update Set with Auto-Merge
  const handleSaveSet = (
    incomingSet: OrderCartSet,
    editingTempId?: string | null
  ) => {
    setCartSets((prevSets) => {
      if (editingTempId) {
        // We were editing a specific set
        return prevSets.map((s) =>
          s.tempId === editingTempId ? { ...incomingSet, tempId: editingTempId } : s
        );
      }

      // Check if identical combo already exists in cart -> auto-merge
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

      // Otherwise create a new set
      return [...prevSets, incomingSet];
    });

    setEditingSet(null);
  };

  const handleEditSet = (set: OrderCartSet) => {
    setEditingSet(set);
  };

  const handleDeleteSet = (tempId: string) => {
    setCartSets((prev) => prev.filter((s) => s.tempId !== tempId));
    if (editingSet?.tempId === tempId) {
      setEditingSet(null);
    }
  };

  const handleChangeSetQuantity = (tempId: string, delta: number) => {
    setCartSets((prev) =>
      prev
        .map((s) => {
          if (s.tempId === tempId) {
            const newQty = s.quantity + delta;
            return { ...s, quantity: newQty };
          }
          return s;
        })
        .filter((s) => s.quantity > 0)
    );
  };

  const calculateTotalPrice = () => {
    return cartSets.reduce((sum, set) => {
      const cutExtra = set.selectedCut?.extraPrice || 0;
      const sambalExtra = set.selectedSambal?.extraPrice || 0;
      const otherExtra = (set.otherOptions || []).reduce(
        (acc, opt) => acc + opt.extraPrice * (opt.quantity || 1),
        0
      );
      const unitTotal = set.foodPrice + cutExtra + sambalExtra + otherExtra;
      return sum + unitTotal * set.quantity;
    }, 0);
  };

  const submitOrder = async () => {
    const currentOrderTypeName = selectedOrderType?.name;

    if (selectedOrderType?.name === "Dine In" && !selectedTableId) {
      alert("Please select a table before submitting an order.");
      return;
    }

    if (currentOrderTypeName === "Take Away" && !customerName) {
      alert("Customer Name is required for this order type.");
      return;
    }

    if (cartSets.length === 0) {
      alert("Please select at least one menu item.");
      return;
    }

    const items = cartSets.map((set) => {
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
    });

    let customerNamePayload: string | null = null;
    let onlineCodePayload: string | null = null;

    if (
      currentOrderTypeName === "Take Away" ||
      currentOrderTypeName === "GrabFood" ||
      currentOrderTypeName === "ShopeeFood" ||
      currentOrderTypeName === "GoFood"
    ) {
      customerNamePayload = customerName;
    }
    if (
      currentOrderTypeName === "GrabFood" ||
      currentOrderTypeName === "ShopeeFood" ||
      currentOrderTypeName === "GoFood"
    ) {
      onlineCodePayload = onlineCode;
    }

    const payload = {
      diningTableId:
        selectedOrderType?.name === "Dine In" ? selectedTableId : null,
      waiterId: user?.id,
      outletId: user?.outletId,
      orderTypeId: selectedOrderTypeId,
      items,
      remark: orderRemark,
      customerName: customerNamePayload,
      onlineCode: onlineCodePayload,
    };

    try {
      const response = await fetchWithAuth("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Submit failed:", errorText);
        throw new Error("Failed to submit order");
      }

      const result = await response.json();
      const orderId = result.id;

      setCartSets([]);
      setOrderRemark("");
      setSelectedTableId("");
      setCustomerName("");
      setOnlineCode("");
      setEditingSet(null);

      if (orderId) {
        navigate(`/billing/${orderId}`);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert("Failed to submit order.");
    }
  };

  const handleOrderTypeChange = (orderTypeId: string) => {
    setSelectedOrderTypeId(orderTypeId);
    const foundType = orderTypes.find((t) => t.id === orderTypeId);
    setSelectedOrderType(foundType || null);

    if (foundType?.name !== "Dine In") {
      setSelectedTableId("");
    }
    setCustomerName("");
    setOnlineCode("");
  };

  return (
    <div className="w-full px-2 sm:px-4 py-4 md:py-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Order Type, Details & Food Menu */}
        <div className="w-full lg:flex-1 space-y-6">
          {/* Header Section: H1, Selectors, Inputs, and Logo */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[280px] md:min-w-[350px] space-y-4">
              <h1 className="text-2xl text-white font-bold">Create Order</h1>
              <OrderTypeSelector
                orderTypes={orderTypes}
                selectedOrderTypeId={selectedOrderTypeId}
                onChange={handleOrderTypeChange}
                currentUserRole={user?.role || null}
              />

              {selectedOrderType?.name === "Dine In" && (
                <DiningTableSelector
                  tables={tables}
                  selectedTableId={selectedTableId}
                  setSelectedTableId={setSelectedTableId}
                />
              )}

              {(selectedOrderType?.name === "Take Away" ||
                selectedOrderType?.name === "GrabFood" ||
                selectedOrderType?.name === "ShopeeFood" ||
                selectedOrderType?.name === "GoFood") && (
                <div className="flex flex-wrap gap-4 items-start">
                  <InputField
                    label="Customer Name"
                    value={customerName}
                    onChange={setCustomerName}
                    type="text"
                    className="w-full sm:w-80 md:w-96 max-w-lg"
                  />

                  {(selectedOrderType?.name === "GrabFood" ||
                    selectedOrderType?.name === "ShopeeFood" ||
                    selectedOrderType?.name === "GoFood") && (
                    <InputField
                      label="Online Code"
                      value={onlineCode}
                      onChange={setOnlineCode}
                      type="text"
                      className="w-full sm:w-48 md:w-56"
                    />
                  )}
                </div>
              )}
            </div>
            {/* Logo */}
            <div className="rounded-xl w-full sm:w-auto flex justify-center items-center flex-grow-0 flex-shrink-0 self-center">
              <img
                src={LOGO}
                alt="Restaurant Logo"
                className="max-h-[140px] max-w-[180px] w-auto h-auto object-contain"
              />
            </div>
          </div>

          {/* Separator Line */}
          <hr className="border-t border-gray-600" />

          {/* Food Menu */}
          <MenuItemList
            menu={menu}
            cartSets={cartSets}
            onSaveSet={handleSaveSet}
            editingSet={editingSet}
            onCloseEdit={() => setEditingSet(null)}
          />
        </div>

        {/* Right Column: Order Summary & Checkout (Sticky on Desktop) */}
        <div id="order-summary-section" className="w-full lg:w-96 xl:w-[420px] lg:sticky lg:top-8 shrink-0 pb-16 lg:pb-0">
          <OrderSummary
            cartSets={cartSets}
            totalPrice={calculateTotalPrice()}
            orderRemark={orderRemark}
            setOrderRemark={setOrderRemark}
            submitOrder={submitOrder}
            currentUserRole={user?.role || null}
            onEditSet={handleEditSet}
            onDeleteSet={handleDeleteSet}
            onChangeSetQuantity={handleChangeSetQuantity}
          />
        </div>
      </div>

      {/* Mobile / Tablet Floating Cart Bar (visible only on mobile/tablet below lg when items in cart) */}
      {cartSets.length > 0 && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-gradient-to-r from-emerald-500 to-green-400 text-slate-950 p-3 rounded-2xl shadow-2xl flex items-center justify-between border border-white/30 backdrop-blur">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900/80">
              {cartSets.length} {cartSets.length === 1 ? "Set" : "Sets"} in Cart
            </div>
            <div className="text-base sm:text-lg font-extrabold leading-none mt-0.5">
              Rp {calculateTotalPrice().toLocaleString("id-ID")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const summaryEl = document.getElementById("order-summary-section");
              summaryEl?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-slate-950 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md hover:bg-slate-900 active:scale-95 transition cursor-pointer touch-manipulation"
          >
            Review & Pay ↓
          </button>
        </div>
      )}
    </div>
  );
}


