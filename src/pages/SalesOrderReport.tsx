import React, { useState, useEffect, useMemo } from "react";
import { fetchWithAuth } from "../utils/fetchWithAuth";

interface ReportBillingEntry {
  receiptNumber: string;
  orderNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  changeGiven: number;
  status: "PAID" | "VOID" | "PENDING";
  paymentType: string;
  cashier: string; // Cashier's username
  paidAt: string; // ISO DateTime string
}

// Helper for currency formatting
const formatCurrency = (val: number) => {
  if (typeof val !== "number") return "Rp 0";
  return `Rp ${val.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

// Helper for date formatting
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper function to get YYYY-MM-DD date string
const getFormattedDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};
// --- PAGINATION CONSTANT ---
const ROWS_PER_PAGE = 20;

// --- MAIN COMPONENT ---
type Props = {
  outletId: string; // Required for the API endpoint
};

export default function SalesOrderReport({ outletId }: Props) {
  const today = useMemo(() => getFormattedDate(new Date()), []);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [billingList, setBillingList] = useState<ReportBillingEntry[] | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1); // New state for pagination

  const isDateRangeValid = startDate && endDate && startDate <= endDate;

  const fetchReport = async () => {
    if (!isDateRangeValid) {
      setError(
        "Invalid date range. Ensure Start Date is before or the same as End Date."
      );
      setBillingList(null);
      return;
    }

    setLoading(true);
    setError(null);
    setBillingList(null);
    setCurrentPage(1); // Reset page when fetching new data

    try {
      const params = new URLSearchParams({
        outletId,
        startDate,
        endDate,
      });

      // Using the locally defined mock function
      const res = await fetchWithAuth(
        `/api/reports/sales-order-report?${params.toString()}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch billing report.");
      }

      const data: ReportBillingEntry[] = await res.json();
      setBillingList(data);

      if (data.length === 0) {
        setError("No billing transactions found for the selected date range.");
      }
    } catch (err: unknown) {
      console.error("Failed to fetch report:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while fetching the report.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on load
  useEffect(() => {
    fetchReport();
  }, [outletId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine total summary (excluding VOID)
  const totalSummary = useMemo(() => {
    if (!billingList) return null;

    // Filter out transactions with status "VOID" before calculating the summary.
    const nonVoidBillingList = billingList.filter(
      (item) => item.status !== "VOID"
    );

    return nonVoidBillingList.reduce(
      (acc, item) => {
        acc.totalSubtotal += item.subtotal;
        acc.totalDiscount += item.discount;
        acc.totalTotal += item.total;
        acc.totalAmountPaid += item.amountPaid;
        acc.totalChangeGiven += item.changeGiven;
        return acc;
      },
      {
        totalSubtotal: 0,
        totalDiscount: 0,
        totalTotal: 0,
        totalAmountPaid: 0,
        totalChangeGiven: 0,
      }
    );
  }, [billingList]);

  // --- Pagination Logic ---
  const totalPages = useMemo(() => {
    if (!billingList) return 0;
    return Math.ceil(billingList.length / ROWS_PER_PAGE);
  }, [billingList]);

  const paginatedList = useMemo(() => {
    if (!billingList) return [];
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    // Slice the main list to get the current page's data
    return billingList.slice(startIndex, endIndex);
  }, [billingList, currentPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  // --- End Pagination Logic ---

  // CSS class for column alignment
  const colClasses = {
    number: "text-center hidden sm:table-cell",
    currency: "text-right whitespace-nowrap",
    status: "text-center hidden md:table-cell",
    text: "text-left",
  };

  const StatusBadge: React.FC<{ status: ReportBillingEntry["status"] }> = ({
    status,
  }) => {
    let colorClass = "";
    let text = "";
    switch (status) {
      case "PAID":
        colorClass = "bg-green-600";
        text = "PAID";
        break;
      case "VOID":
        colorClass = "bg-red-600";
        text = "VOID";
        break;
      case "PENDING":
        colorClass = "bg-yellow-500";
        text = "PENDING";
        break;
      default:
        colorClass = "bg-gray-500";
        text = "UNKNOWN";
    }
    return (
      <span
        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colorClass} text-white`}
      >
        {text}
      </span>
    );
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gray-900 text-white font-sans">
      <style>
        {`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
            * { font-family: 'Inter', sans-serif; }
            `}
      </style>
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-extrabold text-green-400 border-b border-green-700 pb-2">
          Sales Order Report
        </h1>

        {/* Date Range Selection and Action Button */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl space-y-4 md:space-y-0 md:flex md:items-end md:gap-4 border border-green-500/50">
          <div className="flex-1">
            <label
              htmlFor="start-date"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-green-500 focus:border-green-500 transition duration-150"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="end-date"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:ring-500 focus:border-green-500 transition duration-150"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading || !isDateRangeValid}
            className={`px-6 py-3 rounded-lg font-bold w-full md:w-auto flex items-center justify-center transition duration-200 shadow-lg
								${
                  loading || !isDateRangeValid
                    ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }
						`}
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-white mr-3"
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
              "Run Report"
            )}
          </button>
        </div>

        {/* Status/Error Message */}
        {error && (
          <div className="p-4 bg-red-800 rounded-lg text-red-100 font-medium">
            🚨 Error: {error}
          </div>
        )}

        {/* --- Report Table Display --- */}
        {billingList && billingList.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-green-300">
              Transactions Found ({billingList.length})
            </h2>

            {/* Summary Card (Non-Void Totals) */}
            {totalSummary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-green-900/50 p-4 rounded-xl shadow-inner border border-green-600">
                <div className="p-2 border-r border-green-700 col-span-2 md:col-span-1">
                  <p className="text-xs font-light text-green-200 uppercase">
                    Subtotal
                  </p>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(totalSummary.totalSubtotal)}
                  </p>
                </div>
                <div className="p-2 border-r border-green-700">
                  <p className="text-xs font-light text-green-200 uppercase">
                    Discount
                  </p>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(totalSummary.totalDiscount)}
                  </p>
                </div>
                <div className="p-2 border-r border-green-700">
                  <p className="text-xs font-light text-green-200 uppercase">
                    Total Net
                  </p>
                  <p className="text-lg font-bold text-yellow-300">
                    {formatCurrency(totalSummary.totalTotal)}
                  </p>
                </div>
                <div className="p-2 col-span-2 md:col-span-1">
                  <p className="text-xs font-light text-green-200 uppercase">
                    Amount Paid
                  </p>
                  <p className="text-lg font-bold text-green-300">
                    {formatCurrency(totalSummary.totalAmountPaid)}
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl shadow-xl border border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-700 text-gray-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left w-24">Time</th>
                    <th className="px-3 py-3 text-left w-36">
                      Receipt / Order
                    </th>
                    <th className="px-3 py-3 w-20 text-center hidden md:table-cell">
                      Cashier
                    </th>
                    <th className="px-3 py-3 w-20 text-center hidden md:table-cell">
                      Status
                    </th>
                    <th className="px-3 py-3 w-16 text-center hidden sm:table-cell">
                      Type
                    </th>
                    <th className="px-3 py-3 w-24 currency">Subtotal</th>
                    <th className="px-3 py-3 w-24 currency hidden sm:table-cell">
                      Discount
                    </th>
                    <th className="px-3 py-3 w-24 currency text-yellow-300">
                      Total
                    </th>
                    <th className="px-3 py-3 w-24 currency text-green-400 hidden sm:table-cell">
                      Paid
                    </th>
                    <th className="px-3 py-3 w-24 currency hidden md:table-cell">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {/* Map over the PAGINATED list */}
                  {paginatedList.map((item) => (
                    <tr
                      key={item.receiptNumber}
                      className={`hover:bg-gray-700 transition duration-150 ${
                        item.status === "VOID" ? "opacity-50 italic" : ""
                      }`}
                    >
                      <td className="px-3 py-3 whitespace-nowrap text-gray-400">
                        {formatDate(item.paidAt)}
                      </td>
                      <td className="px-3 py-3 text-left font-semibold">
                        <div className="text-sm text-green-300">
                          {item.receiptNumber}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item.orderNumber}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-300 hidden md:table-cell">
                        {item.cashier}
                      </td>
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-3 py-3 text-center text-gray-400 hidden sm:table-cell">
                        {item.paymentType}
                      </td>
                      <td className={`px-3 py-3 ${colClasses.currency}`}>
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td
                        className={`px-3 py-3 ${colClasses.currency} hidden sm:table-cell`}
                      >
                        {formatCurrency(item.discount)}
                      </td>
                      <td
                        className={`px-3 py-3 ${colClasses.currency} font-bold text-yellow-300`}
                      >
                        {formatCurrency(item.total)}
                      </td>
                      <td
                        className={`px-3 py-3 ${colClasses.currency} text-green-400 hidden sm:table-cell`}
                      >
                        {formatCurrency(item.amountPaid)}
                      </td>
                      <td
                        className={`px-3 py-3 ${colClasses.currency} text-blue-400 hidden md:table-cell`}
                      >
                        {formatCurrency(item.changeGiven)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-gray-800 rounded-xl shadow-inner border border-green-700">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition w-full sm:w-auto mb-2 sm:mb-0"
                >
                  &larr; Previous
                </button>
                <div className="text-sm text-gray-300 py-2">
                  Page{" "}
                  <strong className="text-yellow-300">{currentPage}</strong> of{" "}
                  <strong className="text-yellow-300">{totalPages}</strong>{" "}
                  (Showing{" "}
                  {Math.min(
                    billingList.length,
                    (currentPage - 1) * ROWS_PER_PAGE + 1
                  )}
                  -{Math.min(billingList.length, currentPage * ROWS_PER_PAGE)})
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition w-full sm:w-auto"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
