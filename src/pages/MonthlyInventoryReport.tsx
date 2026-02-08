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
  transferMantos: number;
  transferMaumbi: number;
  transferTuminting: number;
  transfer17Agustus: number;
  transferPerkamil: number;
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
  "Podomoro-Kleak": ["transferMalalayang", "transferPaniki", "transferItc", "transferMantos", "transferMaumbi", "transferTuminting", "transfer17Agustus", "transferPerkamil"],
  "Podomoro-Malalayang": ["transferKleak", "transferPaniki", "transferItc", "transferMantos", "transferMaumbi", "transferTuminting", "transfer17Agustus", "transferPerkamil"],
  "Podomoro-Mantos": ["transferKleak", "transferPaniki", "transferItc", "transferMalalayang", "transferMaumbi", "transferTuminting", "transfer17Agustus", "transferPerkamil"],
  "Xpress-ITC": ["transferKleak", "transferMalalayang", "transferPaniki", "transferMantos", "transferMaumbi", "transferTuminting", "transfer17Agustus", "transferPerkamil"],
  "Xpress-Paniki": ["transferKleak", "transferMalalayang", "transferItc", "transferMantos", "transferMaumbi", "transferTuminting", "transfer17Agustus", "transferPerkamil"],
  "Podomoro-Maumbi": ["transferKleak", "transferMalalayang", "transferItc", "transferMantos", "transferPaniki", "transferTuminting", "transfer17Agustus", "transferPerkamil"],
  "Podomoro-Tuminting": ["transferKleak", "transferMalalayang", "transferItc", "transferMantos", "transferPaniki", "transferMaumbi", "transfer17Agustus", "transferPerkamil"],
  "Podomoro-17Agustus": ["transferKleak", "transferMalalayang", "transferItc", "transferMantos", "transferPaniki", "transferMaumbi", "transferTuminting", "transferPerkamil"],
  "Podomoro-Perkamil": ["transferKleak", "transferMalalayang", "transferItc", "transferMantos", "transferPaniki", "transferMaumbi", "transferTuminting", "transfer17Agustus"],
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

  // States for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 16; // Number of rows per page

  // Ref for the *single* report table you want to capture
  const reportRef = useRef<HTMLDivElement>(null);

  const [loadingCapture, setLoadingCapture] = useState(false);
  const [captureErrorMessage, setCaptureErrorMessage] = useState("");
  const [captureSuccessMessage, setCaptureSuccessMessage] = useState("");

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
    setCurrentPage(1); // Reset to first page on new report generation
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
    outletName,
    handleClearMessages,
  ]);

  const handleCaptureScreen = useCallback(async () => {
    setLoadingCapture(true);
    setCaptureErrorMessage("");
    setCaptureSuccessMessage("");

    if (!reportRef.current) {
      setCaptureErrorMessage("Report content not found for capture.");
      setLoadingCapture(false);
      return;
    }

    const targetElement = reportRef.current;
    // Store original styles to restore them later
    const originalMaxHeight = targetElement.style.maxHeight;
    const originalOverflowY = targetElement.style.overflowY;
    const originalPaddingBottom = targetElement.style.paddingBottom;
    const originalPaddingTop = targetElement.style.paddingTop;

    try {
      // Temporarily expand the element for full capture
      targetElement.style.maxHeight = "none";
      targetElement.style.overflowY = "visible";
      // *** INCREASE PADDING SIGNIFICANTLY ***
      // This is the primary adjustment to ensure the last row is fully visible.
      targetElement.style.paddingBottom = "50px"; // Increased from 20px
      targetElement.style.paddingTop = "20px"; // Increased from 10px, for symmetry and safety

      // Crucial: Wait for the browser to re-render the DOM after style changes.
      // Use two requestAnimationFrame calls for extra certainty in some complex layouts.
      await new Promise((resolve) => requestAnimationFrame(resolve)); // First frame to initiate layout
      await new Promise((resolve) => requestAnimationFrame(resolve)); // Second frame to ensure layout is complete and rendered
      await new Promise((resolve) => setTimeout(resolve, 200)); // Slightly longer additional delay (increased from 100ms)

      // Recalculate dimensions AFTER layout is complete
      const scrollHeight = targetElement.scrollHeight;
      const clientWidth = targetElement.clientWidth;

      const dataUrl = await toPng(targetElement, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#1a202c",
        width: clientWidth,
        height: scrollHeight,
      });

      const link = document.createElement("a");
      link.download = `MonthlyInventoryReport_${reportOutletName}_${selectedMonth}-${selectedYear}_Page${currentPage}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setCaptureSuccessMessage("Current page captured successfully!");
    } catch (err) {
      console.error("Failed to capture screen:", err);
      setCaptureErrorMessage("Failed to capture report. Please try again.");
    } finally {
      // Restore original styles
      targetElement.style.maxHeight = originalMaxHeight;
      targetElement.style.overflowY = originalOverflowY;
      targetElement.style.paddingBottom = originalPaddingBottom;
      targetElement.style.paddingTop = originalPaddingTop;
      setLoadingCapture(false);
    }
  }, [reportOutletName, selectedMonth, selectedYear, currentPage]);

  // Determine which transfer columns to display based on the current outletName
  const currentOutletTransferColumns =
    transferColumnVisibility[reportOutletName] || [];

  const today = new Date();
  const currentDay = String(today.getDate()).padStart(2, "0");
  const currentMonthFormatted = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const currentYearFormatted = today.getFullYear();
  const todayDateKey = `${currentYearFormatted}-${currentMonthFormatted}-${currentDay}`;

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = reportData
    ? reportData.slice(indexOfFirstRow, indexOfLastRow)
    : [];

  const totalPages = reportData
    ? Math.ceil(reportData.length / rowsPerPage)
    : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 flex flex-col items-center font-sans">
      <div className="w-full max-w-full bg-gray-800 rounded-lg shadow-xl p-7 space-y-5 border border-green-700">
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
            ${isLoading || loadingCapture || !selectedIngredientId || !outletId
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
              ${loadingCapture
                ? "bg-blue-700 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
              }
            `}
          >
            {loadingCapture
              ? "Capturing Current Page..."
              : "Export Current Page to Image"}
          </button>
        )}

        {/* Main Report Table (for user display and capture) */}
        {reportData && reportData.length > 0 && (
          <div
            ref={reportRef} // Attach the single ref here
            className="mt-8 overflow-x-auto overflow-y-auto pb-2"
            style={{ maxHeight: "100vh" }}
          >
            <h2 className="text-xl font-semibold text-green-300 mb-4">
              Stock Report for{" "}
              {months.find((m) => m.value === selectedMonth)?.label}{" "}
              {selectedYear} - {reportOutletName} (Page {currentPage})
            </h2>
            <table className="min-w-full bg-gray-700 rounded-lg border border-green-400">
              <thead className="bg-green-500 text-white uppercase text-sm leading-normal sticky top-0 z-10">
                <tr>
                  <th className="py-1 px-4 text-center">Date</th>
                  <th className="py-1 px-4 text-center">Bahan</th>
                  <th className="py-1 px-4 text-center">Awal</th>
                  <th className="py-1 px-4 text-center">Pemasukan</th>
                  <th className="py-1 px-4 text-center">Boss</th>
                  <th className="py-1 px-4 text-center">Staff</th>
                  <th className="py-1 px-4 text-center">Penjualan</th>
                  <th className="py-1 px-4 text-center">Rusak</th>
                  {/* Conditionally rendered Transfer Headers */}
                  {currentOutletTransferColumns.includes("transferNagoya") && (
                    <th className="py-1 px-4 text-center">Transfer (Nagoya)</th>
                  )}
                  {currentOutletTransferColumns.includes("transferSeraya") && (
                    <th className="py-1 px-4 text-center">Transfer (Seraya)</th>
                  )}
                  {currentOutletTransferColumns.includes(
                    "transferBengkong"
                  ) && (
                      <th className="py-1 px-4 text-center">
                        Transfer (Bengkong)
                      </th>
                    )}
                  {currentOutletTransferColumns.includes(
                    "transferMalalayang"
                  ) && (
                      <th className="py-1 px-4 text-center">
                        Transfer (Malalayang)
                      </th>
                    )}
                  {currentOutletTransferColumns.includes("transferKleak") && (
                    <th className="py-1 px-4 text-center">Transfer (Kleak)</th>
                  )}
                  {currentOutletTransferColumns.includes("transferPaniki") && (
                    <th className="py-1 px-4 text-center">Transfer (Paniki)</th>
                  )}
                  {currentOutletTransferColumns.includes("transferMantos") && (
                    <th className="py-1 px-4 text-center">Transfer (Mantos)</th>
                  )}
                  {currentOutletTransferColumns.includes("transferItc") && (
                    <th className="py-1 px-4 text-center">Transfer (ITC)</th>
                  )}
                  {currentOutletTransferColumns.includes("transferMaumbi") && (
                    <th className="py-1 px-4 text-center">Transfer (Maumbi)</th>
                  )}
                  {currentOutletTransferColumns.includes("transferTuminting") && (
                    <th className="py-1 px-4 text-center">Transfer (Tuminting)</th>
                  )}
                  {currentOutletTransferColumns.includes("transfer17Agustus") && (
                    <th className="py-1 px-4 text-center">Transfer (17 Agustus)</th>
                  )}
                  {currentOutletTransferColumns.includes("transferPerkamil") && (
                    <th className="py-1 px-4 text-center">Transfer (Perkamil)</th>
                  )}
                  {/* End Conditionally rendered Transfer Headers */}
                  <th className="py-1 px-4 text-center">Akhir</th>
                </tr>
              </thead>
              <tbody className="text-gray-100 text-sm font-light">
                {currentRows.map((row: DailyReportEntry, index) => {
                  const isToday = row.date === todayDateKey;
                  return (
                    <tr
                      key={index}
                      className={`border-b border-green-700 hover:bg-gray-700 ${isToday ? "text-yellow-300 font-extrabold" : "" // Highlighted class
                        }`}
                    >
                      <td className="py-1 px-4 text-center whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="py-1 px-4 text-center">
                        {row.ingredient}
                      </td>
                      <td className="py-1 px-4 text-center">
                        {row.openingBalance}
                      </td>
                      <td className="py-1 px-4 text-center">{row.inbound}</td>
                      <td className="py-1 px-4 text-center">{row.soldBoss}</td>
                      <td className="py-1 px-4 text-center">{row.soldStaff}</td>
                      <td className="py-1 px-4 text-center">{row.soldOther}</td>
                      <td className="py-1 px-4 text-center">
                        {row.discrepancy}
                      </td>
                      {/* Conditionally rendered Transfer Data Cells */}
                      {currentOutletTransferColumns.includes(
                        "transferNagoya"
                      ) && (
                          <td className="py-1 px-4 text-center">
                            {row.transferNagoya}
                          </td>
                        )}
                      {currentOutletTransferColumns.includes(
                        "transferSeraya"
                      ) && (
                          <td className="py-1 px-4 text-center">
                            {row.transferSeraya}
                          </td>
                        )}
                      {currentOutletTransferColumns.includes(
                        "transferBengkong"
                      ) && (
                          <td className="py-1 px-4 text-center">
                            {row.transferBengkong}
                          </td>
                        )}
                      {currentOutletTransferColumns.includes(
                        "transferMalalayang"
                      ) && (
                          <td className="py-1 px-4 text-center">
                            {row.transferMalalayang}
                          </td>
                        )}
                      {currentOutletTransferColumns.includes(
                        "transferKleak"
                      ) && (
                          <td className="py-1 px-4 text-center">
                            {row.transferKleak}
                          </td>
                        )}
                      {currentOutletTransferColumns.includes(
                        "transferPaniki"
                      ) && (
                          <td className="py-1 px-4 text-center">
                            {row.transferPaniki}
                          </td>
                        )}
                      {currentOutletTransferColumns.includes(
                        "transferMantos"
                      ) && (
                          <td className="py-1 px-4 text-center">
                            {row.transferMantos}
                          </td>
                        )}
                      {currentOutletTransferColumns.includes("transferItc") && (
                        <td className="py-1 px-4 text-center">
                          {row.transferItc}
                        </td>
                      )}
                      {currentOutletTransferColumns.includes("transferMaumbi") && (
                        <td className="py-1 px-4 text-center">
                          {row.transferMaumbi}
                        </td>
                      )}
                      {currentOutletTransferColumns.includes("transferTuminting") && (
                        <td className="py-1 px-4 text-center">
                          {row.transferTuminting}
                        </td>
                      )}
                      {currentOutletTransferColumns.includes("transfer17Agustus") && (
                        <td className="py-1 px-4 text-center">
                          {row.transfer17Agustus}
                        </td>
                      )}
                      {currentOutletTransferColumns.includes("transferPerkamil") && (
                        <td className="py-1 px-4 text-center">
                          {row.transferPerkamil}
                        </td>
                      )}
                      {/* End Conditionally rendered Transfer Data Cells */}
                      <td className="py-1 px-4 text-center">
                        {row.closingBalance}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {reportData && reportData.length > rowsPerPage && (
          <div className="flex justify-center items-center mt-6 space-x-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || loadingCapture}
              className={`px-4 py-2 rounded-md font-bold transition duration-200
                ${currentPage === 1 || loadingCapture
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
                }`}
            >
              Previous
            </button>
            <span className="text-lg text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || loadingCapture}
              className={`px-4 py-2 rounded-md font-bold transition duration-200
                ${currentPage === totalPages || loadingCapture
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
                }`}
            >
              Next
            </button>
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
