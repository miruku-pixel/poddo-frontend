import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { IoCalendarOutline } from "react-icons/io5";

type Props = {
  outletId: string;
};

interface BillingRecord {
  billingId: string;
  paidAt: string;
  receiptNumber: string;
  paymentType: string;
  outletId: string;
  cashierId: string;
  cashierName: string;
  orderId: string;
  orderNumber: number;
  orderType: string;
  waiterName: string;
  diningTable: string;
  remark: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  changeGiven: number;
  foodId: string;
  foodName: string;
  itemQuantity: number;
  itemUnitPrice: number;
  itemTotalPrice: number;
  itemOptions: string;
}

const ORDER_TYPES = ["all", "Take Away", "GoFood", "GrabFood", "Dine In"];

const PAYMENT_TYPES = [
  "all",
  "CASH",
  "CARD",
  "QRIS",
  "DEBIT",
  "E_WALLET",
  "BANK_TRANSFER",
];
// Helper to format YYYY-MM-DD to DD/MM/YYYY for display
const formatDateToDisplay = (dateString: string): string => {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    // Basic check for valid number parts before reordering
    if (!isNaN(Number(year)) && !isNaN(Number(month)) && !isNaN(Number(day))) {
      return `${day}/${month}/${year}`;
    }
  }
  return dateString; // Return as is if not in expected YYYY-MM-DD format
};

// Helper to parse DD/MM/YYYY to YYYY-MM-DD for API
const parseDateForAPI = (dateString: string): string => {
  if (!dateString) return "";
  const parts = dateString.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    // Basic validation for valid date parts
    if (Number(year) && Number(month) && Number(day)) {
      // Create a Date object to validate the date (e.g., 31/02/2023 is invalid)
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      // Check if the date object's year, month, and day match the input to ensure validity
      if (
        date.getFullYear() === Number(year) &&
        date.getMonth() === Number(month) - 1 &&
        date.getDate() === Number(day)
      ) {
        // Ensure month and day are two digits
        const formattedMonth = String(Number(month)).padStart(2, "0");
        const formattedDay = String(Number(day)).padStart(2, "0");
        return `${year}-${formattedMonth}-${formattedDay}`;
      }
    }
  }
  // If not valid DD/MM/YYYY, try to parse as is (might be YYYY-MM-DD already)
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString; // It's already YYYY-MM-DD
    }
  } catch (e) {
    console.warn("Invalid date fallback:", e);
  }
  return ""; // Return empty string if parsing fails or invalid format
};

// Modified InputField component to dynamically switch input type
function InputField({
  label,
  value, // This 'value' is always YYYY-MM-DD from parent state
  onChange, // This 'onChange' expects YYYY-MM-DD
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const isDate = type === "date"; // Flag to apply date-specific logic
  const inputRef = useRef<HTMLInputElement>(null); // Single ref for the input element

  // Internal state for the displayed value (DD/MM/YYYY for date type)
  const [displayValue, setDisplayValue] = useState<string>(
    isDate ? formatDateToDisplay(value) : value
  );

  // Effect to update displayValue when parent's 'value' (YYYY-MM-DD) changes
  useEffect(() => {
    if (isDate) {
      setDisplayValue(formatDateToDisplay(value));
    } else {
      setDisplayValue(value);
    }
  }, [value, isDate]);

  // Handle text input changes (user typing DD/MM/YYYY for date type)
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayValue = e.target.value;
    setDisplayValue(newDisplayValue); // Update display immediately

    if (isDate) {
      // Attempt to parse DD/MM/YYYY to YYYY-MM-DD for parent state
      const apiFormattedDate = parseDateForAPI(newDisplayValue);
      // Only call parent onChange if a valid YYYY-MM-DD format is produced
      // or if the input is cleared
      if (apiFormattedDate || newDisplayValue === "") {
        onChange(apiFormattedDate);
      }
    } else {
      onChange(newDisplayValue);
    }
  };

  // Trigger native date picker using the text input itself
  const handleIconClick = () => {
    if (inputRef.current) {
      // Temporarily change type to 'date' to trigger picker
      inputRef.current.type = "date";
      inputRef.current.showPicker?.(); // showPicker() is a modern browser API
    }
  };

  // This function will be called when the input's value changes (either by typing or by picker selection)
  // or when the input loses focus (blur).
  const handleInputChangeOrBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    // If the input's type is currently 'date' (meaning the picker was just used),
    // capture its YYYY-MM-DD value and then revert its type to 'text'.
    if (isDate && inputRef.current && inputRef.current.type === "date") {
      const apiFormattedDate = e.target.value; // This is YYYY-MM-DD from the native picker
      onChange(apiFormattedDate); // Update parent state with YYYY-MM-DD
      setDisplayValue(formatDateToDisplay(apiFormattedDate)); // Update display with DD/MM/YYYY
      inputRef.current.type = "text"; // Revert type to 'text' for custom display
    } else {
      // If it's a text input (manual typing), handle it as before
      handleTextChange(e);
    }
  };

  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          ref={inputRef} // Assign ref to the single input element
          type={isDate ? "text" : type} // Always starts as 'text' for date inputs
          value={displayValue} // Controlled by displayValue state (DD/MM/YYYY)
          onChange={handleInputChangeOrBlur} // Handles both text input and picker selection
          onBlur={handleInputChangeOrBlur} // Ensures type reverts if blur happens without change
          className={`w-full bg-gray-800 text-white border border-gray-600 rounded p-2 ${
            isDate ? "pr-10" : "" // Only need padding for icon, no native picker indicator styling needed
          }`}
          placeholder={isDate ? "DD/MM/YYYY" : ""} // Add placeholder for date format
        />
        {isDate && (
          <IoCalendarOutline
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white cursor-pointer"
            onClick={handleIconClick} // Still allow icon click to trigger picker
            // Ensure icon is clickable over the text input area
            style={{ zIndex: 1 }}
          />
        )}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-sm text-gray-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-800 text-white border border-gray-600 rounded p-2"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SalesDetailPage({ outletId }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [orderType, setOrderType] = useState("all");
  const [paymentType, setPaymentType] = useState("all");
  const [data, setData] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

  const fetchData = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates."); // Use a custom modal in production
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        outletId,
        startDate,
        endDate,
      });

      if (orderType !== "all") params.append("orderType", orderType);
      if (paymentType !== "all") params.append("paymentType", paymentType);

      const res = await fetchWithAuth(`/api/reports/sales-detail?${params}`);
      const json = await res.json();
      setData(json.data || []);
    } catch (error) {
      console.error("Failed to fetch sales detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setOrderType("all");
    setPaymentType("all");
    setData([]);
  };

  const exportFile = async (format: "csv" | "xlsx") => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates for export."); // Use a custom modal
      return;
    }

    const params = new URLSearchParams({
      outletId,
      startDate,
      endDate,
      format,
    });

    if (orderType !== "all") params.append("orderType", orderType);
    if (paymentType !== "all") params.append("paymentType", paymentType);

    try {
      const response = await fetchWithAuth(
        `/api/reports/sales-detail?${params}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to export file");
      }

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      const fileExtension = format === "csv" ? "csv" : "xlsx";
      const filename = `sales-detailed-${startDate}-to-${endDate}.${fileExtension}`;

      const link = document.createElement("a");
      link.href = fileUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(fileUrl);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export file. Please try again.");
    }
  };

  return (
    <div className="p-6 space-y-6 text-white">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-green-400">
          Sales Detail Report
        </h1>
      </div>
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InputField
          label="Date From"
          type="date"
          value={startDate}
          onChange={setStartDate}
        />
        <InputField
          label="Date To"
          type="date"
          value={endDate}
          onChange={setEndDate}
        />
        <SelectField
          label="Order Type"
          value={orderType}
          onChange={setOrderType}
          options={ORDER_TYPES}
        />
        <SelectField
          label="Payment Type"
          value={paymentType}
          onChange={setPaymentType}
          options={PAYMENT_TYPES}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={fetchData}
          className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded"
        >
          Submit
        </button>
        <button
          onClick={resetFilters}
          className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded"
        >
          Reset
        </button>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded border border-green-400">
        <table className="min-w-full text-sm">
          <thead className="bg-green-500 text-white">
            <tr>
              <th className="px-2 py-1 text-left">Receipt Number</th>
              <th className="px-2 py-1 text-left">Order Number</th>
              <th className="px-2 py-1 text-left">Date</th>
              <th className="px-2 py-1 text-right">Total</th>
              <th className="px-2 py-1 text-left">Payment Type</th>
              <th className="px-2 py-1 text-left">Food</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-4">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-4">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.billingId} className="border-b border-green-800">
                  <td className="px-2 py-1">{row.receiptNumber}</td>
                  <td className="px-2 py-1">{row.orderNumber}</td>
                  <td className="px-2 py-1">
                    {format(new Date(row.paidAt), "PPP p")}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {formatCurrency(row.total)}
                  </td>
                  <td className="px-2 py-1">{row.paymentType}</td>
                  <td className="px-2 py-1">{row.foodName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Export Buttons */}
      {data.length > 0 && (
        <div className="flex space-x-4">
          <button
            onClick={() => exportFile("xlsx")}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
          >
            Export Excel
          </button>
          <button
            onClick={() => exportFile("csv")}
            className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded"
          >
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
}
