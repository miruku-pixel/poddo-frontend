import { useRef, useState } from "react";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { IoCalendarOutline } from "react-icons/io5";

type Props = {
  outletId: string;
};

interface SalesSummary {
  totalTransactions: number;
  totalRevenue: number;
  totalTax: number;
  totalDiscount: number;
  totalAmountPaid: number;
  totalChangeGiven: number;
  salesByPaymentType: Record<string, number>;
  salesByOrderType: Record<string, number>;
}

interface FoodSalesByCategory {
  [category: string]: {
    [foodName: string]: {
      [orderType: string]: {
        quantity: number;
        total: number;
      };
    };
  };
}

export default function SalesSummaryPage({ outletId }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<SalesSummary | null>(null);

  const [foodSalesByCategory, setFoodSalesByCategory] =
    useState<FoodSalesByCategory>({});

  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        outletId,
        startDate,
        endDate,
      });

      const res = await fetchWithAuth(
        `/api/reports/sales-summary?${params.toString()}`
      );
      const data = await res.json();
      //setBillings(data.data);
      setSummary(data.summary);
      //setFoodSales(data.foodSales);
      setFoodSalesByCategory(data.foodSalesByCategory); // Tambahkan ini
    } catch (error) {
      console.error("Failed to fetch sales summary:", error);
      setError("Failed to fetch sales summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    //setBillings([]);
    setSummary(null);
    //setFoodSales({});
  };

  const formatCurrency = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

  return (
    <div className="p-6 space-y-6 text-white">
      {error && <p className="text-red-400">{error}</p>}
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-green-400">
          Sales Summary Report
        </h1>
      </div>

      <div className="max-w-sm space-y-4">
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
      </div>

      <div className="max-w-sm flex space-x-4 mt-4">
        <button
          onClick={fetchData}
          disabled={loading}
          className={`px-4 py-2 rounded ${
            loading ? "bg-green-300" : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {loading ? "Loading..." : "Submit"}
        </button>
        <button
          onClick={resetFilters}
          className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded"
        >
          Reset
        </button>
      </div>

      {/* Summary Cards */}
      {summary && summary.salesByOrderType && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Sales by Order Type</h2>
          <div className="overflow-x-auto w-80  rounded border border-green-400">
            <table className="w-full text-sm">
              <thead className="bg-green-500 text-white">
                <tr>
                  <th className="px-4 py-2 text-left">Order Type</th>
                  <th className="px-4 py-2 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.salesByOrderType).map(
                  ([orderType, total]) => (
                    <tr key={orderType} className="border-b border-green-700">
                      <td className="px-4 py-2">{orderType}</td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {foodSalesByCategory &&
        Object.entries(foodSalesByCategory).map(([category, foods]) => (
          <div key={category}>
            <h2 className="text-xl font-bold mb-2">{category}</h2>
            <div className="overflow-x-auto rounded border border-yellow-400 mb-4">
              <table className="min-w-full text-sm">
                <thead className="bg-yellow-500 text-white">
                  <tr>
                    <th className="px-2 py-1 text-left">Item Menu</th>
                    {["Dine In", "Take Away", "GoFood", "GrabFood"].map(
                      (orderType) => (
                        <th
                          key={orderType}
                          className="px-2 py-1 text-center"
                          colSpan={2}
                        >
                          {orderType}
                        </th>
                      )
                    )}
                    <th className="px-2 py-1 text-center" colSpan={2}>
                      Total
                    </th>
                  </tr>
                  <tr>
                    <th></th>
                    {[
                      "Dine In",
                      "Take Away",
                      "GoFood",
                      "GrabFood",
                      "Total",
                    ].map((orderType) => (
                      <>
                        <th
                          key={`${orderType}-qty`}
                          className="px-2 py-1 text-center"
                        >
                          Qty
                        </th>
                        <th
                          key={`${orderType}-rev`}
                          className="px-2 py-1 text-center"
                        >
                          Revenue
                        </th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(foods).map(([foodName, orderData]) => {
                    const totalQty = Object.values(orderData).reduce(
                      (sum, val) => sum + val.quantity,
                      0
                    );
                    const totalRev = Object.values(orderData).reduce(
                      (sum, val) => sum + val.total,
                      0
                    );
                    return (
                      <tr key={foodName} className="border-b border-yellow-700">
                        <td className="px-2 py-1">{foodName}</td>
                        {["Dine In", "Take Away", "GoFood", "GrabFood"].map(
                          (orderType) => (
                            <>
                              <td className="px-2 py-1 text-center">
                                {orderData[orderType]?.quantity || 0}
                              </td>
                              <td className="px-2 py-1 text-right">
                                {formatCurrency(
                                  orderData[orderType]?.total || 0
                                )}
                              </td>
                            </>
                          )
                        )}
                        <td className="px-2 py-1 text-center">{totalQty}</td>
                        <td className="px-2 py-1 text-right">
                          {formatCurrency(totalRev)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const isDate = type === "date";
  const inputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
    if (inputRef.current) {
      inputRef.current.showPicker?.(); // for modern browsers
      inputRef.current.focus(); // fallback for older ones
    }
  };

  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-gray-800 text-white border border-gray-600 rounded p-2 ${
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
