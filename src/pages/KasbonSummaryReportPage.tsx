import { useRef, useState, useCallback } from "react";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import * as htmlToImage from "html-to-image"; // Import html-to-image
import { IoCalendarOutline } from "react-icons/io5";

interface OrderItemDisplay {
  foodName: string;
  quantity: number;
}

interface KasbonReportEntry {
  billingDate: string;
  orderNumber: string;
  orderRemark: string | null;
  billingRemark: string | null;
  amountPaid: number;
  items?: OrderItemDisplay[];
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  className, // className is now directly a prop
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  const isDate = type === "date";
  const inputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === "function") {
        inputRef.current.showPicker();
      }
      inputRef.current.focus();
    }
  };

  return (
    <div className={className}>
      {" "}
      {/* Apply className here */}
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-gray-800 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-green-500 ${
            isDate
              ? "appearance-none pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
              : ""
          }`}
        />
        {isDate && (
          <IoCalendarOutline
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white cursor-pointer"
            onClick={handleIconClick}
          />
        )}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-800 border border-green-500 rounded p-4 shadow-md">
      <p className="text-sm text-green-300">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

export default function KasbonSummaryReportPage({
  outletId,
}: {
  outletId: string;
}) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reportData, setReportData] = useState<KasbonReportEntry[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [showExportButton, setShowExportButton] = useState<boolean>(false);

  // Ref for the content to be captured as an image
  const reportRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

  const fetchReportData = useCallback(async () => {
    if (!startDate || !endDate) {
      setErrorMessage("Please select both start and end dates.");
      return;
    }
    if (!outletId) {
      setErrorMessage("Outlet ID is missing. Cannot fetch report.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setReportData(null); // Clear previous data
    setShowExportButton(false); // Hide export button until new data is loaded

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        outletId,
      });

      const res = await fetchWithAuth(
        `/api/reports/kasbon-summary?${params.toString()}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch KASBON summary.");
      }

      const data: KasbonReportEntry[] = await res.json();
      setReportData(data);
      setShowExportButton(true); // Show export button after successful data fetch

      if (data.length === 0) {
        setErrorMessage(
          "No KASBON transactions found for the selected period."
        );
      }
    } catch (error) {
      console.error("Error fetching KASBON summary:", error);
      setErrorMessage("Failed to fetch KASBON summary. Please try again.");
      setShowExportButton(false); // Hide export button on error
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, outletId]);

  const handleResetFilters = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setReportData(null);
    setIsLoading(false);
    setErrorMessage(null);
    setExportLoading(false);
    setShowExportButton(false);
  }, []);

  const handleExportToImage = useCallback(async () => {
    if (reportRef.current) {
      setExportLoading(true);
      setErrorMessage(null); // Clear previous errors

      // Temporarily remove max-height and set overflow to visible for capture
      const targetElement = reportRef.current;
      const originalMaxHeight = targetElement.style.maxHeight;
      const originalOverflowY = targetElement.style.overflowY;

      try {
        targetElement.style.maxHeight = "none";
        targetElement.style.overflowY = "visible";

        // Small delay to allow DOM to re-render after style changes
        await new Promise((resolve) => setTimeout(resolve, 50));

        const dataUrl = await htmlToImage.toPng(targetElement, {
          pixelRatio: 2, // For higher resolution image
          cacheBust: true,
          backgroundColor: "#1a202c", // Match parent background
        });

        const link = document.createElement("a");
        link.download = `kasbon-summary-report-${startDate}-${endDate}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Error exporting image:", error);
        setErrorMessage("Failed to export image. Please try again.");
      } finally {
        // Restore original styles
        targetElement.style.maxHeight = originalMaxHeight;
        targetElement.style.overflowY = originalOverflowY;
        setExportLoading(false);
      }
    }
  }, [startDate, endDate]);

  // Calculate total amount paid from the report data
  const totalAmountPaid =
    reportData?.reduce((sum, entry) => sum + entry.amountPaid, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 flex flex-col items-center font-sans">
      <div
        ref={reportRef} // Attach ref to the main container for capture
        className="w-full max-w-full bg-gray-800 rounded-lg shadow-xl p-5 space-y-5 border border-green-700"
      >
        {/* Header Section */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-green-400">
            KASBON Summary Report
          </h1>
          <p className="text-sm text-gray-400">
            View KASBON transactions for a selected date range
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{errorMessage}</span>
            <span
              className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer"
              onClick={() => setErrorMessage(null)}
            >
              <svg
                className="fill-current h-6 w-6 text-red-300"
                viewBox="0 0 20 20"
              >
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.697l-2.651 2.652a1.2 1.2 0 1 1-1.697-1.697L8.303 10 5.651 7.348a1.2 1.2 0 1 1 1.697-1.697L10 8.303l2.651-2.652a1.2 1.2 0 0 1 1.697 1.697L11.697 10l2.651 2.651a1.2 1.2 0 0 1 0 1.698z" />
              </svg>
            </span>
          </div>
        )}

        {/* Report Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 items-center sm:items-end">
          <InputField
            label="Date From"
            type="date"
            value={startDate}
            onChange={setStartDate}
            className="w-full sm:w-1/2 md:w-auto"
          />
          <InputField
            label="Date To"
            type="date"
            value={endDate}
            onChange={setEndDate}
            className="w-full sm:w-1/2 md:w-auto"
          />
          <div className="flex flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={fetchReportData}
              disabled={isLoading || exportLoading || !startDate || !endDate}
              className={`px-4 py-2 rounded flex items-center justify-center w-full sm:w-auto transition duration-200
                ${
                  isLoading || exportLoading || !startDate || !endDate
                    ? "bg-green-500 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                }
              `}
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
              ) : (
                "Generate Report"
              )}
            </button>
            <button
              onClick={handleResetFilters}
              className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded w-full sm:w-auto transition duration-200"
            >
              Reset
            </button>
            {/* Export to Image Button - Conditionally rendered */}
            {showExportButton &&
              !isLoading &&
              reportData &&
              reportData.length > 0 && (
                <button
                  onClick={handleExportToImage}
                  disabled={exportLoading}
                  className={`bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded flex items-center justify-center w-full sm:w-auto transition duration-200 ${
                    exportLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {exportLoading ? (
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
                    "Export to Image"
                  )}
                </button>
              )}
          </div>
        </div>

        {/* Total Amount Paid Card */}
        {reportData && reportData.length > 0 && (
          <div className="mt-6">
            <Card
              label="Total Kasbon"
              value={formatCurrency(totalAmountPaid)}
            />
          </div>
        )}

        {/* Report Table */}
        {reportData && reportData.length > 0 && (
          <div
            className="mt-8 overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "70vh" }} // This will be temporarily overridden for capture
          >
            <h2 className="text-xl font-semibold text-green-300 mb-4">
              KASBON Transactions
            </h2>
            <table className="min-w-full bg-gray-700 rounded-lg border border-green-400">
              <thead className="bg-green-500 text-white uppercase text-sm leading-normal sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-6 text-left">Billing Date</th>
                  <th className="py-3 px-6 text-left">Order Number</th>
                  <th className="py-3 px-6 text-left">Items</th>
                  <th className="py-3 px-6 text-left">Order Remark</th>
                  <th className="py-3 px-6 text-left">Billing Remark</th>
                  <th className="py-3 px-6 text-right">Kasbon Amount</th>
                </tr>
              </thead>
              <tbody className="text-gray-100 text-sm font-light">
                {reportData.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-b border-green-700 ${
                      index % 2 === 0 ? "bg-gray-700" : "bg-gray-800"
                    } hover:bg-gray-600`}
                  >
                    <td className="py-3 px-6 whitespace-nowrap">
                      {row.billingDate}
                    </td>
                    <td className="py-3 px-6 whitespace-nowrap">
                      {row.orderNumber}
                    </td>
                    <td className="py-3 px-6">
                      {" "}
                      {/* Display items here */}
                      {row.items && row.items.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {row.items.map((item, itemIndex) => (
                            <li key={itemIndex}>
                              {item.foodName} (x{item.quantity})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-6">{row.orderRemark || "-"}</td>
                    <td className="py-3 px-6">{row.billingRemark || "-"}</td>
                    <td className="py-3 px-6 text-right whitespace-nowrap">
                      {formatCurrency(row.amountPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* No data message */}
        {!isLoading &&
          !errorMessage &&
          reportData &&
          reportData.length === 0 && (
            <p className="text-white text-center p-4">
              No KASBON transactions found for the selected dates.
            </p>
          )}
      </div>
    </div>
  );
}
