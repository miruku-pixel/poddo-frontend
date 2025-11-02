import { useState } from "react";
import { FoodItem } from "../types/Food";

type OrderSummaryProps = {
  selectedFoods: FoodItem[];
  totalPrice: number;
  orderRemark: string;
  setOrderRemark: (remark: string) => void;
  submitOrder: () => void;
  submitLabel?: string;
  currentUserRole?: string | null; // Added: Current user's role
};

export default function OrderSummary({
  selectedFoods,
  totalPrice,
  orderRemark,
  setOrderRemark,
  submitOrder,
  submitLabel,
  currentUserRole,
}: OrderSummaryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if the user is a Waiter
  const isWaiter = currentUserRole === "WAITER";
  const isCashier = currentUserRole === "CASHIER";
  const isAdmin = currentUserRole === "ADMIN";

  const wrappedSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      console.log("Calling submitOrder");
      await submitOrder();
      console.log("submitOrder completed");
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Something went wrong while submitting the order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  return (
    <div className="mt-6 p-[2px] rounded-xl bg-[linear-gradient(159deg,_rgba(62,180,137,1)_0%,_rgba(144,238,144,1)_100%)] shadow">
      <div className="p-4 rounded-xl bg-gray-800 space-y-4">
        {selectedFoods.length > 0 && (
          <div className="text-white space-y-4">
            <h3 className="text-lg font-semibold text-green-300">Your Order</h3>
            <div className="space-y-2">
              {selectedFoods.map((food) => (
                <div key={food.id}>
                  <div className="flex justify-between font-medium">
                    <span>{food.name}</span>
                    <span>Qty: {food.quantity}</span>
                  </div>

                  {food.options
                    ?.filter((opt) => opt.selected)
                    .map((opt) => (
                      <div
                        key={opt.id}
                        className="ml-4 text-sm flex justify-between"
                      >
                        <span className="text-green-200">+ {opt.name}</span>
                        <span className="text-green-200">
                          Qty: {opt.quantity}
                        </span>
                      </div>
                    ))}
                </div>
              ))}
            </div>

            <div className="border-b border-green-700 pb-2" />
          </div>
        )}

        <div className="flex justify-between text-lg font-semibold text-white">
          <span>Total Price:</span>
          <span>{formatPrice(totalPrice)}</span>
        </div>

        <div>
          <label
            htmlFor="remark"
            className="block font-medium mb-1 text-green-300"
          >
            Remark:
          </label>
          <textarea
            id="remark"
            value={orderRemark}
            onChange={(e) => setOrderRemark(e.target.value)}
            className="w-full rounded p-2 bg-gray-800 text-white border border-green-300 focus:outline-none focus:ring-2 focus:ring-lime-400"
            rows={3}
            placeholder="Add special instructions (optional)"
          />
        </div>

        <button
          onClick={wrappedSubmitOrder}
          // Disable the button if submitting OR if the user is NOT a waiter
          disabled={isSubmitting || (!isWaiter && !isCashier && !isAdmin)}
          aria-label={submitLabel}
          className={`w-full bg-[linear-gradient(159deg,_rgba(62,180,137,1)_0%,_rgba(144,238,144,1)_100%)] text-white font-bold py-2 rounded hover:text-green-800 transition ${
            isSubmitting || (!isWaiter && !isCashier && !isAdmin)
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer"
          }`}
        >
          {isSubmitting ? "Submitting..." : "Submit Order"}
        </button>
        {!isWaiter && !isCashier && !isAdmin && (
          <p className="text-red-400 text-sm text-center mt-2">
            Only Waiters and Cashiers can submit orders.
          </p>
        )}
      </div>
    </div>
  );
}
