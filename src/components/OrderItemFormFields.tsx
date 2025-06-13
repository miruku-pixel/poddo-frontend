// src/components/OrderItemFormFields.tsx

import { useFormContext, useFieldArray } from "react-hook-form";
import { OrderForm } from "../pages/OrderEditPage";
import { useState } from "react"; // Import useState for the loading indicator

interface OrderItemFormFieldsProps {
  itemIdx: number;
  onRemoveItem: (idx: number) => void;
  onCancelItem: (idx: number) => void;
}

export default function OrderItemFormFields({
  itemIdx,
}: OrderItemFormFieldsProps) {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<OrderForm>();

  const { fields: optionFields } = useFieldArray({
    control,
    name: `items.${itemIdx}.options` as const,
  });

  const watchItems = watch(`items.${itemIdx}`);
  const currentItemStatus = watchItems?.status;
  const watchOptions = watchItems?.options;

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // State to manage loading indicator

  const handleCancelItem = async () => {
    // Make function async
    setIsUpdatingStatus(true); // Set loading to true when action starts
    try {
      const newStatus =
        currentItemStatus === "CANCELED" ? "ACTIVE" : "CANCELED";
      setValue(`items.${itemIdx}.status`, newStatus);
      setValue(
        `items.${itemIdx}.options`,
        (watchOptions || []).map((opt) => ({
          ...opt,
          status: newStatus,
        }))
      );
      // Simulate an asynchronous operation (e.g., API call)
      // If this button triggers a direct API update, replace this with your actual fetch logic
      await new Promise((resolve) => setTimeout(resolve, 300)); // Small delay for visual effect
    } catch (error) {
      console.error("Error toggling item status:", error);
      // Handle error (e.g., display an error message to the user)
    } finally {
      setIsUpdatingStatus(false); // Set loading to false when action finishes
    }
  };

  const isCanceled = currentItemStatus === "CANCELED";

  return (
    <div
      key={itemIdx}
      className={`p-4 border rounded-xl space-y-3 ${
        isCanceled
          ? "bg-red-950 border-red-500 opacity-70"
          : "bg-gray-900 border-green-400"
      }`}
    >
      <div className="flex justify-between items-center">
        <h3
          className={`text-lg font-semibold ${
            isCanceled ? "text-red-300 line-through" : "text-green-300"
          }`}
        >
          {watchItems?.foodName}
        </h3>
        {isCanceled && (
          <span className="text-sm text-red-400 font-medium">Canceled</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-white mb-1 block">Quantity</label>
          <input
            type="number"
            min={0}
            {...register(`items.${itemIdx}.quantity`, {
              required: true,
              min: 0,
            })}
            className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              isCanceled
                ? "border-red-500 text-red-400 focus:ring-red-500"
                : "border-green-400 text-white focus:ring-green-400"
            }`}
            disabled={isCanceled}
          />
          {errors.items?.[itemIdx]?.quantity && (
            <p className="text-red-400 text-xs mt-1">Quantity must be ≥ 0</p>
          )}
        </div>

        <div>
          <label className="text-sm text-white mb-1 block">Status</label>
          <select
            {...register(`items.${itemIdx}.status`)}
            className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              isCanceled
                ? "border-red-500 text-red-400 focus:ring-red-500"
                : "border-green-400 text-white focus:ring-green-400"
            }`}
            disabled={isCanceled}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {optionFields.map((opt, optIdx) => {
          const optStatus = watchOptions?.[optIdx]?.status;
          const isOptCanceled = optStatus === "CANCELED";

          return (
            <div
              key={opt.id}
              className={`border rounded p-3 space-y-2 ${
                isOptCanceled
                  ? "bg-red-950 border-red-500 opacity-70"
                  : "bg-gray-900 border-green-400"
              }`}
            >
              <input
                type="hidden"
                {...register(`items.${itemIdx}.options.${optIdx}.id`)}
              />

              <div
                className={`text-sm font-medium ${
                  isOptCanceled ? "text-red-300" : "text-white"
                }`}
              >
                {watchOptions?.[optIdx]?.optionName || "(Unnamed Option)"}
                {isOptCanceled && (
                  <span className="ml-2 text-red-400 text-xs">(Canceled)</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-white block mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    {...register(
                      `items.${itemIdx}.options.${optIdx}.quantity`,
                      {
                        required: true,
                        min: 0,
                      }
                    )}
                    className={`w-full bg-gray-900 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 ${
                      isOptCanceled
                        ? "border-red-500 text-red-400 focus:ring-red-500"
                        : "border-green-400 text-white focus:ring-green-400"
                    }`}
                    disabled={isOptCanceled}
                  />
                  {errors.items?.[itemIdx]?.options?.[optIdx]?.quantity && (
                    <p className="text-red-400 text-xs mt-1">Must be ≥ 0</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-white block mb-1">
                    Status
                  </label>
                  <select
                    {...register(`items.${itemIdx}.options.${optIdx}.status`, {
                      required: true,
                    })}
                    className={`w-full bg-gray-900 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 ${
                      isOptCanceled
                        ? "border-red-500 text-red-400 focus:ring-red-500"
                        : "border-green-400 text-white focus:ring-green-400"
                    }`}
                    disabled={isCanceled}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="CANCELED">CANCELED</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2 border-t border-green-400 mt-4">
        {" "}
        {/* Aligns button to the right */}
        <button
          type="button"
          onClick={handleCancelItem}
          disabled={isUpdatingStatus} // Disable button when updating
          className={`w-full sm:w-auto text-sm flex items-center justify-center ${
            // Added w-full sm:w-auto and flex utility classes
            isCanceled
              ? "bg-green-600 hover:bg-green-500"
              : "bg-red-600 hover:bg-red-500"
          } text-white px-4 py-2 rounded transition ${
            isUpdatingStatus ? "opacity-50 cursor-not-allowed" : "" // Add opacity and not-allowed cursor
          }`}
        >
          {isUpdatingStatus ? (
            <svg
              className="animate-spin h-5 w-5 text-white" // Removed -ml-1 mr-3 for centered spinner
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
          ) : isCanceled ? (
            "Undo Canceled"
          ) : (
            "Mark Canceled"
          )}
        </button>
      </div>
    </div>
  );
}
