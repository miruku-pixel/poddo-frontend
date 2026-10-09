import { useState } from "react";
import { OrderCartSet } from "../types/Food";

type OrderSummaryProps = {
  cartSets: OrderCartSet[];
  totalPrice: number;
  orderRemark: string;
  setOrderRemark: (remark: string) => void;
  submitOrder: () => void;
  submitLabel?: string;
  currentUserRole?: string | null;
  onEditSet: (set: OrderCartSet) => void;
  onDeleteSet: (tempId: string) => void;
  onChangeSetQuantity: (tempId: string, delta: number) => void;
};

export default function OrderSummary({
  cartSets,
  totalPrice,
  orderRemark,
  setOrderRemark,
  submitOrder,
  submitLabel,
  currentUserRole,
  onEditSet,
  onDeleteSet,
  onChangeSetQuantity,
}: OrderSummaryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine role permissions
  const isWaiter = currentUserRole === "WAITER";
  const isCashier = currentUserRole === "CASHIER";
  const isAdmin = currentUserRole === "ADMIN";

  const wrappedSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      await submitOrder();
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

  const getSetLineTotal = (set: OrderCartSet) => {
    const cutExtra = set.selectedCut?.extraPrice || 0;
    const sambalExtra = set.selectedSambal?.extraPrice || 0;
    const otherExtra = (set.otherOptions || []).reduce(
      (sum, opt) => sum + opt.extraPrice * (opt.quantity || 1),
      0
    );
    const unitTotal = set.foodPrice + cutExtra + sambalExtra + otherExtra;
    return unitTotal * set.quantity;
  };

  return (
    <div className="mt-6 lg:mt-0 p-[2px] rounded-xl bg-[linear-gradient(159deg,_rgba(62,180,137,1)_0%,_rgba(144,238,144,1)_100%)] shadow">
      <div className="p-4 rounded-xl bg-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-green-300">Your Order</h3>
          <span className="text-xs bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/40 font-medium">
            {cartSets.length} {cartSets.length === 1 ? "Set" : "Sets"}
          </span>
        </div>

        {cartSets.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm italic bg-gray-900/40 rounded-xl border border-gray-700">
            No items in order yet.<br />Click a menu item to add a set.
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {cartSets.map((set, idx) => (
              <div
                key={set.tempId}
                className="p-3 bg-gray-900/80 rounded-xl border border-gray-700 hover:border-green-500/50 transition space-y-2"
              >
                {/* Header: Set index + Food Name + Line Total */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 mr-1.5">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-white">
                      {set.foodName}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-emerald-300 ml-2 whitespace-nowrap">
                    {formatPrice(getSetLineTotal(set))}
                  </span>
                </div>

                {/* Option Pills (Varian & Sambal) */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {set.selectedCut && (
                    <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-medium">
                      Varian: {set.selectedCut.name}
                    </span>
                  )}
                  {set.selectedSambal && (
                    <span className="bg-emerald-950/80 text-red-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-medium">
                      {set.selectedSambal.name}
                    </span>
                  )}
                </div>

                {/* Set Note / Remark */}
                {set.remark && (
                  <div className="text-xs text-yellow-300/90 italic bg-yellow-950/30 px-2 py-1 rounded border border-yellow-700/30">
                    Note: {set.remark}
                  </div>
                )}

                {/* Footer Controls: Quantity Stepper + Edit / Delete Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                  {/* Quantity Stepper (Enlarged for touch screens) */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => onChangeSetQuantity(set.tempId, -1)}
                      className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white text-xs font-bold transition cursor-pointer touch-manipulation"
                      aria-label="Decrease quantity"
                    >
                      –
                    </button>
                    <span className="text-white text-sm font-bold min-w-[1.25rem] text-center">
                      {set.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeSetQuantity(set.tempId, 1)}
                      className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white text-xs font-bold transition cursor-pointer touch-manipulation"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Edit & Delete Buttons (Touch friendly) */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => onEditSet(set)}
                      className="text-xs px-2.5 py-1 sm:px-2 sm:py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 active:bg-blue-500/40 transition cursor-pointer font-medium touch-manipulation"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSet(set.tempId)}
                      className="text-xs px-2.5 py-1 sm:px-2 sm:py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 active:bg-red-500/40 transition cursor-pointer font-medium touch-manipulation"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-b border-green-700 pt-1" />

        <div className="flex justify-between text-lg font-semibold text-white">
          <span>Total Price:</span>
          <span>{formatPrice(totalPrice)}</span>
        </div>

        <div>
          <label
            htmlFor="remark"
            className="block font-medium mb-1 text-green-300 text-sm"
          >
            Order-Level Remark (optional):
          </label>
          <textarea
            id="remark"
            value={orderRemark}
            onChange={(e) => setOrderRemark(e.target.value)}
            className="w-full rounded-xl p-2.5 bg-gray-900/80 text-white border border-green-300/60 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400 text-sm"
            rows={2}
            placeholder="Add general instructions for order..."
          />
        </div>

        <button
          onClick={wrappedSubmitOrder}
          disabled={isSubmitting || cartSets.length === 0 || (!isWaiter && !isCashier && !isAdmin)}
          aria-label={submitLabel}
          className={`w-full bg-[linear-gradient(159deg,_rgba(62,180,137,1)_0%,_rgba(144,238,144,1)_100%)] text-white font-bold py-2.5 rounded-xl hover:text-green-950 transition ${isSubmitting || cartSets.length === 0 || (!isWaiter && !isCashier && !isAdmin)
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
            }`}
        >
          {isSubmitting ? "Submitting..." : "Submit Order"}
        </button>
        {!isWaiter && !isCashier && !isAdmin && (
          <p className="text-red-400 text-xs text-center mt-2">
            Only Waiters and Cashiers can submit orders.
          </p>
        )}
      </div>
    </div>
  );
}

