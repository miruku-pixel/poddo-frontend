import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../utils/fetchWithAuth";

type Props = {
  outletId: string;
  outletName: string;
};

interface ProcessLog {
  id: string;
  processNo: string;
  sourceIngredient: { name: string; unit: string };
  targetIngredient: { name: string; unit: string };
  quantity: number;
  notes: string | null;
  processedBy: { username: string };
  createdAt: string;
}

interface StockPreview {
  ayamMentah: number;
  ayamMentahUnit: string;
  ayamUngkep: number;
  ayamUngkepUnit: string;
}

export default function ProsesUngkep({ outletId, outletName }: Props) {
  // Form and stock states
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [stocks, setStocks] = useState<StockPreview>({
    ayamMentah: 0,
    ayamMentahUnit: "pcs",
    ayamUngkep: 0,
    ayamUngkepUnit: "pcs",
  });

  // History and loading states
  const [history, setHistory] = useState<ProcessLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleClearMessages = useCallback(() => {
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  // Fetch both the stock levels and conversion history logs in a single request
  const loadPageData = useCallback(async () => {
    if (!outletId) {
      setErrorMessage("Outlet ID is not available. Cannot fetch data.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/inventory/process?outletId=${outletId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to load process data.");
      }
      const data = await res.json();
      setHistory(data.history || []);
      setStocks(data.stocks || {
        ayamMentah: 0,
        ayamMentahUnit: "pcs",
        ayamUngkep: 0,
        ayamUngkepUnit: "pcs",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load page data.";
      setErrorMessage(message);
      console.error("Failed to load page data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [outletId]);

  // Load page data initially and whenever outletId changes
  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Handle conversion execution
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleClearMessages();

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMessage("Please enter a valid positive quantity.");
      return;
    }

    if (parsedQty > stocks.ayamMentah) {
      setErrorMessage(
        `Insufficient stock. You cannot process more than the available ${stocks.ayamMentah} pcs of Ayam Mentah.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/inventory/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          quantity: parsedQty,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to complete process conversion.");
      }

      setSuccessMessage(`Process executed successfully! converted ${parsedQty} pcs of Ayam Mentah to Ayam Ungkep.`);
      setQuantity("");
      setNotes("");

      // Reload stocks and conversion logs immediately to show new values
      await loadPageData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-white p-4 md:p-6 flex flex-col items-center font-sans w-full max-w-6xl mx-auto space-y-6">
      {/* Page Title & Context */}
      <div className="w-full text-center md:text-left flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-green-400 tracking-tight">Proses Ungkep</h1>
          <p className="text-sm text-gray-400 mt-1">
            Convert raw chicken into seasoned cooked/marinated chicken for outlet:{" "}
            <span className="text-green-300 font-semibold">{outletName || "Loading..."}</span>
          </p>
        </div>
      </div>

      {/* Notifications */}
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
        {/* Left Column: Stocks and Form (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Real-time Stock Cards */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-300 border-b border-gray-800 pb-2">Status Stok Terkini</h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Ayam Mentah Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center hover:border-green-600/50 transition duration-300 shadow-md">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ayam Mentah</span>
                <span className="text-3xl font-black text-white mt-2">
                  {isLoading ? "..." : stocks.ayamMentah}
                </span>
                <span className="text-xs text-gray-400 mt-1">{stocks.ayamMentahUnit}</span>
              </div>

              {/* Ayam Ungkep Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center hover:border-green-600/50 transition duration-300 shadow-md">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ayam Ungkep</span>
                <span className="text-3xl font-black text-green-400 mt-2">
                  {isLoading ? "..." : stocks.ayamUngkep}
                </span>
                <span className="text-xs text-gray-400 mt-1">{stocks.ayamUngkepUnit}</span>
              </div>
            </div>
          </div>

          {/* Conversion Form */}
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-green-900/50 rounded-xl p-5 shadow-xl space-y-5 flex flex-col">
            <h2 className="text-lg font-bold text-green-400 border-b border-gray-800 pb-2">Proses Ungkep</h2>

            {/* Input Qty */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1" htmlFor="qty-input">
                Jumlah yang Diproses (pcs):
              </label>
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
                placeholder="Masukkan jumlah pcs..."
                disabled={isSubmitting || isLoading}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                required
              />
              <span className="text-xs text-gray-500 mt-1">
                Enforces strict 1:1 pieces stock conversion.
              </span>
            </div>

            {/* Notes */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-1" htmlFor="notes-input">
                Catatan (Optional):
              </label>
              <textarea
                id="notes-input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Batch pagi / Orderan 100 pcs..."
                disabled={isSubmitting || isLoading}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
              />
            </div>

            {/* Action Buttons */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading || stocks.ayamMentah <= 0 || !quantity}
              className={`w-full py-3 rounded-lg font-bold text-lg transition duration-300 shadow-md ${isSubmitting || isLoading || stocks.ayamMentah <= 0 || !quantity
                ? "bg-green-900/40 text-gray-500 cursor-not-allowed border border-green-950"
                : "bg-green-600 hover:bg-green-500 text-white active:scale-95 border border-green-500"
                }`}
            >
              {isSubmitting ? "Sedang Memproses..." : "Mulai Proses Ungkep"}
            </button>
          </form>
        </div>

        {/* Right Column: Conversion Logs History Report (7 cols) */}
        <div className="lg:col-span-7 bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h2 className="text-lg font-bold text-gray-300">Laporan Riwayat Proses</h2>
            <button
              onClick={loadPageData}
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
                  <th scope="col" className="px-4 py-3">Process No</th>
                  <th scope="col" className="px-4 py-3">Tanggal & Waktu</th>
                  <th scope="col" className="px-4 py-3 text-right">Jumlah</th>
                  <th scope="col" className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {isLoading && history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">
                      Loading conversion history logs...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">
                      Belum ada data riwayat proses ungkep di outlet ini.
                    </td>
                  </tr>
                ) : (
                  history.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-4 py-3.5 font-mono text-green-400 font-semibold">
                        {log.processNo}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-white">
                        {log.quantity} <span className="text-xs text-gray-500 font-normal">pcs</span>
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
