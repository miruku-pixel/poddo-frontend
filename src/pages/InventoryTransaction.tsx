import { useState, useEffect, useCallback, useRef } from "react";

import { fetchWithAuth } from "../utils/fetchWithAuth"; // Assuming this is correctly configured
// Basic fetchWithAuth implementation for demonstration.
// REPLACE THIS WITH YOUR ACTUAL '../utils/fetchWithAuth' IN A REAL PROJECT

// Reusable InputField Component (Adapted to allow `as` prop for textarea)
type Props = {
  outletId: string;
  outletName: string;
  userRole: string;
};

const CalendarIcon = ({
  onClick,
  className,
}: {
  onClick?: (event: React.MouseEvent<SVGSVGElement>) => void;
  className?: string;
}) => (
  <svg
    className={className}
    onClick={onClick}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M8 7V3m8 4V3m-9 8h.01M16 11h.01M9 15h.01M15 15h.01M9 19h.01M15 19h.01M5 19V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2z"
    />
  </svg>
);

// Helper to format date to Brandenburg-MM-DD
const formatDateToISO = (date: Date | string): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Reusable InputField Component (Adapted to allow `as` prop for textarea)
function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  readOnly = false,
  as = "input", // 'input' or 'textarea'
  rows = undefined, // For textarea
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  as?: "input" | "textarea";
  rows?: number;
}) {
  const isDate = type === "date";
  // Use separate refs for input and textarea based on the 'as' prop
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleIconClick = () => {
    // Only call showPicker if it's an input element
    if (inputRef.current && inputRef.current.showPicker) {
      inputRef.current.showPicker();
      inputRef.current.focus();
    }
  };

  // Common props for both input and textarea
  const commonProps = {
    value: value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    readOnly: readOnly,
    className: `w-full bg-gray-800 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-green-500
      ${isDate
        ? "appearance-none pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
        : ""
      }
      ${readOnly ? "bg-gray-700 text-gray-400 cursor-not-allowed" : ""}
      ${as === "textarea" ? "resize-none" : ""}
    `,
    placeholder: placeholder,
  };

  return (
    <div className="flex flex-col">
      <label className="text-sm text-gray-300 mb-1">{label}</label>
      <div className="relative flex-grow">
        {as === "textarea" ? (
          <textarea
            {...commonProps}
            ref={textareaRef}
            rows={rows || 3}
          ></textarea>
        ) : (
          <input {...commonProps} ref={inputRef} type={type} />
        )}
        {isDate && (
          <CalendarIcon
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white cursor-pointer h-5 w-5"
            onClick={handleIconClick}
          />
        )}
      </div>
    </div>
  );
}

// Reusable SelectField Component (Still used for Transaction Type selection)
function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm text-gray-300 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full bg-gray-800 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-green-500
          ${disabled ? "bg-gray-700 text-gray-400 cursor-not-allowed" : ""}
        `}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Define a type for Ingredient to be used in state
interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

// Define a type for transfer option visibility in the dropdown
type TransferOptionsVisibilityMap = {
  [key: string]: string[]; // Keys are outlet names, values are arrays of transfer type values
};

// Define a mapping for which transfer options to show based on outletName
const transferOptionsVisibility: TransferOptionsVisibilityMap = {
  "PoDDo-Nagoya": ["TRANSFER_BENGKONG", "TRANSFER_SERAYA"],
  "PoDDo-Bengkong": ["TRANSFER_NAGOYA", "TRANSFER_SERAYA"],
  "PoDDo-Seraya": ["TRANSFER_NAGOYA", "TRANSFER_BENGKONG"],
  "Podomoro-Malalayang": ["TRANSFER_ITC", "TRANSFER_PANIKI", "TRANSFER_KLEAK", "TRANSFER_MANTOS"],
  "Podomoro-Kleak": ["TRANSFER_ITC", "TRANSFER_PANIKI", "TRANSFER_MALALAYANG", "TRANSFER_MANTOS"],
  "Podomoro-Mantos": ["TRANSFER_ITC", "TRANSFER_PANIKI", "TRANSFER_MALALAYANG", "TRANSFER_KLEAK"],
  "Xpress-Paniki": ["TRANSFER_ITC", "TRANSFER_KLEAK", "TRANSFER_MALALAYANG", "TRANSFER_MANTOS"],
  "Xpress-ITC": ["TRANSFER_PANIKI", "TRANSFER_KLEAK", "TRANSFER_MALALAYANG", "TRANSFER_MANTOS"],
  // Add more outlets and their allowed transfers here as they go live
};

export default function InventoryTransaction({
  outletId,
  outletName,
  userRole,
}: Props) {
  // State for ingredients and selected ingredient
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");

  const [transactionType, setTransactionType] = useState("INBOUND"); // Default to INBOUND
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [dailyRecordId, setDailyRecordId] = useState(null); // Stores ID if a record exists for selected date
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // State for selected date, initialized to TODAY's date (formatted)
  const [selectedDate, setSelectedDate] = useState(formatDateToISO(new Date()));

  const currentDateISO = formatDateToISO(new Date());

  const handleClearMessages = useCallback(() => {
    setErrorMessage("");
    setSuccessMessage("");
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
        console.error("Failed to load ingredients for selection.", err);
      }
    };
    loadIngredients();
  }, [outletId]); // Re-run when outletId changes

  // Effect to fetch daily record when transaction type, date, or selected ingredient changes
  useEffect(() => {
    const loadDailyRecord = async () => {
      // Ensure essential fields are present before making API call
      if (
        !transactionType ||
        !selectedDate ||
        !selectedIngredientId ||
        !outletId
      ) {
        if (!selectedDate || !selectedIngredientId || !outletId) {
          setDailyRecordId(null);
          setQuantity("");
          setNote("");
          setErrorMessage(
            "Please select a valid date, ingredient, and ensure outlet is selected."
          );
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      try {
        const params = new URLSearchParams({
          ingredientId: selectedIngredientId, // Use selected ID
          type: transactionType,
          date: selectedDate,
          outletId: outletId,
        });
        const res = await fetchWithAuth(
          `/api/inventory/daily-summary?${params.toString()}`
        );
        if (!res.ok) {
          if (res.status === 404) {
            setDailyRecordId(null);
            setQuantity("");
            setNote("");
            setSuccessMessage(
              `No record for ${selectedDate} for this ingredient at this outlet. You can submit a new one.`
            );
            return;
          }
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch daily record.");
        }
        const record = await res.json();

        if (record) {
          setDailyRecordId(record.id);
          setQuantity(record.quantity.toString());
          setNote(record.note || "");
          setSuccessMessage(
            `Record found for ${selectedDate} for this ingredient at this outlet. You can edit it.`
          );
        } else {
          setDailyRecordId(null);
          setQuantity("");
          setNote("");
          setSuccessMessage(
            `No record for ${selectedDate} for this ingredient at this outlet. You can submit a new one.`
          );
        }
      } catch (err) {
        setErrorMessage("Failed to fetch daily record, Unknown error");
        console.error("Error fetching daily record:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDailyRecord();
  }, [
    transactionType,
    selectedDate,
    selectedIngredientId, // Dependency added here
    outletId,
    handleClearMessages,
  ]);

  const handleSubmit = useCallback(async () => {
    handleClearMessages();
    if (
      !transactionType ||
      quantity === "" ||
      isNaN(parseFloat(quantity)) ||
      parseFloat(quantity) < 0 ||
      !selectedDate ||
      !selectedIngredientId || // Use selected ID
      !outletId
    ) {
      setErrorMessage(
        "Please select a type, date, ingredient, outlet, and enter a valid positive quantity."
      );
      return;
    }
    if (dailyRecordId) {
      setErrorMessage(
        'A record already exists for the selected date and ingredient. Please use the "Edit" button.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        ingredientId: selectedIngredientId, // Use selected ID
        quantity: parseFloat(quantity),
        type: transactionType,
        note: note,
        date: selectedDate,
        outletId: outletId,
      };
      const res = await fetchWithAuth(`/api/inventory/daily-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 409 && errorData.recordId) {
          setDailyRecordId(errorData.recordId);
          setErrorMessage(
            errorData.error ||
            `A ${data.type} record for this ingredient and outlet already exists for this date. Use EDIT to modify.`
          );
        } else {
          throw new Error(errorData.error || "Failed to submit transaction.");
        }
      } else {
        const responseData = await res.json();
        setSuccessMessage(`Transaction submitted successfully!`);
        setDailyRecordId(responseData.id);
      }
    } catch (err) {
      setErrorMessage("Error submitting transaction, Unknown error");
      console.error("Submit error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    transactionType,
    quantity,
    note,
    selectedDate,
    dailyRecordId,
    selectedIngredientId, // Dependency added here
    outletId,
    handleClearMessages,
  ]);

  const handleEdit = useCallback(async () => {
    handleClearMessages();
    if (!dailyRecordId) {
      setErrorMessage(
        "No record exists to edit for the selected date. Please submit a new one first."
      );
      return;
    }
    if (
      quantity === "" ||
      isNaN(parseFloat(quantity)) ||
      parseFloat(quantity) < 0
    ) {
      setErrorMessage("Please enter a valid positive quantity to edit.");
      return;
    }
    if (!outletId || !selectedIngredientId) {
      // Ensure ingredientId is also available
      setErrorMessage(
        "Outlet ID or Ingredient ID is missing for editing this record."
      );
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        quantity: parseFloat(quantity),
        note: note,
        outletId: outletId, // Include outletId in the payload for PUT request
        ingredientId: selectedIngredientId, // Required for backend PUT API to ensure correct update path
      };
      const url = `/api/inventory/daily-transaction/${dailyRecordId}`;

      const res = await fetchWithAuth(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error ||
          errorData.message ||
          "Failed to update transaction."
        );
      }
      const responseData = await res.json();
      setSuccessMessage(
        `Transaction ID ${responseData.id} updated successfully!`
      );
    } catch (err) {
      setErrorMessage("Error updating transaction, Unknown error");
      console.error("Edit error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    dailyRecordId,
    quantity,
    note,
    outletId,
    selectedIngredientId,
    handleClearMessages,
  ]); // Dependencies adjusted

  const handleReset = useCallback(() => {
    handleClearMessages();
    setQuantity("");
    setNote("");
    setSelectedDate(formatDateToISO(new Date()));
    setTransactionType("INBOUND");
    // selectedIngredientId is not reset here, as it's assumed user might want to keep it
    // dailyRecordId will be reset by the useEffect when dependencies change
  }, [handleClearMessages]);

  // Determine which transaction types to display based on the current outletName
  const allowedTransferTypes = transferOptionsVisibility[outletName] || [];

  const transactionTypeOptions = [
    { value: "INBOUND", label: "Pemasukan" },
    { value: "DISCREPANCY", label: "Rusak" },
    // Conditionally add transfer options
    ...(allowedTransferTypes.includes("TRANSFER_NAGOYA")
      ? [{ value: "TRANSFER_NAGOYA", label: "Transfer (Nagoya)" }]
      : []),
    ...(allowedTransferTypes.includes("TRANSFER_SERAYA")
      ? [{ value: "TRANSFER_SERAYA", label: "Transfer (Seraya)" }]
      : []),
    ...(allowedTransferTypes.includes("TRANSFER_BENGKONG")
      ? [{ value: "TRANSFER_BENGKONG", label: "Transfer (Bengkong)" }]
      : []),
    ...(allowedTransferTypes.includes("TRANSFER_MALALAYANG")
      ? [{ value: "TRANSFER_MALALAYANG", label: "Transfer (Malalayang)" }]
      : []),
    ...(allowedTransferTypes.includes("TRANSFER_KLEAK")
      ? [{ value: "TRANSFER_KLEAK", label: "Transfer (Kleak)" }]
      : []),
    ...(allowedTransferTypes.includes("TRANSFER_MANTOS")
      ? [{ value: "TRANSFER_MANTOS", label: "Transfer (Mantos)" }]
      : []),
    ...(allowedTransferTypes.includes("TRANSFER_PANIKI")
      ? [{ value: "TRANSFER_PANIKI", label: "Transfer (Paniki)" }]
      : []),
    ...(allowedTransferTypes.includes("TRANSFER_ITC")
      ? [{ value: "TRANSFER_ITC", label: "Transfer (ITC)" }]
      : []),
  ];

  const shouldDisableInputsAndButtons =
    isLoading || (userRole !== "ADMIN" && selectedDate !== currentDateISO);
  // Disable submit button if loading or if a record already exists for the selected date/ingredient/type
  const shouldSubmitBeDisabled =
    isLoading ||
    dailyRecordId !== null ||
    !selectedIngredientId ||
    !outletId ||
    (userRole !== "ADMIN" && selectedDate !== currentDateISO); // New condition
  // Disable edit button if loading or if no record exists for the selected date/ingredient/type
  const shouldEditBeDisabled =
    isLoading ||
    dailyRecordId === null ||
    !selectedIngredientId ||
    !outletId ||
    (userRole !== "ADMIN" && selectedDate !== currentDateISO);

  return (
    <div className="min-h-screen text-white p-4 md:p-6 flex flex-col items-center font-sans">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-5 space-y-5 border border-green-700">
        {/* Header Section */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-green-400">
            Daily Stock Transaction
          </h1>
          <p className="text-sm text-gray-400">
            Manage your ingredient stock movements
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
        {successMessage && (
          <div className="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Success!</strong>
            <span className="block sm:inline ml-2">{successMessage}</span>
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

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Display Outlet Name */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-300 mb-1">Outlet:</label>
            <div className="w-full bg-gray-700 text-gray-300 border border-gray-600 rounded p-2 cursor-not-allowed">
              {outletName || "Loading Outlet..."}
            </div>
          </div>

          <InputField
            label="Date:"
            type="date"
            value={selectedDate}
            onChange={setSelectedDate}
            readOnly={isLoading}
          />

          {/* Ingredient Select - Replaced hardcoded display */}
          <SelectField
            label="Bahan:"
            value={selectedIngredientId}
            onChange={setSelectedIngredientId}
            options={[
              { value: "", label: "Select an ingredient", disabled: true },
              ...ingredients.map((ing) => ({
                value: ing.id,
                label: `${ing.name} (${ing.unit})`,
              })),
            ]}
            disabled={isLoading || ingredients.length === 0}
          />

          <SelectField
            label="Tipe Transaksi:"
            value={transactionType}
            onChange={setTransactionType}
            options={transactionTypeOptions} // Use the conditionally generated options
            disabled={isLoading}
          />

          <InputField
            label="Quantity:"
            type="number"
            value={quantity}
            onChange={setQuantity}
            placeholder="e.g., 10"
            readOnly={shouldDisableInputsAndButtons}
          />

          <InputField
            label="Note (Optional):"
            as="textarea"
            value={note}
            onChange={setNote}
            placeholder="e.g., New delivery from supplier A / Stock missing due to damage"
            readOnly={shouldDisableInputsAndButtons}
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 space-x-3">
          <button
            onClick={handleSubmit}
            disabled={shouldSubmitBeDisabled}
            className={`flex-1 px-4 py-2 rounded font-semibold text-lg transition duration-200
              ${shouldSubmitBeDisabled
                ? "bg-blue-700 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
              }
            `}
          >
            {isLoading ? "Submitting..." : "Submit"}
          </button>
          <button
            onClick={handleEdit}
            disabled={shouldEditBeDisabled}
            className={`flex-1 px-4 py-2 rounded font-semibold text-lg transition duration-200
              ${shouldEditBeDisabled
                ? "bg-green-700 text-gray-400 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
              }
            `}
          >
            {isLoading ? "Updating..." : "Edit"}
          </button>
          <button
            onClick={handleReset}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded font-semibold text-lg transition duration-200
              ${isLoading
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-gray-500 hover:bg-gray-600 text-white"
              }
            `}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
