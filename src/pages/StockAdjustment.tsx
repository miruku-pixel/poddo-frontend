import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../utils/fetchWithAuth";

type Props = {
  outletId: string;
  outletName: string;
};

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

interface AdjustmentLog {
  id: string;
  adjustmentNo: string;
  ingredient: { name: string; unit: string };
  type: "IN" | "OUT";
  quantity: number;
  notes: string | null;
  adjustedBy: { username: string };
  createdAt: string;
}

export default function StockAdjustment({ outletId, outletName }: Props) {
  // Form and data states
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  // History and loading states
  const [history, setHistory] = useState<AdjustmentLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleClearMessages = useCallback(() => {
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  const loadHistory = useCallback(async () => {
    if (!outletId) return;
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/inventory/adjustment?outletId=${outletId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to load adjustment history.");
      }
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load history.";
      setErrorMessage(message);
      console.error("Failed to load history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Fetch initial list of ingredients
  useEffect(() => {
    const loadIngredients = async () => {
      if (!outletId) return;
      try {
        const res = await fetchWithAuth(`/api/inventory/ingredients?outletId=${outletId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch ingredients.");
        }
        const data: Ingredient[] = await res.json();
        setIngredients(data);
      } catch (err) {
        console.error("Error loading ingredients:", err);
        setErrorMessage("Failed to load ingredients for selection.");
      }
    };
    loadIngredients();
  }, [outletId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleClearMessages();

    if (!selectedIngredientId) {
      setErrorMessage("Please select an ingredient.");
      return;
    }

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMessage("Please enter a valid positive quantity.");
      return;
    }

    const selectedIngredient = ingredients.find((i) => i.id === selectedIngredientId);

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/inventory/adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          ingredientId: selectedIngredientId,
          type: adjustmentType,
          quantity: parsedQty,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to complete stock adjustment.");
      }

      setSuccessMessage(`Stock adjusted successfully! ${adjustmentType} ${parsedQty} ${selectedIngredient?.unit}.`);
      setQuantity("");
      setNotes("");
      setSelectedIngredientId("");

      await loadHistory();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedIngredient = ingredients.find((i) => i.id === selectedIngredientId);

  return (
    <div className="min-h-screen text-white p-4 md:p-6 flex flex-col items-center font-sans w-full max-w-6xl mx-auto space-y-6">
      <div className="w-full text-center md:text-left flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-green-400 tracking-tight">Stock Adjustment</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manually adjust stock levels for ingredients at outlet:{" "}
            <span className="text-green-300 font-semibold">{outletName || "Loading..."}</span>
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="w-full bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded-lg relative flex items-center justify-between">
          <div>
            <strong className="font-bold text-red-400">Error! </strong>
            <span>{errorMessage}</span>
          </div>
          <button className="text-red-400 hover:text-red-200 text-xl font-bold ml-4" onClick={handleClearMessages}>
            &times;
          </button>
        </div>
      )}
      {successMessage && (
        <div className="w-full bg-green-950 border border-green-800 text-green-200 px-4 py-3 rounded-lg relative flex items-center justify-between">
          <div>
            <strong className="font-bold text-green-400">Success! </strong>
            <span>{successMessage}</span>
          </div>
          <button className="text-green-400 hover:text-green-200 text-xl font-bold ml-4" onClick={handleClearMessages}>
            &times;
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-green-900/50 rounded-xl p-5 shadow-xl space-y-5 flex flex-col">
            <h2 className="text-lg font-bold text-green-400 border-b border-gray-800 pb-2">Adjustment Details</h2>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1" htmlFor="ingredient-select">
                Ingredient:
              </label>
              <select
                id="ingredient-select"
                value={selectedIngredientId}
                onChange={(e) => setSelectedIngredientId(e.target.value)}
                disabled={isSubmitting || isLoading}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                required
              >
                <option value="">-- Select Ingredient --</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1">Adjustment Type:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="adjType"
                    value="IN"
                    checked={adjustmentType === "IN"}
                    onChange={() => setAdjustmentType("IN")}
                    className="w-4 h-4 text-green-500 bg-gray-800 border-gray-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-200">IN (Add Stock)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="adjType"
                    value="OUT"
                    checked={adjustmentType === "OUT"}
                    onChange={() => setAdjustmentType("OUT")}
                    className="w-4 h-4 text-red-500 bg-gray-800 border-gray-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-200">OUT (Deduct Stock)</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1" htmlFor="qty-input">
                Quantity:
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="qty-input"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyDown={(e) => {
                    if ([".", ",", "e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                  }}
                  placeholder="Enter quantity..."
                  disabled={isSubmitting || isLoading}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                  required
                />
                <span className="text-gray-400 text-sm whitespace-nowrap w-12">
                  {selectedIngredient ? selectedIngredient.unit : "-"}
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1" htmlFor="notes-input">
                Notes (Optional):
              </label>
              <textarea
                id="notes-input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for adjustment..."
                disabled={isSubmitting || isLoading}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading || !quantity || !selectedIngredientId}
              className={`w-full py-3 rounded-lg font-bold text-lg transition duration-300 shadow-md ${isSubmitting || isLoading || !quantity || !selectedIngredientId
                ? "bg-green-900/40 text-gray-500 cursor-not-allowed border border-green-950"
                : "bg-green-600 hover:bg-green-500 text-white active:scale-95 border border-green-500"
                }`}
            >
              {isSubmitting ? "Processing..." : "Submit Adjustment"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h2 className="text-lg font-bold text-gray-300">Adjustment History</h2>
            <button
              onClick={loadHistory}
              disabled={isLoading || isSubmitting}
              className="text-xs text-green-400 hover:text-green-300 bg-gray-800 px-3 py-1.5 rounded-md border border-gray-700 active:scale-95 transition"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto w-full rounded-lg border border-gray-800">
            <table className="min-w-full divide-y divide-gray-800 text-sm text-left">
              <thead className="bg-gray-800 text-gray-400 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-3">Adj No</th>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3">Ingredient</th>
                  <th scope="col" className="px-4 py-3 text-center">Type</th>
                  <th scope="col" className="px-4 py-3 text-right">Qty</th>
                  <th scope="col" className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {isLoading && history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">
                      Loading history...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">
                      No adjustments found.
                    </td>
                  </tr>
                ) : (
                  history.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-4 py-3.5 font-mono text-green-400 font-semibold">
                        {log.adjustmentNo}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-gray-300">
                        {log.ingredient.name}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.type === "IN" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-white">
                        {log.quantity} <span className="text-xs text-gray-500 font-normal">{log.ingredient.unit}</span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px] truncate text-gray-400 text-xs" title={log.notes || ""}>
                        {log.notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
