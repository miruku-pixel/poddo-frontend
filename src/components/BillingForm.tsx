import { useState, useEffect, useRef } from "react";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { Order } from "../types/Order";
import { Billing } from "../types/Billing";
import { useNavigate } from "react-router-dom";

interface BillingFormProps {
  order: Order;
  onBilled: (billing: Billing) => void;
}

// ✅ Filter function to remove canceled items and canceled options
const getCleanItems = (order: Order) =>
  order.items
    .filter((item) => item.status !== "CANCELED") // ✅ only remove canceled items
    .map((item) => ({
      ...item,
      options: item.options.filter((opt) => opt.status !== "CANCELED"), // ✅ remove canceled options
    }));

// ✅ Helper to calculate subtotal from order items
function calculateSubtotal(order: Order) {
  return order.items.reduce((sum, item) => {
    const optionsTotal = item.options.reduce(
      (optSum, opt) => optSum + opt.quantity * (opt.unitPrice ?? 0),
      0
    );
    return sum + item.quantity * (item.unitPrice ?? 0) + optionsTotal;
  }, 0);
}

// If you have tax/discount logic, add here. For now, set to 0.
function calculateTax() {
  return 0;
}

// Helper for formatting
const formatRupiah = (value: number | string) =>
  `Rp ${Number(value).toLocaleString("id-ID")}`;

export default function BillingForm({ order, onBilled }: BillingFormProps) {
  const cleanItems = getCleanItems(order);

  const subtotal =
    order.subtotal ?? calculateSubtotal({ ...order, items: cleanItems });

  const tax = order.tax ?? calculateTax();

  const [manualDiscount, setManualDiscount] = useState<number | string>(
    order.discount ?? 0
  );

  const [amountPaid, setAmountPaid] = useState<number | string>(
    order.total ?? subtotal + tax - Number(order.discount ?? 0)
  );
  const [paymentType, setPaymentType] = useState("CASH");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const isManualDiscountAllowed =
    order.orderType?.name === "Dine In" ||
    order.orderType?.name === "Take Away";

  const backendCalculatedDiscount =
    !isManualDiscountAllowed &&
    order.orderTypeDiscountPercentage !== undefined &&
    order.orderTypeDiscountPercentage !== null
      ? order.total * order.orderTypeDiscountPercentage // Apply percentage to order.total
      : 0;

  useEffect(() => {
    if (!isManualDiscountAllowed) {
      // For Gojek, Grab, etc., auto-fill the discount
      // Use Math.round for currency to avoid floating point issues
      setManualDiscount(Math.round(backendCalculatedDiscount));
    } else {
      // For Dine In/Take Away, reset to the order's initial discount or 0
      // This ensures the field is editable and shows the original value if order type changes
      setManualDiscount(order.discount ?? 0);
    }
  }, [
    isManualDiscountAllowed,
    backendCalculatedDiscount,
    order.discount,
    order.orderType?.name, // Add order.orderType?.name to dependencies
  ]);

  // Recalculate total based on the current manualDiscount state
  const total = subtotal + tax - Number(manualDiscount);

  // Ref to track previous total for amountPaid auto-fill logic
  const prevTotalRef = useRef(total);

  useEffect(() => {
    if (Number(amountPaid) === prevTotalRef.current) {
      setAmountPaid(total);
    }
    prevTotalRef.current = total;
  }, [total, amountPaid]);

  const handleBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth(`/api/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          paymentType,
          amountPaid: Number(amountPaid),
          remark,
          discount: Number(manualDiscount),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onBilled(data);
      } else {
        setError(data.error || "Billing failed");
      }
    } catch (err) {
      console.error("Billing failed:", err);
      setError("Billing failed due to network or server error.");
    } finally {
      setLoading(false);
    }
  };

  const showCustomerName =
    order.orderType?.name === "Take Away" ||
    order.orderType?.name === "GrabFood" ||
    order.orderType?.name === "GoFood";

  const showOnlineCode =
    order.orderType?.name === "GrabFood" || order.orderType?.name === "GoFood";

  // Determine the label for the discount input
  const discountLabel = isManualDiscountAllowed
    ? "Manual Discount (Rp)"
    : `${order.orderType?.name} Discount (Rp)`;

  return (
    <div className="w-full min-h-screen bg-transparent flex justify-center items-center p-4">
      <div className="relative max-w-3xl w-full bg-gray-700 rounded-xl shadow p-6 text-white border border-green-400">
        {/* X Button */}
        <button
          type="button"
          className="absolute top-4 right-4 hover:text-green-500 text-4xl font-bold focus:outline-none"
          onClick={() => navigate("/status")}
          aria-label="Close"
        >
          ×
        </button>

        {/* Header */}
        <div className="flex justify-between items-center border-b border-green-400 pb-4 mb-4">
          <div>
            <h2 className="pb-4 mb-4  text-3xl font-bold text-green-400 border-b">
              Cashier Panel
            </h2>
            <p className="text-xl font-medium text-orange-200">
              {order.orderType?.name?.toLowerCase() === "dine in"
                ? `Table ${order.tableNumber || "N/A"} - ${
                    order.waiterName || "N/A"
                  }`
                : `${order.orderType?.name || "N/A"} - ${
                    order.waiterName || "N/A"
                  }`}
            </p>
            {/* Start of responsive grid for order details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
              <p className="font-medium text-blue-300 text-xl">
                Order No:{" "}
                <span className="text-yellow-300">{order.orderNumber}</span>
              </p>
              {showCustomerName && order.customerName && (
                <p className="font-medium text-blue-300 text-xl">
                  Customer Name:{" "}
                  <span className="text-yellow-300">{order.customerName}</span>
                </p>
              )}
              {showOnlineCode && order.onlineCode && (
                <p className="font-medium text-blue-300 text-xl">
                  Online Code:{" "}
                  <span className="text-yellow-300">{order.onlineCode}</span>
                </p>
              )}
              {/* You can add a fourth P tag here if desired, e.g., for Date */}
              {/* <p className="font-medium text-yellow-300 text-xl">
                Date: {new Date(order.createdAt).toLocaleDateString()}
              </p> */}
            </div>
            {/* End of responsive grid */}
          </div>
        </div>

        {/* Order Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-white">
            Order Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-400/40 text-white">
                  <th className="py-2 px-2 text-left">Item</th>
                  <th className="py-2 px-2 text-center">Qty</th>
                  <th className="py-2 px-2 text-right">Price</th>
                  <th className="py-2 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {cleanItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-green-800">
                    <td className="py-2 px-2">
                      <span className="font-semibold text-white">
                        {item.foodName}
                      </span>
                      {item.options.length > 0 ? (
                        <div className="text-xs text-white ml-2">
                          {item.options.map((opt, i) => (
                            <span key={i}>
                              Option: {opt.name} (x{opt.quantity})
                              {i < item.options.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-white">No options</div>
                      )}
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">
                      {formatRupiah(item.unitPrice)}
                    </td>
                    <td className="text-right">
                      {formatRupiah(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Section */}
        <form onSubmit={handleBilling}>
          <div className="border-t border-green-400 pt-4 space-y-4">
            {/* Totals */}
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatRupiah(tax)}</span>
              </div>
              <div className="flex justify-between items-center">
                <label className="text-sm">{discountLabel}</label>
                <input
                  type="number"
                  min={0}
                  max={subtotal + tax}
                  value={manualDiscount}
                  onChange={(e) =>
                    setManualDiscount(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  // Conditionally set readOnly and apply disabled styling
                  readOnly={!isManualDiscountAllowed}
                  className={`border border-green-400 px-2 py-1 rounded w-32 text-right bg-white text-black ${
                    !isManualDiscountAllowed
                      ? "opacity-60 cursor-not-allowed bg-gray-200"
                      : ""
                  }`}
                  placeholder="e.g. 5,000"
                />
              </div>
              <div className="flex justify-between font-bold text-red-300 text-lg">
                <span>Total</span>
                <span>{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Amount Paid */}
            <div className="flex justify-between items-center">
              <label className="text-sm">Amount Paid (Rp)</label>
              <input
                type="number"
                min={total}
                value={amountPaid}
                onChange={(e) =>
                  setAmountPaid(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="border border-green-400 px-2 py-1 rounded w-32 text-right bg-white text-black"
                required
              />
            </div>

            {/* Change */}
            <div className="flex justify-between items-center font-bold">
              <span>Change</span>
              <span className="text-green-300">
                {formatRupiah(Number(amountPaid) - total)}
              </span>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block mb-1 text-sm font-medium text-green-200">
                Payment Method
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full border border-green-400 px-3 py-2 rounded bg-gray-700 text-green-100"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="QRIS">QRIS</option>
                <option value="DEBIT">Debit</option>
                <option value="E_WALLET">E-Wallet</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            {/* Remark */}
            <div>
              <label className="block mb-1 text-green-200">Remark</label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full p-2 rounded bg-white border border-green-400 text-black"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-2 mt-4">
              <button
                type="button"
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded w-full md:w-auto"
                onClick={() => window.history.back()}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-green-400 hover:bg-green-500 text-black font-bold px-4 py-2 rounded w-full md:w-auto"
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
            {error && <div className="text-red-400 mt-2">{error}</div>}
          </div>
        </form>
      </div>
    </div>
  );
}
