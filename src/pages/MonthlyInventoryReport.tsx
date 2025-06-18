import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { toPng } from "html-to-image";

// Define a type for a single row of the monthly report data, including new sold categories and transfers
interface DailyReportEntry {
  date: string;
  ingredient: string;
  outletId: string;
  openingBalance: number;
  inbound: number;
  soldBoss: number;
  soldStaff: number;
  soldOther: number; // For general sales
  discrepancy: number;
  transferNagoya: number; // New transfer types
  transferSeraya: number;
  transferBengkong: number;
  transferMalalayang: number;
  transferKleak: number;
  transferPaniki: number;
  transferItc: number;
  closingBalance: number;
}

// Define a type for Ingredient to be used in state
interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

type TransferColumnVisibilityMap = {
  [key: string]: string[]; // Keys are outlet names (strings), values are arrays of transfer column keys (strings)
};

// Define a mapping for which transfer columns to show based on outletName
const transferColumnVisibility: TransferColumnVisibilityMap = {
  "PoDDo-Nagoya": ["transferBengkong", "transferSeraya"],
  "PoDDo-Bengkong": ["transferNagoya", "transferSeraya"],
  "PoDDo-Seraya": ["transferNagoya", "transferBengkong"],
  // Add more outlets here as they go live
  // "Another-Outlet": ["transferTypeX", "transferTypeY"],
};

// Add props for outletId and outletName
export default function MonthlyInventoryReport({
  outletId,
  outletName,
}: {
  outletId: string;
  outletName: string;
}) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-indexed

  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]); // Use Ingredient type
  const [reportData, setReportData] = useState<DailyReportEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reportOutletName, setReportOutletName] = useState(outletName); // State to store outletName from API response

  // New states for image capture functionality
  const [loadingCapture, setLoadingCapture] = useState(false);
  const [captureErrorMessage, setCaptureErrorMessage] = useState("");
  const [captureSuccessMessage, setCaptureSuccessMessage] = useState("");

  // Ref for the table container to capture as image
  const reportRef = useRef<HTMLDivElement>(null);

  const years = Array.from({ length: 5 }, (_, i) =>
    String(currentYear - 2 + i)
  ); // Last 2 years, current, next 2
  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const handleClearMessages = useCallback(() => {
    setErrorMessage("");
    setCaptureErrorMessage(""); // Clear capture specific messages
    setCaptureSuccessMessage(""); // Clear capture specific messages
  }, []);

  // Effect to fetch initial list of ingredients filtered by outletId
  useEffect(() => {
    const loadIngredients = async () => {
      if (!outletId) {
        setErrorMessage("Outlet ID is not available. Cannot load ingredients.");
        return;
      }
      try {
        const res = await fetchWithAuth(
          `/api/inventory/ingredients?outletId=${outletId}`
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch ingredients.");
        }
        const data: Ingredient[] = await res.json();
        setIngredients(data);
        if (data.length > 0) {
          setSelectedIngredientId(data[0].id); // Select the first ingredient by default
        } else {
          setSelectedIngredientId("");
          setErrorMessage("No ingredients found for this outlet.");
        }
      } catch (err) {
        setErrorMessage("Failed to load ingredients for selection.");
        console.error("Error loading ingredients:", err);
      }
    };
    loadIngredients();
  }, [outletId]); // Re-run when outletId changes

  const handleGenerateReport = useCallback(async () => {
    handleClearMessages(); // Clear all messages before generating new report
    // Validate all required fields including outletId
    if (!selectedMonth || !selectedYear || !selectedIngredientId || !outletId) {
      setErrorMessage(
        "Please select a month, year, ingredient, and ensure outlet is selected."
      );
      return;
    }

    setIsLoading(true);
    setReportData(null); // Clear previous data
    setReportOutletName(outletName); // Reset report outlet name to initial prop value

    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
        ingredientId: selectedIngredientId,
        outletId: outletId, // Include outletId in the query parameters
      });
      const res = await fetchWithAuth(
        `/api/inventory/monthly-report?${params.toString()}`
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch monthly report.");
      }
      // Access reportData from the nested object
      const responseData = await res.json();
      setReportData(responseData.reportData);
      setReportOutletName(responseData.outletName); // Update outlet name from API response

      if (responseData.reportData.length === 0) {
        setErrorMessage(
          "No inventory movements found for the selected month, ingredient, and outlet."
        );
      }
    } catch (err) {
      setErrorMessage("Error generating report");
      console.error("Error generating monthly report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedMonth,
    selectedYear,
    selectedIngredientId,
    outletId,
    outletName, // Added outletName to dependencies since it's used to initialize reportOutletName
    handleClearMessages,
  ]); // Added outletId to dependencies

  // Refactored handleExportToImage to handleCaptureScreen
  const handleCaptureScreen = useCallback(async () => {
    if (reportRef.current) {
      setLoadingCapture(true);
      setCaptureErrorMessage(""); // Clear previous errors
      setCaptureSuccessMessage(""); // Clear previous success messages

      const targetElement = reportRef.current;
      const originalMaxHeight = targetElement.style.maxHeight;
      const originalOverflowY = targetElement.style.overflowY;

      try {
        // Temporarily remove max-height and set overflow to visible
        targetElement.style.maxHeight = "none"; // Allow content to expand fully
        targetElement.style.overflowY = "visible"; // Ensure all content is rendered for capture

        const dataUrl = await toPng(targetElement, {
          pixelRatio: 2, // For higher resolution image
          cacheBust: true, // Prevents caching of images
          backgroundColor: "#1a202c", // Set background color to match the gray-900 of the parent div
        });

        // Create a temporary link element to download the image
        const link = document.createElement("a");
        link.download = `MonthlyInventoryReport_${reportOutletName}_${selectedMonth}-${selectedYear}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setCaptureSuccessMessage("Report captured successfully!");
      } catch (err) {
        console.error("Failed to capture screen:", err);
        setCaptureErrorMessage("Failed to capture report. Please try again");
      } finally {
        // Restore original styles
        targetElement.style.maxHeight = originalMaxHeight;
        targetElement.style.overflowY = originalOverflowY;
        setLoadingCapture(false);
      }
    } else {
      setCaptureErrorMessage("Report content not found for capture.");
    }
  }, [reportOutletName, selectedMonth, selectedYear]);

  // Determine which transfer columns to display based on the current outletName
  const currentOutletTransferColumns =
    transferColumnVisibility[reportOutletName] || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 flex flex-col items-center font-sans">
      <div className="w-full max-w-full bg-gray-800 rounded-lg shadow-xl p-5 space-y-5 border border-green-700">
        {/* Header Section */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-green-400">
            Monthly Stock Report
          </h1>
          <p className="text-sm text-gray-400">
            View daily stock movements for a chosen month
          </p>
        </div>
        {/* Messages */}
        {errorMessage && (
          <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{errorMessage}</span>
            <span
              className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer"
              onClick={handleClearMessages}
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
        {captureErrorMessage && (
          <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{captureErrorMessage}</span>
            <span
              className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer"
              onClick={handleClearMessages}
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
        {captureSuccessMessage && (
          <div className="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Success!</strong>
            <span className="block sm:inline ml-2">
              {captureSuccessMessage}
            </span>
            <span
              className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer"
              onClick={handleClearMessages}
            >
              <svg
                className="fill-current h-6 w-6 text-green-300"
                viewBox="0 0 20 20"
              >
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.697l-2.651 2.652a1.2 1.2 0 1 1-1.697-1.697L8.303 10 5.651 7.348a1.2 1.2 0 1 1 1.697-1.697L10 8.303l2.651-2.652a1.2 1.2 0 0 1 1.697 1.697L11.697 10l2.651 2.651a1.2 1.2 0 0 1 0 1.698z" />
              </svg>
            </span>
          </div>
        )}
        {/* Display Outlet Name */}
        <div className="flex flex-col mb-4">
          <label className="text-sm text-gray-300 mb-1">Selected Outlet:</label>
          <div className="w-full bg-gray-700 text-gray-300 border border-gray-600 rounded p-2 cursor-not-allowed">
            {reportOutletName || "Loading Outlet..."}
          </div>
        </div>
        {/* Report Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Month Select */}
          <div className="flex flex-col">
            <label
              htmlFor="month-select"
              className="text-sm text-gray-300 mb-1"
            >
              Month:
            </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-green-500"
              disabled={isLoading || loadingCapture}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          {/* Year Select */}
          <div className="flex flex-col">
            <label htmlFor="year-select" className="text-sm text-gray-300 mb-1">
              Year:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-green-500"
              disabled={isLoading || loadingCapture}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {/* Ingredient Select */}
          <div className="flex flex-col">
            <label
              htmlFor="ingredient-select"
              className="text-sm text-gray-300 mb-1"
            >
              Bahan:
            </label>
            <select
              id="ingredient-select"
              value={selectedIngredientId}
              onChange={(e) => setSelectedIngredientId(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-green-500"
              disabled={isLoading || loadingCapture || ingredients.length === 0}
            >
              {ingredients.length === 0 ? (
                <option value="">Loading ingredients...</option>
              ) : (
                <>
                  <option value="">Select an ingredient</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
        {/* Generate Report Button */}
        <button
          onClick={handleGenerateReport}
          disabled={
            isLoading || loadingCapture || !selectedIngredientId || !outletId
          }
          className={`w-full px-6 py-3 rounded-md font-bold text-lg transition duration-200
            ${
              isLoading || loadingCapture || !selectedIngredientId || !outletId
                ? "bg-green-700 text-gray-400 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
            }
          `}
        >
          {isLoading ? "Generating Report..." : "Generate Report"}
        </button>

        {/* Export to Image Button - Conditionally rendered */}
        {reportData && reportData.length > 0 && !isLoading && (
          <button
            onClick={handleCaptureScreen}
            disabled={loadingCapture}
            className={`w-full mt-4 px-6 py-3 rounded-md font-bold text-lg transition duration-200
              ${
                loadingCapture
                  ? "bg-blue-700 text-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }
            `}
          >
            {loadingCapture ? "Capturing Report..." : "Export to Image"}
          </button>
        )}

        {/* Report Table */}
        {reportData && reportData.length > 0 && (
          <div
            ref={reportRef} // Attach the ref here
            className="mt-8 overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "70vh" }} // This style will be temporarily overridden by handleCaptureScreen
          >
            <h2 className="text-xl font-semibold text-green-300 mb-4">
              Stock Report for{" "}
              {months.find((m) => m.value === selectedMonth)?.label}{" "}
              {selectedYear} - {reportOutletName}{" "}
            </h2>
            <table className="min-w-full bg-gray-700 rounded-lg border border-green-400">
              <thead className="bg-green-500 text-white uppercase text-sm leading-normal sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-6 text-left">Date</th>
                  <th className="py-3 px-6 text-left">Bahan</th>
                  <th className="py-3 px-6 text-right">Awal</th>
                  <th className="py-3 px-6 text-right">Pemasukan</th>
                  <th className="py-3 px-6 text-right">Boss</th>
                  <th className="py-3 px-6 text-right">Staff</th>
                  <th className="py-3 px-6 text-right">Penjualan</th>
                  <th className="py-3 px-6 text-right">Rusak</th>
                  {/* Conditionally rendered Transfer Headers */}
                  {currentOutletTransferColumns.includes("transferNagoya") && (
                    <th className="py-3 px-6 text-right">Transfer (Nagoya)</th>
                  )}
                  {currentOutletTransferColumns.includes("transferSeraya") && (
                    <th className="py-3 px-6 text-right">Transfer (Seraya)</th>
                  )}
                  {currentOutletTransferColumns.includes(
                    "transferBengkong"
                  ) && (
                    <th className="py-3 px-6 text-right">
                      Transfer (Bengkong)
                    </th>
                  )}
                  {currentOutletTransferColumns.includes(
                    "transferMalalayang"
                  ) && (
                    <th className="py-3 px-6 text-right">
                      Transfer (Malalayang)
                    </th>
                  )}
                  {currentOutletTransferColumns.includes("transferKleak") && (
                    <th className="py-3 px-6 text-right">Transfer (Kleak)</th>
                  )}
                  {currentOutletTransferColumns.includes("transferPaniki") && (
                    <th className="py-3 px-6 text-right">Transfer (Paniki)</th>
                  )}
                  {currentOutletTransferColumns.includes("transferItc") && (
                    <th className="py-3 px-6 text-right">Transfer (ITC)</th>
                  )}
                  {/* End Conditionally rendered Transfer Headers */}
                  <th className="py-3 px-6 text-right">Akhir</th>
                </tr>
              </thead>
              <tbody className="text-gray-100 text-sm font-light">
                {reportData.map((row: DailyReportEntry, index) => (
                  <tr
                    key={index}
                    className="border-b border-green-700 hover:bg-gray-700"
                  >
                    <td className="py-3 px-6 text-left whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-3 px-6 text-left">{row.ingredient}</td>
                    <td className="py-3 px-6 text-right">
                      {row.openingBalance}
                    </td>
                    <td className="py-3 px-6 text-right">{row.inbound}</td>
                    <td className="py-3 px-6 text-right">{row.soldBoss}</td>
                    <td className="py-3 px-6 text-right">{row.soldStaff}</td>
                    <td className="py-3 px-6 text-right">{row.soldOther}</td>
                    <td className="py-3 px-6 text-right">{row.discrepancy}</td>
                    {/* Conditionally rendered Transfer Data Cells */}
                    {currentOutletTransferColumns.includes(
                      "transferNagoya"
                    ) && (
                      <td className="py-3 px-6 text-right">
                        {row.transferNagoya}
                      </td>
                    )}
                    {currentOutletTransferColumns.includes(
                      "transferSeraya"
                    ) && (
                      <td className="py-3 px-6 text-right">
                        {row.transferSeraya}
                      </td>
                    )}
                    {currentOutletTransferColumns.includes(
                      "transferBengkong"
                    ) && (
                      <td className="py-3 px-6 text-right">
                        {row.transferBengkong}
                      </td>
                    )}
                    {currentOutletTransferColumns.includes(
                      "transferMalalayang"
                    ) && (
                      <td className="py-3 px-6 text-right">
                        {row.transferMalalayang}
                      </td>
                    )}
                    {currentOutletTransferColumns.includes("transferKleak") && (
                      <td className="py-3 px-6 text-right">
                        {row.transferKleak}
                      </td>
                    )}
                    {currentOutletTransferColumns.includes(
                      "transferPaniki"
                    ) && (
                      <td className="py-3 px-6 text-right">
                        {row.transferPaniki}
                      </td>
                    )}
                    {currentOutletTransferColumns.includes("transferItc") && (
                      <td className="py-3 px-6 text-right">
                        {row.transferItc}
                      </td>
                    )}
                    {/* End Conditionally rendered Transfer Data Cells */}
                    <td className="py-3 px-6 text-right">
                      {row.closingBalance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {reportData &&
          reportData.length === 0 &&
          !isLoading &&
          !errorMessage && (
            <div className="text-center text-gray-400 mt-8">
              No data found for the selected month, ingredient, and outlet.
            </div>
          )}
      </div>
    </div>
  );
}
