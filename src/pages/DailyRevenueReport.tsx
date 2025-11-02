// src/components/DailyRevenueReport.tsx
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { IoCalendarOutline } from "react-icons/io5";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { UserRole } from "../types/User";

import * as htmlToImage from "html-to-image";

type Props = {
  outletId: string;
  cashierName?: string;
  userRole: UserRole;
};

interface PaymentTypeRevenue {
  paymentType: string;
  Revenue: number;
}

interface CashReconciliation {
  previousDayBalance: number;
  cashDeposit: number;
  adjustmentAmount: number;
  remainingBalance: number;
  isLocked: boolean;
  submittedByCashierName?: string;
}

interface DailyRevenueSummary {
  totalRevenueByPaymentType: PaymentTypeRevenue[];
  TotalRevenueExcldCash: number;
  TotalRevenue: number;
  totalDrinkRevenue: number;
  cashReconciliation: CashReconciliation;
  paymentRemarks?: { [key: string]: string };
}

interface DailyRevenueReportData {
  meta: {
    reportDate: string;
    generatedAt: string;
    outletName: string;
  };
  summary: DailyRevenueSummary;
}

const formatCurrency = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  min = undefined,
  max = undefined,
  step = undefined,
  readOnly = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
  readOnly?: boolean;
}) {
  const isDate = type === "date";
  const inputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
    if (inputRef.current) {
      inputRef.current.showPicker?.();
      inputRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col">
      <label className="text-sm text-gray-300 mb-1">{label}</label>
      <div className="relative flex-grow">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className={`w-full bg-gray-800 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-green-500
            ${
              isDate
                ? "appearance-none pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
                : ""
            }
            ${readOnly ? "bg-gray-700 text-gray-400 cursor-not-allowed" : ""}
          `}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
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

export default function DailyRevenueReport({
  outletId,
  cashierName = "Cashier User",
  userRole,
}: Props) {
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dailyReportData, setDailyReportData] =
    useState<DailyRevenueReportData | null>(null);
  const [cashDepositInput, setCashDepositInput] = useState<number | "">("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  const [loadingCapture, setLoadingCapture] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [adjustmentInput, setAdjustmentInput] = useState<number | "">("");
  const reportRef = useRef<HTMLDivElement>(null);

  const [paymentRemarks, setPaymentRemarks] = useState<{
    [key: string]: string;
  }>({});

  const [isLocked, setIsLocked] = useState(false);
  const [displayedCashierName, setDisplayedCashierName] = useState(cashierName);

  const handleRemarkChange = useCallback(
    (paymentType: string, value: string) => {
      setPaymentRemarks((prev) => ({
        ...prev,
        [paymentType]: value,
      }));
    },
    []
  );

  const fetchDailyReport = useCallback(async () => {
    if (!reportDate || !outletId) {
      setError("Please select a date and ensure outlet ID is available.");
      return;
    }

    setLoadingReport(true);
    setDailyReportData(null);
    setError(null);
    setSubmitMessage(null);
    setCashDepositInput("");
    setAdjustmentInput("");
    setPaymentRemarks({}); // Clear remarks before fetching to ensure fresh data
    setIsLocked(false); // Reset lock status before fetching
    setDisplayedCashierName(cashierName); // Reset displayed name to current user's name

    try {
      const params = new URLSearchParams({
        outletId,
        date: reportDate,
      });

      const res = await fetchWithAuth(
        `/api/reports/daily-revenue?${params.toString()}`
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch daily report.");
      }
      const data: DailyRevenueReportData = await res.json();
      setDailyReportData(data);

      if (data.summary.cashReconciliation.cashDeposit > 0) {
        setCashDepositInput(data.summary.cashReconciliation.cashDeposit);
      } else {
        setCashDepositInput("");
      }

      setAdjustmentInput(
        isNaN(data.summary.cashReconciliation.adjustmentAmount)
          ? ""
          : data.summary.cashReconciliation.adjustmentAmount
      );

      if (data.summary.paymentRemarks) {
        setPaymentRemarks(data.summary.paymentRemarks);
      } else {
        setPaymentRemarks({});
      }

      const isReportLocked = data.summary.cashReconciliation.isLocked || false;
      setIsLocked(isReportLocked);

      if (
        isReportLocked &&
        data.summary.cashReconciliation.submittedByCashierName
      ) {
        setDisplayedCashierName(
          data.summary.cashReconciliation.submittedByCashierName
        );
      } else {
        setDisplayedCashierName("-");
      }
    } catch (error) {
      console.error("Failed to fetch daily report:", error);
      setError("Failed to fetch daily report. Please try again.");
    } finally {
      setLoadingReport(false);
    }
  }, [outletId, reportDate, cashierName]);

  const submitCashReconciliation = async () => {
    // Prevent submission if already locked
    if (isLocked) {
      setError("This report is locked and cannot be submitted.");
      return;
    }

    if (!reportDate || !outletId || cashDepositInput === "") {
      setError("Please ensure date, outlet ID, and cash deposit are provided.");
      return;
    }

    setLoadingSubmit(true);
    setError(null);
    setSubmitMessage(null);

    try {
      const res = await fetchWithAuth(
        `/api/reports/submit-daily-cash-reconciliation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outletId,
            date: reportDate,
            cashDeposit: Number(cashDepositInput),
            adjustment: Number(adjustmentInput || 0),
            remarks: paymentRemarks,
            submittedByCashierName: cashierName,
            ...(userRole === "ADMIN" && {}),
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit reconciliation.");
      }

      const data = await res.json();
      setSubmitMessage(data.message || "Submission successful!");

      await fetchDailyReport();
    } catch (error) {
      console.error("Failed to submit reconciliation:", error);
      setError("Failed to submit reconciliation. Please try again.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Unlock function for ADMIN role
  const handleUnlock = async () => {
    if (!reportDate || !outletId) {
      setError("Cannot unlock: Date and Outlet ID are required.");
      return;
    }

    setLoadingUnlock(true);
    setError(null);
    setSubmitMessage(null);

    try {
      const res = await fetchWithAuth(
        `/api/reports/unlock-cash-reconciliation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outletId,
            date: reportDate,
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to unlock reconciliation.");
      }

      const data = await res.json();
      setSubmitMessage(data.message || "Reconciliation unlocked successfully!");

      // Re-fetch the report to reflect the unlocked status
      await fetchDailyReport();
    } catch (error) {
      // Explicitly type error
      console.error("Failed to unlock reconciliation:", error);
      setError("Failed to unlock reconciliation. Please try again.");
    } finally {
      setLoadingUnlock(false);
    }
  };

  // --- Refactored function to capture the screen using html-to-image ---
  const handleCaptureScreen = useCallback(async () => {
    if (reportRef.current) {
      setLoadingCapture(true);
      setError(null);
      setSubmitMessage(null); // Clear previous messages
      try {
        const dataUrl = await htmlToImage.toPng(reportRef.current, {
          pixelRatio: 2, // For higher resolution image
          cacheBust: true, // Prevents caching of images
        });

        // Create a temporary link element to download the image
        const link = document.createElement("a");
        link.download = `DailyRevenueReport_${reportDate}_${outletId}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setSubmitMessage("Report captured successfully!");
      } catch (err) {
        console.error("Failed to capture screen:", err);
        setError("Failed to capture report. Please try again.");
      } finally {
        setLoadingCapture(false);
      }
    } else {
      setError("Report content not found for capture.");
    }
  }, [reportDate, outletId]);

  const calculatedRemainingBalance = useMemo(() => {
    if (!dailyReportData) return 0;

    const previousBalance =
      dailyReportData.summary.cashReconciliation.previousDayBalance;
    const cashRevenue =
      dailyReportData.summary.totalRevenueByPaymentType.find(
        (p) => p.paymentType === "CASH"
      )?.Revenue || 0;
    const currentCashDeposit = Number(cashDepositInput || 0);
    const adjustment = userRole === "ADMIN" ? Number(adjustmentInput || 0) : 0;

    return previousBalance + cashRevenue + adjustment - currentCashDeposit;
  }, [dailyReportData, cashDepositInput, adjustmentInput, userRole]);

  useEffect(() => {
    if (outletId) {
      fetchDailyReport();
    }
  }, [outletId, reportDate, fetchDailyReport]);

  const getPaymentTypeRevenue = useCallback(
    (paymentType: string) => {
      return (
        dailyReportData?.summary.totalRevenueByPaymentType.find(
          (p) => p.paymentType === paymentType.toUpperCase()
        )?.Revenue || 0
      );
    },
    [dailyReportData] // getPaymentTypeRevenue depends on dailyReportData
  );

  const debitPaymentTypes = useMemo(
    () => [
      "QRIS",
      "BANK_TRANSFER",
      "GOFOOD",
      "GRABFOOD",
      "SHOPEEFOOD",
      "KASBON",
    ],
    []
  );

  const totalDebit = useMemo(() => {
    return debitPaymentTypes.reduce(
      (sum, type) => sum + getPaymentTypeRevenue(type),
      0
    );
  }, [debitPaymentTypes, getPaymentTypeRevenue]);

  const shouldGeneralInputsBeReadOnly =
    isLocked || loadingReport || loadingSubmit;
  // Determine if submit button should be disabled
  const shouldSubmitBeDisabled =
    isLocked ||
    loadingSubmit ||
    (typeof cashDepositInput !== "number" && cashDepositInput === "");

  return (
    <div className="min-h-screen text-white p-4 md:p-6 flex flex-col items-center">
      {/* Assign the ref to the div you want to capture */}
      <div
        ref={reportRef}
        className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-5 space-y-5 border border-green-700"
      >
        {/* Header Section */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-green-400">
            Daily Revenue Report
          </h1>
          <p className="text-sm text-gray-400">
            Date: {dailyReportData?.meta.reportDate || reportDate}
            {isLocked && (
              <span className="text-red-500 font-bold ml-2">(LOCKED)</span>
            )}{" "}
          </p>
        </div>

        <div className="flex justify-between items-center text-lg mb-4">
          <p>
            <span className="text-gray-300">Outlet:</span>{" "}
            <span className="font-semibold text-white">
              {dailyReportData?.meta.outletName || "Loading..."}
            </span>
          </p>
          <p>
            <span className="text-gray-300">Cashier:</span>{" "}
            <span className="font-semibold text-white">
              {displayedCashierName}
            </span>
          </p>
        </div>

        <hr className="border-gray-700" />

        {/* Date Selector */}
        <div className="mb-4">
          <InputField
            label="Select Report Date"
            type="date"
            value={reportDate}
            onChange={setReportDate}
            max={new Date().toISOString().split("T")[0]}
            readOnly={loadingReport || loadingSubmit}
          />
        </div>

        {error && (
          <p className="text-red-400 text-center text-sm mb-4">{error}</p>
        )}
        {submitMessage && (
          <p className="text-blue-400 text-center text-sm mb-4">
            {submitMessage}
          </p>
        )}

        {dailyReportData && (
          <div className="space-y-5">
            {/* Total Revenue */}
            <div className="flex justify-between items-center p-3 bg-green-900 rounded-md">
              <span className="text-lg font-bold">TOTAL PENJUALAN</span>
              <span className="text-xl font-extrabold text-white">
                {formatCurrency(dailyReportData.summary.TotalRevenue)}
              </span>
            </div>

            {/* Debit Payments */}
            <div className="border border-gray-700 rounded-md p-3">
              <h2 className="text-lg font-semibold text-gray-300 mb-2">
                Penjualan Debit
              </h2>
              {debitPaymentTypes.map((type) => (
                <div key={type} className="space-y-1 py-1">
                  <div className="flex justify-between text-sm">
                    <span>{type}</span>
                    <span className="font-medium">
                      {formatCurrency(getPaymentTypeRevenue(type))}
                    </span>
                  </div>
                  {(type === "QRIS" || type === "BANK_TRANSFER") && (
                    <InputField
                      label=""
                      value={paymentRemarks[type] || ""}
                      onChange={(val) => handleRemarkChange(type, val)}
                      placeholder={`Add remarks for ${type}`}
                      readOnly={shouldGeneralInputsBeReadOnly}
                    />
                  )}
                </div>
              ))}
              <hr className="border-gray-700 my-2" />
              <div className="flex justify-between font-bold text-md">
                <span>TOTAL DEBIT</span>
                <span>{formatCurrency(totalDebit)}</span>
              </div>
            </div>

            {/* Cash Revenue */}
            <div className="flex flex-col border border-gray-700 rounded-md p-3 space-y-2">
              <div className="flex justify-between items-center w-full">
                <span className="text-lg font-semibold text-gray-300">
                  PENJUALAN TUNAI
                </span>
                <span className="font-medium text-white">
                  {formatCurrency(getPaymentTypeRevenue("CASH"))}
                </span>
              </div>
              <InputField
                label=""
                value={paymentRemarks["CASH"] || ""}
                onChange={(val) => handleRemarkChange("CASH", val)}
                placeholder="Add remarks for Cash"
                readOnly={shouldGeneralInputsBeReadOnly}
              />
            </div>

            {/* Cash Reconciliation */}
            <div className="border border-yellow-700 rounded-md p-3 space-y-3">
              <h2 className="text-lg font-semibold text-yellow-300">
                Data Uang Lebih
              </h2>
              <div className="flex justify-between">
                <span>Sisa Uang lebih kemarin</span>
                <span className="font-medium">
                  {formatCurrency(
                    dailyReportData.summary.cashReconciliation
                      .previousDayBalance
                  )}
                </span>
              </div>
              <InputField
                label="Transfer hari ini"
                type="number"
                value={cashDepositInput}
                onChange={(val) =>
                  setCashDepositInput(val === "" ? "" : Number(val))
                }
                placeholder="Nilai Transfer"
                step="0.01"
                readOnly={shouldGeneralInputsBeReadOnly}
              />
              <InputField
                label="Adjustment"
                type="number"
                value={adjustmentInput}
                onChange={(val) =>
                  setAdjustmentInput(val === "" ? "" : Number(val))
                }
                placeholder="Nilai Adjustment"
                step="0.01"
                readOnly={shouldGeneralInputsBeReadOnly || userRole !== "ADMIN"}
              />
              <div className="flex justify-between font-bold text-md pt-2">
                <span>Total sisa uang lebih</span>
                <span>{formatCurrency(calculatedRemainingBalance)}</span>
              </div>
              <button
                onClick={submitCashReconciliation}
                disabled={shouldSubmitBeDisabled}
                className={`mt-3 w-full px-4 py-2 rounded font-semibold text-lg ${
                  shouldSubmitBeDisabled
                    ? "bg-blue-700 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                {loadingSubmit ? "Submitting..." : "Submit Deposit"}
              </button>

              {/* Unlock Button (visible only to Admin if locked) */}
              {isLocked && userRole === "ADMIN" && (
                <button
                  onClick={handleUnlock}
                  disabled={loadingUnlock}
                  className={`mt-2 w-full px-4 py-2 rounded font-semibold text-lg ${
                    loadingUnlock
                      ? "bg-red-700 text-gray-400 cursor-not-allowed"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {loadingUnlock ? "Unlocking..." : "Unlock Report"}
                </button>
              )}
            </div>

            <hr className="border-gray-700 my-4" />

            {/* Total Drink Revenue */}
            <div className="flex justify-between items-center p-3 bg-indigo-900 rounded-md">
              <span className="text-lg font-bold">TOTAL DRINK REVENUE</span>
              <span className="text-xl font-extrabold text-white">
                {formatCurrency(dailyReportData.summary.totalDrinkRevenue)}
              </span>
            </div>
          </div>
        )}

        {!dailyReportData && !loadingReport && !error && (
          <p className="text-white text-center p-4">
            Select a date to view the report.
          </p>
        )}
      </div>

      {/* Capture Screen Button */}
      {dailyReportData && (
        <button
          onClick={handleCaptureScreen}
          disabled={loadingCapture}
          className={`bg-blue-500 mt-3 hover:bg-blue-600 px-4 py-2 rounded flex items-center justify-center w-full sm:w-auto transition duration-200 ${
            loadingCapture ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loadingCapture ? (
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
  );
}
