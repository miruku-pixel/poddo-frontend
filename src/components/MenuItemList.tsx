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
}

export default function MenuItemList({
  menu,
  onToggleSelect,
  onChangeQuantity,
  onToggleOption,
  onChangeOptionQuantity,
}: MenuItemListProps) {
  const [openOptionsId, setOpenOptionsId] = useState<string | null>(null);
  const [optionError, setOptionError] = useState<string | null>(null);

  const currentItem = menu.find((item) => item.id === openOptionsId);

  // Handler for clicking a food card
  const handleFoodClick = (item: FoodItem) => {
    if (!item.selected) {
      onToggleSelect(item.id);
      setOpenOptionsId(item.id);
    } else {
      onToggleSelect(item.id);
    }
  };

  // Helper to get the display price (first price or by orderType if needed)
  const getDisplayPrice = (item: FoodItem) => {
    if (!item.prices || item.prices.length === 0) return 0;
    return item.prices[0].price;
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                ${item.selected ? "ring-4 ring-lime-400" : "hover:shadow-md"}
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
      {openOptionsId && currentItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border-2 border-green-400 relative">
            <h3 className="text-lg font-bold text-white mb-4">
              {currentItem.name}
            </h3>
            {/* Quantity Controls */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-green-300">Quantity:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onChangeQuantity(currentItem.id, -1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-green-300 text-black text-lg font-bold shadow hover:scale-110 transition"
                  aria-label="Decrease"
                  type="button"
                >
                  –
                </button>
                <span className="text-white text-lg min-w-[2rem] text-center">
                  {currentItem.quantity}
                </span>
                <button
                  onClick={() => onChangeQuantity(currentItem.id, 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-green-300 text-black text-lg font-bold shadow hover:scale-110 transition"
                  aria-label="Increase"
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
            {/* Options */}
            <div className="space-y-3">
              {(currentItem.options as UIFoodOption[]).map((opt) => (
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
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-green-300 text-black text-lg font-bold shadow hover:scale-110 transition"
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
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-green-300 text-black text-lg font-bold shadow hover:scale-110 transition"
                        aria-label="Increase"
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              className="absolute top-2 right-2 text-green-400 hover:text-white text-4xl p-2"
              onClick={() => {
                if (openOptionsId) {
                  onToggleSelect(openOptionsId); // Deselect the food
                }
                setOpenOptionsId(null); // Close the modal
                setOptionError(null); // Clear any validation errors
              }}
              aria-label="Close"
            >
              ×
            </button>
            <button
              className="cursor-pointer mt-6 w-full px-4 py-2 rounded bg-green-300 text-black font-bold hover:bg-green-400"
              onClick={() => {
                const options = currentItem.options as UIFoodOption[];
                const hasOptions = options.length > 0;
                const hasSelectedOption = options.some((opt) => opt.selected);

                if (hasOptions && !hasSelectedOption) {
                  setOptionError("Please select at least one option.");
                  return;
                }

                setOpenOptionsId(null);
                setOptionError(null);
                setOpenOptionsId(null);
              }}
            >
              Submit
            </button>
            {optionError && (
              <p className="text-red-400 text-sm mt-2 text-center">
                {optionError}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
