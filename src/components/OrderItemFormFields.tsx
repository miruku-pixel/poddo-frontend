// src/components/OrderItemFormFields.tsx

import { useFormContext, useFieldArray } from "react-hook-form";
import { OrderForm } from "../pages/OrderEditPage";

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

  const handleCancelItem = () => {
    const newStatus = currentItemStatus === "CANCELED" ? "ACTIVE" : "CANCELED";
    setValue(`items.${itemIdx}.status`, newStatus);
    setValue(
      `items.${itemIdx}.options`,
      (watchOptions || []).map((opt) => ({
        ...opt,
        status: newStatus,
      }))
    );
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

      <div className="text-center flex flex-wrap gap-2 pt-2 border-t border-green-400 mt-4">
        <button
          type="button"
          onClick={handleCancelItem}
          className={`text-sm ${
            isCanceled
              ? "bg-green-600 hover:bg-green-500"
              : "bg-red-600 hover:bg-red-500"
          } text-white px-4 py-2 rounded`}
        >
          {isCanceled ? "Undo Canceled" : "Mark Canceled"}
        </button>
      </div>
    </div>
  );
}
