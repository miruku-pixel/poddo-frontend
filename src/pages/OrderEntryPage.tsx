import { useEffect, useState, useCallback } from "react";
import DiningTableSelector from "../components/DiningTableSelector";
import MenuItemList from "../components/MenuItemList";
import OrderSummary from "../components/OrderSummary";
import SuccessMessage from "../components/SuccessMessage";
import OrderTypeSelector, { OrderType } from "../components/OrderTypeSelector";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { User } from "../types/User";
import { DiningTable } from "../types/DiningTable";
import { FoodItem, APIFoodItem, UIFoodOption } from "../types/Food";

// Simplified InputField component
function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string; // Type is always honored directly now
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={type} // Use the provided type directly
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-800 text-white border border-green-300 rounded p-2"
          placeholder={label} // Use label as placeholder
        />
      </div>
    </div>
  );
}

interface OrderEntryProps {
  user: User | null;
}

export default function OrderEntry({ user }: OrderEntryProps) {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [orderRemark, setOrderRemark] = useState<string>("");
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<string>("");

  // NEW: State for order type
  const [selectedOrderTypeId, setSelectedOrderTypeId] = useState<string>("");
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | null>(
    null
  );

  const [orderTypes, setOrderTypes] = useState<OrderType[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [onlineCode, setOnlineCode] = useState<string>("");

  // Then define fetchMenuAndTables
  const fetchMenuAndTables = useCallback(
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
        console.log("Fetched Order Types:", types); // ✅ Add this line
        setOrderTypes(types);
        const dineIn = types.find((t) => t.name === "Dine In");
        if (dineIn) {
          setSelectedOrderTypeId(dineIn.id);
          setSelectedOrderType(dineIn);
        }
      });
  }, []);

  const [selectedItems, setSelectedItems] = useState<{
    [id: string]: {
      quantity: number;
      selectedOptions: {
        [optionId: string]: number;
      };
    };
  }>({});

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

  // Helper to get the price for a food item (first price or by orderType if needed)
  const getFoodPrice = (item: FoodItem) => {
    if (!item.prices || item.prices.length === 0) return 0;
    // You can filter by orderTypeId if you want to support order type selection
    return item.prices[0].price;
  };

  const calculateTotalPrice = () => {
    let total = 0;

    for (const id in selectedItems) {
      const menuItem = menu.find((item) => item.id === id);
      if (!menuItem) continue;

      const item = selectedItems[id];
      total += getFoodPrice(menuItem) * item.quantity;

      for (const optionId in item.selectedOptions) {
        const option = menuItem.options.find((opt) => opt.id === optionId);
        if (!option) continue;

        const optionQty = item.selectedOptions[optionId];
        total += option.extraPrice * optionQty;
      }
    }

    return total;
  };

  const submitOrder = async () => {
    console.log("Start submitOrder");

    const currentOrderTypeName = selectedOrderType?.name;

    if (selectedOrderType?.name === "Dine In" && !selectedTableId) {
      alert("Please select a table before submitting an order.");
      console.warn("Submission blocked: No table selected.");
      return;
    }

    if (currentOrderTypeName !== "Dine In" && !customerName) {
      alert("Customer Name is required for this order type.");
      console.warn("Submission blocked: Customer Name missing.");
      return;
    }

    if (
      (currentOrderTypeName === "GrabFood" ||
        currentOrderTypeName === "GoFood") &&
      !onlineCode
    ) {
      alert("Online Code is required for GrabFood/GoFood orders.");
      console.warn("Submission blocked: Online Code missing.");
      return;
    }

    const items = Object.entries(selectedItems)
      .map(([foodId, itemData]) => {
        const menuItem = menu.find((m) => m.id === foodId);
        if (!menuItem) return null;

        return {
          foodId,
          quantity: itemData.quantity,
          options: Object.entries(itemData.selectedOptions).map(
            ([optionId, quantity]) => ({
              optionId,
              quantity,
            })
          ),
        };
      })
      .filter(Boolean);

    if (items.length === 0) {
      alert("Please select at least one menu item.");
      console.warn("Submission blocked: No items selected.");
      return;
    }

    let customerNamePayload: string | null = null;
    let onlineCodePayload: string | null = null;

    if (
      currentOrderTypeName === "Take Away" ||
      currentOrderTypeName === "GrabFood" ||
      currentOrderTypeName === "GoFood"
    ) {
      customerNamePayload = customerName;
    }
    if (
      currentOrderTypeName === "GrabFood" ||
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
      customerName: customerNamePayload, // Included dynamically
      onlineCode: onlineCodePayload, // Included dynamically
    };

    console.log("Submitting order payload:", payload);

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

      // Assuming your API returns the created order object, including its ID or a specific orderNumber
      const result = await response.json(); // Parse the response JSON
      const OrderNo = result.orderNumber; // Or result.orderNumber if your API returns a specific order number field

      // A quick way to get a shortened ID for display, if orderNumber isn't explicitly returned
      // Otherwise, use `result.orderNumber` directly if your backend provides it.
      const displayOrderNumber = OrderNo
        ? OrderNo.slice(-6).toUpperCase()
        : "N/A";
      setSubmittedOrderNumber(displayOrderNumber); // Set the order number state

      // Reset state after successful submit
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
      setOrderRemark("");
      setSelectedTableId("");
      setCustomerName(""); // Reset customer name
      setOnlineCode(""); // Reset online code
      setOrderSubmitted(true);

      window.scrollTo({ top: 0, behavior: "smooth" });

      setTimeout(() => {
        setOrderSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to submit order.");
    }
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

  // When order type changes, update state and clear table selection if not DINE_IN
  const handleOrderTypeChange = (orderTypeId: string) => {
    setSelectedOrderTypeId(orderTypeId);
    const foundType = orderTypes.find((t) => t.id === orderTypeId);
    setSelectedOrderType(foundType || null);

    // Clear Dining Table, Customer Name, and Online Code based on new order type
    if (foundType?.name !== "Dine In") {
      setSelectedTableId(""); // Clear table if not Dine In
    }
    setCustomerName(""); // Always clear to ensure fresh input for relevant order types
    setOnlineCode(""); // Always clear
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {orderSubmitted && <SuccessMessage orderNumber={submittedOrderNumber} />}
      <h1 className="text-2xl text-white font-bold">Create Order</h1>

      {/* Order Type Selector */}
      <OrderTypeSelector
        orderTypes={orderTypes}
        selectedOrderTypeId={selectedOrderTypeId}
        onChange={handleOrderTypeChange}
      />

      {selectedOrderType?.name === "Dine In" && (
        <DiningTableSelector
          tables={tables}
          selectedTableId={selectedTableId}
          setSelectedTableId={setSelectedTableId}
        />
      )}

      {/* Conditional Rendering for Customer Name */}
      {(selectedOrderType?.name === "Take Away" ||
        selectedOrderType?.name === "GrabFood" ||
        selectedOrderType?.name === "GoFood") && (
        <InputField
          label="Customer Name"
          value={customerName}
          onChange={setCustomerName}
          type="text"
        />
      )}

      {/* Conditional Rendering for Online Code */}
      {(selectedOrderType?.name === "GrabFood" ||
        selectedOrderType?.name === "GoFood") && (
        <InputField
          label="Online Code"
          value={onlineCode}
          onChange={setOnlineCode}
          type="text"
        />
      )}

      <MenuItemList
        menu={getDisplayMenu()}
        onToggleSelect={handleToggleSelect}
        onChangeQuantity={handleChangeQuantity}
        onToggleOption={handleToggleOption}
        onChangeOptionQuantity={handleChangeOptionQuantity}
      />

      <OrderSummary
        selectedFoods={getDisplayMenu().filter((item) => item.selected)}
        totalPrice={calculateTotalPrice()}
        orderRemark={orderRemark}
        setOrderRemark={setOrderRemark}
        submitOrder={submitOrder}
        currentUserRole={user?.role || null}
      />
    </div>
  );
}
