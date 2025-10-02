import { useState } from "react";
import { fetchWithAuth } from "../utils/fetchWithAuth"; // Assume this is the fetch utility
import React from "react"; // Explicitly import React for React.Fragment

type Props = {
  outletId: string; // Required for the API endpoint
};

// --- TYPE DEFINITIONS (Unchanged) ---
interface OrderItemOptionDetail {
  id: string;
  name: string;
  extraPrice: number;
}

interface OrderItemOption {
  orderItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  option: OrderItemOptionDetail;
}

interface OrderItem {
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  food: { id: string; name: string };
  options: OrderItemOption[];
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  customerName: string | null;
  onlineCode: string | null;
  remark: string | null;
  waiter: { id: string; username: string };
  orderType: { id: string; name: string };
  items: OrderItem[];
}

interface BillingDetails {
  receiptNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  status: string; // PaymentStatus
  order: OrderDetails;
  // ... other Billing fields
}

// Helper component for styled input field
function InputField({
  label,
  value,
  onChange,
  onKeyDown, // 👈 NEW PROP: Accept an onKeyDown function
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void; // 👈 Add type definition
  type?: string;
  className?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown} // 👈 Apply the new prop to the input
        className="w-full bg-gray-800 text-white border border-gray-600 rounded p-2 focus:ring-green-500 focus:border-green-500"
      />
    </div>
  );
}

// --- NEW CONFIRMATION MODAL COMPONENT ---
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 backdrop-blur-sm transition-opacity">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm m-4 transform transition-all border border-green-500">
        <h3 className="text-xl font-bold text-green-400 border-b border-gray-700 pb-2 mb-4">
          Confirm Cancel Billing
        </h3>
        <p className="text-gray-200 mb-6">
          Are you sure you want to cancel this billing? 🚨 This action will
          reverse the transaction and **roll back ingredient inventory**.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition duration-150 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded flex items-center ${
              isLoading
                ? "bg-green-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            } text-white transition duration-150`}
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5 text-white mr-2"
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
            ) : null}
            {isLoading ? "Processing..." : "Confirm VOID"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function CancelBilling({ outletId }: Props) {
  const [receiptNumber, setReceiptNumber] = useState("");
  const [billingData, setBillingData] = useState<BillingDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Use your currency formatter
  const formatCurrency = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

  const fetchReceipt = async () => {
    if (!receiptNumber) {
      setError("Please enter a Receipt Number.");
      setBillingData(null);
      return;
    }

    setLoading(true);
    setError(null);
    setBillingData(null);

    try {
      const params = new URLSearchParams({
        outletId,
        receiptNumber,
      });

      const res = await fetchWithAuth(`/api/fetchBilling?${params.toString()}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch receipt data.");
      }

      const data: BillingDetails = await res.json();
      setBillingData(data);
      if (data.status === "VOID") {
        setError(`Receipt ${data.receiptNumber} is already VOIDED.`);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch receipt:", err);

      let errorMessage = "An unknown error occurred.";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
      ) {
        errorMessage = (err as { message: string }).message;
      }

      if (errorMessage.includes("not found")) {
        setError("Receipt not found for this Outlet ID and Receipt Number.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Check if the key pressed is 'Enter' (or 'Return')
    if (e.key === "Enter") {
      // Prevent the default action (e.g., submitting a form if the input is wrapped in one)
      e.preventDefault();
      // Only proceed if not already loading and receiptNumber is present
      if (!loading && receiptNumber && outletId) {
        fetchReceipt();
      }
    }
  };

  // --- NEW CANCELLATION HANDLER ---
  const handleCancelBilling = async () => {
    if (!billingData) return;

    setCancelling(true);
    setError(null);

    try {
      // Get the required data from the fetched state
      const {
        receiptNumber,
        order: { orderNumber },
      } = billingData;

      const res = await fetchWithAuth("/api/cancelBilling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outletId,
          receiptNumber,
          orderNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel billing.");
      }

      // Update the local billing data status and set success message
      setBillingData((prev) => (prev ? { ...prev, status: "VOID" } : null));
      setError(
        `Billing ${receiptNumber} successfully Cancelled ! Inventory rolled back.`
      );
    } catch (err: unknown) {
      console.error("Cancellation failed:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unknown cancellation error occurred.";
      setError(errorMsg);
    } finally {
      setCancelling(false);
      setIsModalOpen(false); // Close modal regardless of success/failure
    }
  };

  const DetailRow = ({
    label,
    value,
  }: {
    label: string;
    value: string | number | null | undefined;
  }) => (
    <div className="flex justify-between border-b border-gray-700 py-1">
      <span className="text-gray-400 font-medium">{label}</span>
      <span
        className={`font-semibold ${
          value === "VOID" ? "text-red-500" : "text-white"
        }`}
      >
        {value === null || value === undefined || value === "" ? "-" : value}
      </span>
    </div>
  );

  // Determine if the cancel button should be disabled
  const isVoided = billingData?.status === "VOID";
  const isCancelDisabled = !billingData || isVoided || cancelling || loading;

  return (
    <div className="p-6 space-y-6 text-white bg-gray-900 rounded-xl shadow-lg min-h-screen">
      <h1 className="text-3xl font-bold text-green-400">Cancel Billing</h1>

      {/* Input Form */}
      <div className="flex flex-col md:flex-row gap-4 mt-4 items-start md:items-end">
        <div className="w-full items-center justify-center md:w-auto max-w-xs sm:max-w-sm">
          <InputField
            label="Receipt Number"
            type="text"
            value={receiptNumber}
            onChange={setReceiptNumber}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          onClick={fetchReceipt}
          disabled={loading || !receiptNumber || !outletId}
          className={`px-10 py-2 rounded flex items-center justify-center w-full md:w-auto transition duration-200 ${
            loading
              ? "bg-green-300 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {loading ? (
            <svg
              className="animate-spin h-5 w-5 text-white mr-2"
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
            "Submit"
          )}
        </button>
      </div>

      {/* Display General Error/Status Message */}
      {error && (
        <p
          className={`text-center mt-4 ${
            isVoided ? "text-green-400" : "text-green-400"
          }`}
        >
          {error}
        </p>
      )}

      {/* --- Receipt Data Display --- */}
      {billingData && (
        <div className="mt-6 space-y-6">
          <h2 className="text-xl font-bold text-green-300 border-b border-green-600 pb-2">
            Billing Summary
          </h2>

          {/* Header Data in a two-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 p-4 bg-gray-800 rounded-lg shadow-inner">
            <div className="space-y-1">
              {/* ... (DetailRow components remain the same) ... */}
              <DetailRow
                label="Receipt Number"
                value={billingData.receiptNumber}
              />
              <DetailRow
                label="Subtotal"
                value={formatCurrency(billingData.subtotal)}
              />
              <DetailRow
                label="Discount"
                value={formatCurrency(billingData.discount)}
              />
              <DetailRow
                label="Total Paid"
                value={formatCurrency(billingData.total)}
              />
              <DetailRow
                label="Amount Paid"
                value={formatCurrency(billingData.amountPaid)}
              />
              <DetailRow label="Payment Status" value={billingData.status} />
            </div>

            <div className="space-y-1 pt-4 md:pt-0">
              <DetailRow
                label="Order Number"
                value={billingData.order.orderNumber}
              />
              <DetailRow
                label="Order Type"
                value={billingData.order.orderType.name}
              />
              <DetailRow
                label="Waiter"
                value={billingData.order.waiter.username}
              />
              <DetailRow
                label="Customer Name"
                value={billingData.order.customerName}
              />
              <DetailRow
                label="Online Code"
                value={billingData.order.onlineCode}
              />
              <DetailRow label="Remark" value={billingData.order.remark} />
            </div>
          </div>

          {/* Items Table */}
          <h2 className="text-xl font-bold text-green-300 border-b border-green-600 pb-2 pt-4">
            Order Items
          </h2>

          <div className="overflow-x-auto rounded border border-green-400">
            <table className="w-full text-sm">
              <thead className="bg-green-700 text-white">
                <tr>
                  <th className="px-4 py-2 text-left w-3/5">Item Menu</th>
                  <th className="px-4 py-2 text-center w-1/12">Qty</th>
                  <th className="px-4 py-2 text-right w-1/6">Unit Price</th>
                  <th className="px-4 py-2 text-right w-1/6">Total Price</th>
                </tr>
              </thead>
              <tbody>
                {billingData.order.items.map((item, idx) => (
                  <React.Fragment key={`item-group-${idx}`}>
                    {/* 1. Main Order Item Row */}
                    <tr
                      className={`border-b border-gray-700 font-bold ${
                        idx % 2 === 0 ? "bg-gray-700" : "bg-gray-800"
                      } hover:bg-gray-600 transition duration-150`}
                    >
                      <td className="px-4 py-2 text-teal-300 whitespace-nowrap">
                        {item.food.name}
                      </td>
                      <td className="px-4 py-2 text-center">{item.quantity}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>

                    {/* 2. Nested Option Rows (if any) */}
                    {item.options.map((option, optIdx) => (
                      <tr
                        key={`option-${idx}-${optIdx}`}
                        className={`text-sm ${
                          idx % 2 === 0 ? "bg-gray-800/80" : "bg-gray-700/80"
                        } border-b border-gray-700/50`}
                      >
                        <td className="px-8 py-1 text-gray-400 italic">
                          ↳ {option.option.name}
                        </td>
                        <td className="px-4 py-1 text-center text-gray-500">
                          {option.quantity}
                        </td>
                        <td className="px-4 py-1"></td>{" "}
                        {/* Unit Price (Hidden) */}
                        <td className="px-4 py-1"></td>{" "}
                        {/* Total Price (Hidden) */}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- NEW CANCEL BUTTON AREA --- */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={isCancelDisabled}
              className={`px-6 py-3 rounded text-lg font-bold transition duration-200 shadow-xl ${
                isCancelDisabled
                  ? "bg-gray-500 cursor-not-allowed text-gray-300"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {isVoided ? "Status: VOIDED" : "Cancel Billing"}
            </button>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL --- */}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCancelBilling}
        isLoading={cancelling}
      />
    </div>
  );
}
