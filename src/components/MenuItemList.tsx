import { FoodItem, OrderCartSet, OrderCartOption, UIFoodOption } from "../types/Food";
import { useState, useMemo, useEffect } from "react";
import { sortFoodItems } from "../utils/foodSort";

interface MenuItemListProps {
  menu: FoodItem[];
  cartSets: OrderCartSet[];
  onSaveSet: (set: OrderCartSet, editingTempId?: string | null) => void;
  editingSet?: OrderCartSet | null;
  onCloseEdit?: () => void;
}

export default function MenuItemList({
  menu,
  cartSets,
  onSaveSet,
  editingSet,
  onCloseEdit,
}: MenuItemListProps) {
  const [activeFoodId, setActiveFoodId] = useState<string | null>(null);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);
  const [selectedSambalId, setSelectedSambalId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [remark, setRemark] = useState<string>("");
  const [optionError, setOptionError] = useState<string | null>(null);

  // When editingSet prop is provided from parent (OrderSummary [Edit] button)
  useEffect(() => {
    if (editingSet) {
      const food = menu.find((item) => item.id === editingSet.foodId);
      if (food) {
        setActiveFoodId(food.id);
        setEditingTempId(editingSet.tempId);
        setSelectedCutId(editingSet.selectedCut?.id || null);
        setSelectedSambalId(editingSet.selectedSambal?.id || null);
        setQuantity(editingSet.quantity || 1);
        setRemark(editingSet.remark || "");
        setOptionError(null);
      }
    }
  }, [editingSet, menu]);

  const currentItem = menu.find((item) => item.id === activeFoodId);

  // Helper to get display price
  const getDisplayPrice = (item: FoodItem) => {
    if (!item.prices || item.prices.length === 0) return 0;
    return item.prices[0].price;
  };

  // Open modal for a new set
  const handleFoodCardClick = (item: FoodItem) => {
    setActiveFoodId(item.id);
    setEditingTempId(null);
    setOptionError(null);
    setQuantity(1);
    setRemark("");

    const options = item.options || [];
    const isSambal = (name: string) => name.trim().toLowerCase().includes("sambal");
    const nonSambalOptions = options.filter((opt) => !isSambal(opt.name));
    const sambalOptions = options.filter((opt) => isSambal(opt.name));

    // Default select the first option if available
    setSelectedCutId(nonSambalOptions.length > 0 ? nonSambalOptions[0].id : null);
    setSelectedSambalId(sambalOptions.length > 0 ? sambalOptions[0].id : null);
  };

  const handleCloseModal = () => {
    setActiveFoodId(null);
    setEditingTempId(null);
    setOptionError(null);
    setSelectedCutId(null);
    setSelectedSambalId(null);
    setQuantity(1);
    setRemark("");
    onCloseEdit?.();
  };

  const handleFormSubmit = () => {
    if (!currentItem) return;

    const options = currentItem.options || [];
    const isSambal = (name: string) => name.trim().toLowerCase().includes("sambal");
    const nonSambalOptions = options.filter((opt) => !isSambal(opt.name));
    const sambalOptions = options.filter((opt) => isSambal(opt.name));

    if (nonSambalOptions.length > 0 && !selectedCutId) {
      setOptionError("Please choose one option (Varian).");
      return;
    }

    if (sambalOptions.length > 0 && !selectedSambalId) {
      setOptionError("Please choose one sambal option.");
      return;
    }

    const chosenCut = nonSambalOptions.find((opt) => opt.id === selectedCutId);
    const chosenSambal = sambalOptions.find((opt) => opt.id === selectedSambalId);

    const selectedCutObj: OrderCartOption | null = chosenCut
      ? { id: chosenCut.id, name: chosenCut.name, extraPrice: chosenCut.extraPrice }
      : null;

    const selectedSambalObj: OrderCartOption | null = chosenSambal
      ? { id: chosenSambal.id, name: chosenSambal.name, extraPrice: chosenSambal.extraPrice }
      : null;

    const setPayload: OrderCartSet = {
      tempId: editingTempId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `set_${Date.now()}_${Math.random()}`),
      foodId: currentItem.id,
      foodName: currentItem.name,
      foodPrice: getDisplayPrice(currentItem),
      quantity: Math.max(1, quantity),
      selectedCut: selectedCutObj,
      selectedSambal: selectedSambalObj,
      remark: remark.trim(),
    };

    onSaveSet(setPayload, editingTempId);
    handleCloseModal();
  };

  const sortedMenu = useMemo(() => sortFoodItems(menu), [menu]);

  // Aggregate quantity per food item in cart for card badge
  const foodCartCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    cartSets.forEach((set) => {
      map[set.foodId] = (map[set.foodId] || 0) + set.quantity;
    });
    return map;
  }, [cartSets]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
        {sortedMenu.map((item) => {
          const itemPrice = getDisplayPrice(item);
          if (itemPrice <= 0) return null;

          const cartCount = foodCartCountMap[item.id] || 0;
          const isInCart = cartCount > 0;

          return (
            <div
              key={item.id}
              className={`p-[2px] rounded-xl transition-all ${
                isInCart
                  ? "bg-gradient-to-r from-emerald-400 to-green-300 shadow-lg shadow-green-500/20"
                  : "bg-[linear-gradient(159deg,_rgba(62,180,137,0.4)_0%,_rgba(144,238,144,0.2)_100%)] hover:bg-gradient-to-r hover:from-emerald-500 hover:to-green-400"
              }`}
            >
              <div
                onClick={() => handleFoodCardClick(item)}
                className={`cursor-pointer rounded-[10px] p-2 sm:p-3 shadow-sm flex flex-col h-full bg-gray-800 transition relative active:scale-[0.98] touch-manipulation ${
                  isInCart ? "ring-2 ring-emerald-400" : "hover:shadow-md"
                }`}
              >
                {/* Cart Quantity Badge */}
                {isInCart && (
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-emerald-500 text-black font-extrabold text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-md z-10 flex items-center space-x-1">
                    <span>{cartCount} in cart</span>
                  </div>
                )}

                {/* Image */}
                {item.imageUrl && (
                  <img
                    src={`/images/food/${item.imageUrl}`}
                    alt={item.name}
                    className="w-full h-28 sm:h-36 object-cover rounded-lg mb-2"
                  />
                )}

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between space-y-1.5 sm:space-y-2 items-center">
                  <div className="flex flex-col items-start w-full">
                    <h2 className="text-xs sm:text-sm md:text-base font-semibold text-white line-clamp-2 leading-tight">
                      {item.name}
                    </h2>
                    <span className="text-green-300 font-bold text-xs sm:text-sm mt-1">
                      Rp {itemPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Set Configuration Modal */}
      {activeFoodId && currentItem && (() => {
        const options = (currentItem.options || []) as UIFoodOption[];
        const isSambal = (name: string) => name.trim().toLowerCase().includes("sambal");
        const nonSambalOptions = options.filter((opt) => !isSambal(opt.name));
        const sambalOptions = options.filter((opt) => isSambal(opt.name));

        const chosenCut = nonSambalOptions.find((opt) => opt.id === selectedCutId);
        const chosenSambal = sambalOptions.find((opt) => opt.id === selectedSambalId);
        const unitBasePrice = getDisplayPrice(currentItem);
        const extraPrices = (chosenCut?.extraPrice || 0) + (chosenSambal?.extraPrice || 0);
        const liveSetTotal = (unitBasePrice + extraPrices) * quantity;

        return (
          <div className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-50 p-3 sm:p-4">
            <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 w-full max-w-lg md:max-w-2xl lg:max-w-3xl border border-green-400 shadow-2xl relative max-h-[92vh] flex flex-col">
              {/* Close X Button */}
              <button
                type="button"
                className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 text-gray-400 hover:text-white active:bg-gray-700/80 rounded-full w-9 h-9 flex items-center justify-center text-2xl transition cursor-pointer touch-manipulation z-10"
                onClick={handleCloseModal}
                aria-label="Cancel and Close"
              >
                ×
              </button>

              {/* Modal Header */}
              <div className="pr-10 mb-3 sm:mb-4 border-b border-gray-700 pb-2.5">
                <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {currentItem.name}
                </h3>
                <p className="text-green-400 font-semibold text-xs sm:text-sm">
                  Base Price: Rp {unitBasePrice.toLocaleString("id-ID")} / set
                </p>
              </div>

              {/* 2-Column Responsive Body (Side-by-Side on Desktop, Stacked on Mobile) */}
              <div className="flex flex-col md:flex-row gap-4 sm:gap-5 flex-1 overflow-hidden">
                {/* Left Column: Varian and Sambal Selection */}
                <div className="w-full md:w-7/12 overflow-y-auto space-y-3 pr-1 max-h-[45vh] md:max-h-[60vh]">
                  {/* Varian / Options (Radio) */}
                  {nonSambalOptions.length > 0 && (
                    <div className="bg-gray-900/60 p-3 sm:p-3.5 rounded-xl border border-gray-700">
                      <div className="text-xs font-semibold text-green-300 uppercase tracking-wider mb-2">
                        1. Choose Varian / Pilihan
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        {nonSambalOptions.map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition touch-manipulation ${
                              selectedCutId === opt.id
                                ? "bg-emerald-950/80 border-emerald-400 text-white shadow-sm"
                                : "bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700/50"
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="radio"
                                name="foodCutOption"
                                value={opt.id}
                                checked={selectedCutId === opt.id}
                                onChange={() => {
                                  setSelectedCutId(opt.id);
                                  setOptionError(null);
                                }}
                                className="w-5 h-5 accent-emerald-400 cursor-pointer"
                              />
                              <span className="font-medium text-sm">{opt.name}</span>
                            </div>
                            {opt.extraPrice > 0 && (
                              <span className="text-xs font-semibold text-emerald-300">
                                +Rp {opt.extraPrice.toLocaleString("id-ID")}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sambal Options (Radio) */}
                  {sambalOptions.length > 0 && (
                    <div className="bg-gray-900/60 p-3 sm:p-3.5 rounded-xl border border-gray-700">
                      <div className="text-xs font-semibold text-green-300 uppercase tracking-wider mb-2">
                        2. Choose Sambal
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        {sambalOptions.map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition touch-manipulation ${
                              selectedSambalId === opt.id
                                ? "bg-emerald-950/80 border-emerald-400 text-white shadow-sm"
                                : "bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700/50"
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="radio"
                                name="foodSambalOption"
                                value={opt.id}
                                checked={selectedSambalId === opt.id}
                                onChange={() => {
                                  setSelectedSambalId(opt.id);
                                  setOptionError(null);
                                }}
                                className="w-5 h-5 accent-emerald-400 cursor-pointer"
                              />
                              <span className="font-medium text-sm">{opt.name}</span>
                            </div>
                            {opt.extraPrice > 0 && (
                              <span className="text-xs font-semibold text-emerald-300">
                                +Rp {opt.extraPrice.toLocaleString("id-ID")}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {nonSambalOptions.length === 0 && sambalOptions.length === 0 && (
                    <div className="p-4 text-center text-gray-400 text-xs sm:text-sm italic bg-gray-900/40 rounded-xl border border-gray-700">
                      Standard item with no extra options.
                    </div>
                  )}
                </div>

                {/* Right Column (Desktop): Quantity, Note, Price & Actions */}
                <div className="w-full md:w-5/12 flex flex-col justify-between space-y-3 bg-gray-900/60 p-3.5 sm:p-4 rounded-xl border border-gray-700">
                  <div className="space-y-3">
                    {/* Quantity Controls */}
                    <div>
                      <span className="text-xs font-semibold text-green-300 uppercase tracking-wider block mb-1.5">
                        Quantity:
                      </span>
                      <div className="flex items-center justify-between bg-gray-800/90 p-2.5 rounded-lg border border-gray-700">
                        <span className="text-xs text-gray-400">Total Sets</span>
                        <div className="flex items-center space-x-2.5">
                          <button
                            type="button"
                            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-green-300 hover:bg-green-400 text-black text-lg font-bold shadow hover:scale-105 active:scale-95 transition cursor-pointer touch-manipulation"
                            aria-label="Decrease"
                          >
                            –
                          </button>
                          <span className="text-white text-base font-bold min-w-[2rem] text-center">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity((prev) => prev + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-green-300 hover:bg-green-400 text-black text-lg font-bold shadow hover:scale-105 active:scale-95 transition cursor-pointer touch-manipulation"
                            aria-label="Increase"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Set Notes / Instruction */}
                    <div>
                      <label className="block text-xs font-semibold text-green-300 uppercase tracking-wider mb-1.5">
                        Set Notes / Instruction:
                      </label>
                      <textarea
                        rows={2}
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder="e.g. sambal dipisah, manis, dll..."
                        className="w-full bg-gray-800 text-white border border-gray-700 focus:border-green-400 focus:ring-1 focus:ring-green-400 rounded-lg p-2 text-xs sm:text-sm focus:outline-none transition resize-none"
                      />
                    </div>

                    {/* Live Line Total */}
                    <div className="pt-2 border-t border-gray-800 flex justify-between items-center text-xs sm:text-sm font-semibold">
                      <span className="text-gray-300">Set Total:</span>
                      <span className="text-emerald-300 font-extrabold text-sm sm:text-base">
                        Rp {liveSetTotal.toLocaleString("id-ID")}
                      </span>
                    </div>

                    {optionError && (
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
                        {optionError}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 pt-2">
                    <button
                      type="button"
                      className="cursor-pointer w-full py-2.5 rounded-xl bg-gradient-to-r from-green-400 to-emerald-400 text-slate-950 font-bold hover:from-green-300 hover:to-emerald-300 shadow-md transition touch-manipulation text-sm"
                      onClick={handleFormSubmit}
                    >
                      {editingTempId ? "Update Set" : "Add to Order"}
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer w-full py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 font-medium text-xs sm:text-sm transition touch-manipulation"
                      onClick={handleCloseModal}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
