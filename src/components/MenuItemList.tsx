import { FoodItem, UIFoodOption } from "../types/Food";
import { useState } from "react";

interface MenuItemListProps {
  menu: FoodItem[];
  onToggleSelect: (id: string) => void;
  onChangeQuantity: (id: string, delta: number) => void;
  onToggleOption: (foodId: string, optionId: string) => void;
  onChangeOptionQuantity: (
    foodId: string,
    optionId: string,
    delta: number
  ) => void;
  onChangeRemark?: (foodId: string, remark: string) => void;
}

interface ItemSnapshot {
  id: string;
  wasSelected: boolean;
  quantity: number;
  options: { id: string; selected: boolean; quantity: number }[];
  remark: string;
}

export default function MenuItemList({
  menu,
  onToggleSelect,
  onChangeQuantity,
  onToggleOption,
  onChangeOptionQuantity,
  onChangeRemark,
}: MenuItemListProps) {
  const [openOptionsId, setOpenOptionsId] = useState<string | null>(null);
  const [optionError, setOptionError] = useState<string | null>(null);
  const [itemSnapshot, setItemSnapshot] = useState<ItemSnapshot | null>(null);

  const currentItem = menu.find((item) => item.id === openOptionsId);

  // Handler for clicking a food card
  const handleFoodClick = (item: FoodItem) => {
    const wasSelected = !!item.selected;

    // Capture initial state snapshot before any edits in this modal session
    setItemSnapshot({
      id: item.id,
      wasSelected,
      quantity: item.quantity || 1,
      options: (item.options || []).map((opt) => ({
        id: opt.id,
        selected: !!opt.selected,
        quantity: opt.quantity || 1,
      })),
      remark: item.remark || "",
    });

    if (!wasSelected) {
      onToggleSelect(item.id);
    }
    setOptionError(null);
    setOpenOptionsId(item.id);
  };

  // Helper to get the display price (first price or by orderType if needed)
  const getDisplayPrice = (item: FoodItem) => {
    if (!item.prices || item.prices.length === 0) return 0;
    return item.prices[0].price;
  };

  // Handle Cancel / X button: revert to previous state without saving or remembering changes
  const handleCancel = () => {
    if (currentItem && itemSnapshot && itemSnapshot.id === currentItem.id) {
      if (!itemSnapshot.wasSelected) {
        // If this item was not in the order prior to opening the modal, remove / deselect it
        if (currentItem.selected) {
          onToggleSelect(currentItem.id);
        }
      } else {
        // If it was already selected previously, revert all modifications made in this modal session
        // 1. Revert item quantity
        const qtyDiff = itemSnapshot.quantity - currentItem.quantity;
        if (qtyDiff !== 0) {
          onChangeQuantity(currentItem.id, qtyDiff);
        }

        // 2. Revert options selection and quantities
        const currentOptions = (currentItem.options as UIFoodOption[]) || [];
        itemSnapshot.options.forEach((snapOpt) => {
          const currOpt = currentOptions.find((o) => o.id === snapOpt.id);
          if (currOpt) {
            if (!!currOpt.selected !== snapOpt.selected) {
              onToggleOption(currentItem.id, snapOpt.id);
            }
            const currOptQty = currOpt.quantity || 1;
            const optQtyDiff = snapOpt.quantity - currOptQty;
            if (optQtyDiff !== 0) {
              onChangeOptionQuantity(currentItem.id, snapOpt.id, optQtyDiff);
            }
          }
        });

        // 3. Revert remark
        if ((currentItem.remark || "") !== itemSnapshot.remark) {
          onChangeRemark?.(currentItem.id, itemSnapshot.remark);
        }
      }
    }

    setOptionError(null);
    setOpenOptionsId(null);
    setItemSnapshot(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {menu.map(
          (item) =>
            getDisplayPrice(item) > 0 && (
              <div
                key={item.id}
                className="p-[2px] rounded-lg bg-[linear-gradient(159deg,_rgba(62,180,137,1)_0%,_rgba(144,238,144,1)_100%)]"
              >
                <div
                  onClick={() => handleFoodClick(item)}
                  className={`cursor-pointer rounded-lg p-3 shadow-sm flex flex-col h-full transition-shadow bg-gray-800  
                ${item.selected ? "ring-7 ring-blue-400" : "hover:shadow-md"}
              `}
                >
                  {/* Image */}
                  {item.imageUrl && (
                    <img
                      src={`/images/food/${item.imageUrl}`}
                      alt={item.name}
                      className="w-full h-36 object-cover rounded mb-2"
                    />
                  )}

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-between space-y-2 items-center">
                    <div className="flex flex-col items-start w-full">
                      <h2 className="text-base font-semibold text-white">
                        {item.name}
                      </h2>
                      <span className="text-green-300 font-bold mt-1">
                        Rp {getDisplayPrice(item).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
        )}
      </div>

      {/* Options & Quantity Modal */}
      {openOptionsId && currentItem && (() => {
        const options = (currentItem.options as UIFoodOption[]) || [];
        const isSambal = (name: string) =>
          name.trim().toLowerCase().includes("sambal");
        const nonSambalOptions = options.filter((opt) => !isSambal(opt.name));
        const sambalOptions = options.filter((opt) => isSambal(opt.name));

        const renderOptionRow = (opt: UIFoodOption) => (
          <div
            key={opt.id}
            className="flex justify-between items-center text-sm"
          >
            <label className="flex items-center space-x-3 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={!!opt.selected}
                onChange={() => onToggleOption(currentItem.id, opt.id)}
                className="w-6 h-6 accent-green-400 rounded focus:ring-2 focus:ring-green-400 transition-all duration-150"
                style={{ minWidth: "1.5rem", minHeight: "1.5rem" }}
              />
              <span className="text-base">
                {opt.name} (+Rp{opt.extraPrice})
              </span>
            </label>
            {opt.selected && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    onChangeOptionQuantity(currentItem.id, opt.id, -1)
                  }
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-green-300 text-black text-lg font-bold shadow hover:scale-110 transition cursor-pointer"
                  aria-label="Decrease"
                  type="button"
                >
                  –
                </button>
                <span className="text-white text-lg min-w-[2rem] text-center">
                  {opt.quantity ?? 1}
                </span>
                <button
                  onClick={() =>
                    onChangeOptionQuantity(currentItem.id, opt.id, 1)
                  }
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-green-300 text-black text-lg font-bold shadow hover:scale-110 transition cursor-pointer"
                  aria-label="Increase"
                  type="button"
                >
                  +
                </button>
              </div>
            )}
          </div>
        );

        const handleSubmit = () => {
          if (nonSambalOptions.length > 0) {
            const nonSambalTotalQty = nonSambalOptions.reduce(
              (sum, opt) => sum + (opt.selected ? (opt.quantity ?? 1) : 0),
              0
            );

            if (nonSambalTotalQty !== currentItem.quantity) {
              setOptionError(
                `Total option quantity (${nonSambalTotalQty}) must be equal to food quantity (${currentItem.quantity}).`
              );
              return;
            }
          }

          if (sambalOptions.length > 0) {
            const sambalTotalQty = sambalOptions.reduce(
              (sum, opt) => sum + (opt.selected ? (opt.quantity ?? 1) : 0),
              0
            );

            if (sambalTotalQty !== currentItem.quantity) {
              setOptionError(
                `Total sambal quantity (${sambalTotalQty}) must be equal to food quantity (${currentItem.quantity}).`
              );
              return;
            }
          }

          setOptionError(null);
          setOpenOptionsId(null);
          setItemSnapshot(null);
        };

        return (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-green-400 shadow-2xl relative">
              {/* Close / Cancel X Button */}
              <button
                type="button"
                className="absolute top-3.5 right-3.5 text-gray-400 hover:text-white hover:bg-gray-700/80 rounded-full w-8 h-8 flex items-center justify-center text-2xl transition cursor-pointer"
                onClick={handleCancel}
                aria-label="Cancel and Close"
              >
                ×
              </button>

              <h3 className="text-xl font-bold text-white mb-4 pr-8">
                {currentItem.name}
              </h3>

              {/* Quantity Controls */}
              <div className="flex justify-between items-center mb-4 bg-gray-900/60 p-3 rounded-xl border border-gray-700">
                <span className="text-sm font-semibold text-green-300">Quantity:</span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onChangeQuantity(currentItem.id, -1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-green-300 hover:bg-green-400 text-black text-lg font-bold shadow hover:scale-105 active:scale-95 transition cursor-pointer"
                    aria-label="Decrease"
                    type="button"
                  >
                    –
                  </button>
                  <span className="text-white text-lg font-bold min-w-[2rem] text-center">
                    {currentItem.quantity}
                  </span>
                  <button
                    onClick={() => onChangeQuantity(currentItem.id, 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-green-300 hover:bg-green-400 text-black text-lg font-bold shadow hover:scale-105 active:scale-95 transition cursor-pointer"
                    aria-label="Increase"
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3 max-h-70 overflow-y-auto pr-1">
                {nonSambalOptions.map(renderOptionRow)}

                {nonSambalOptions.length > 0 && sambalOptions.length > 0 && (
                  <hr className="border-t border-gray-700 my-3" />
                )}

                {sambalOptions.map(renderOptionRow)}
              </div>

              {/* Remark */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-green-300 mb-1">
                  Remark:
                </label>
                <input
                  type="text"
                  value={currentItem.remark || ""}
                  onChange={(e) =>
                    onChangeRemark?.(currentItem.id, e.target.value)
                  }
                  placeholder="e.g. nasi banyak, sambal banyak..."
                  className="w-full bg-gray-900/80 text-white border border-gray-700 focus:border-green-400 focus:ring-1 focus:ring-green-400 rounded-xl p-2.5 text-sm focus:outline-none transition"
                />
              </div>

              <div className="mt-6 flex flex-col space-y-2">
                <button
                  type="button"
                  className="cursor-pointer w-full py-2.5 rounded-xl bg-gradient-to-r from-green-400 to-emerald-400 text-slate-950 font-bold hover:from-green-300 hover:to-emerald-300 shadow-md transition"
                  onClick={handleSubmit}
                >
                  Add to Order
                </button>
                <button
                  type="button"
                  className="cursor-pointer w-full py-2 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 font-medium text-sm transition"
                  onClick={() => {
                    if (openOptionsId) {
                      onToggleSelect(openOptionsId); // Deselect the food item
                    }
                    setOpenOptionsId(null);
                    setOptionError(null);
                    setItemSnapshot(null);
                  }}
                >
                  Remove from Order
                </button>
              </div>

              {optionError && (
                <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
                  {optionError}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}
