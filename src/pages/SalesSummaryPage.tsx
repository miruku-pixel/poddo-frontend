import { useRef, useState } from "react";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { IoCalendarOutline } from "react-icons/io5";

type Props = {
  outletId: string;
};

interface SalesSummary {
  totalTransactions: number;
  totalRevenue: number;
  totalDiscount: number;
}

interface RevenueByOrderType {
  // Renamed for consistency
  orderType: string;
  revenue: number;
}

// New interfaces for the structured food sales data
interface OrderTypeSalesDetail {
  quantity: number;
  revenue: number;
}

interface FoodEntry {
  foodName: string;
  orderTypeSales: {
    [orderType: string]: OrderTypeSalesDetail;
  };
}

interface FoodSalesByCategoryAndOrderType {
  [category: string]: FoodEntry[];
}

const ALL_ORDER_TYPES = [
  "Dine In",
  "Take Away",
  "GoFood",
  "GrabFood",
  "ShopeeFood",
  "Kasbon",
];

const ORDER_TYPE_COLORS: {
  [key: string]: {
    headerBg: string;
    rowBgEven: string;
    rowBgOdd: string;
    text: string;
  };
} = {
  "Dine In": {
    headerBg: "bg-pink-300",
    rowBgEven: "bg-pink-900",
    rowBgOdd: "bg-pink-800",
    text: "text-teal-200",
  },
  "Take Away": {
    headerBg: "bg-blue-300",
    rowBgEven: "bg-blue-900",
    rowBgOdd: "bg-blue-800",
    text: "text-blue-200",
  },
  GoFood: {
    headerBg: "bg-green-700",
    rowBgEven: "bg-green-900",
    rowBgOdd: "bg-green-800",
    text: "text-green-200",
  },
  GrabFood: {
    headerBg: "bg-green-500",
    rowBgEven: "bg-purple-900",
    rowBgOdd: "bg-purple-800",
    text: "text-purple-200",
  },
  ShopeeFood: {
    headerBg: "bg-orange-600",
    rowBgEven: "bg-orange-900",
    rowBgOdd: "bg-orange-800",
    text: "text-orange-200",
  },
  Kasbon: {
    headerBg: "bg-purple-300",
    rowBgEven: "bg-red-900",
    rowBgOdd: "bg-red-800",
    text: "text-red-200",
  },
  Default: {
    headerBg: "bg-gray-400",
    rowBgEven: "bg-gray-900",
    rowBgOdd: "bg-gray-800",
    text: "text-gray-200",
  },
};

export default function SalesSummaryPage({ outletId }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [salesByOrderType, setSalesByOrderType] = useState<
    RevenueByOrderType[] | null
  >(null); // Changed to array type
  const [foodSalesByCategory, setFoodSalesByCategory] =
    useState<FoodSalesByCategoryAndOrderType | null>(null); // New state for categorized food sales
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
      setSalesByOrderType(data.revenueByOrderType);
      setSummary(data.summary);
      // Set the new categorized food sales data
      setFoodSalesByCategory(data.foodSalesByCategoryAndOrderType || null);
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
    setSummary(null);
    setSalesByOrderType(null);
    setFoodSalesByCategory(null); // Reset the new state as well
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
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card label="Total Transactions" value={summary.totalTransactions} />
          <Card
            label="Total Revenue"
            value={formatCurrency(summary.totalRevenue)}
          />
          <Card
            label="Total Discount"
            value={formatCurrency(summary.totalDiscount)}
          />
        </div>
      )}

      {Array.isArray(salesByOrderType) && (
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
                {salesByOrderType.map((row) => (
                  <tr key={row.orderType} className="border-b border-green-700">
                    <td className="px-4 py-2">{row.orderType}</td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(Number(row.revenue))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {foodSalesByCategory &&
        Object.keys(foodSalesByCategory).map((categoryName) => (
          <div key={categoryName} className="mt-6 category-container">
            <h2 className="category-heading text-xl font-bold mb-2 text-green-400">
              {categoryName}
            </h2>
            <div className="table-wrapper overflow-x-auto w-full rounded border border-green-400">
              <table className="food-sales-table min-w-full text-sm border-collapse">
                <thead className="bg-gray-500 text-white">
                  <tr>
                    <th
                      rowSpan={2}
                      className="px-2 py-1 text-left align-bottom border-b border-r border-green-700 whitespace-nowrap"
                    >
                      Item Menu
                    </th>
                    {ALL_ORDER_TYPES.map((orderType) => (
                      <th
                        key={orderType}
                        colSpan={2}
                        className={`px-2 py-1 text-center border-b border-green-700 whitespace-nowrap ${
                          ORDER_TYPE_COLORS[orderType]?.headerBg ||
                          ORDER_TYPE_COLORS["Default"].headerBg
                        }`}
                      >
                        {orderType}
                      </th>
                    ))}
                    <th
                      key="total-header"
                      colSpan={2}
                      className="px-2 py-1 text-center border-b border-green-700 whitespace-nowrap"
                    >
                      Total
                    </th>
                  </tr>
                  <tr>
                    {ALL_ORDER_TYPES.flatMap((orderType) => [
                      <th
                        key={`${orderType}-qty`}
                        className={`px-2 py-1 text-center border-t border-r border-green-700 whitespace-nowrap ${
                          ORDER_TYPE_COLORS[orderType]?.headerBg ||
                          ORDER_TYPE_COLORS["Default"].headerBg
                        }`}
                      >
                        Qty
                      </th>,
                      <th
                        key={`${orderType}-rev`}
                        className={`px-2 py-1 text-center border-t border-green-700 whitespace-nowrap ${
                          ORDER_TYPE_COLORS[orderType]?.headerBg ||
                          ORDER_TYPE_COLORS["Default"].headerBg
                        }`}
                      >
                        Revenue
                      </th>,
                    ])}
                    <th
                      key="total-qty"
                      className="px-2 py-1 text-center border-t border-r border-green-700 whitespace-nowrap"
                    >
                      Qty
                    </th>
                    <th
                      key="total-revenue"
                      className="px-2 py-1 text-right border-t border-green-700 whitespace-nowrap"
                    >
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {foodSalesByCategory[categoryName].map((foodEntry, idx) => {
                    let itemTotalQuantity = 0;
                    let itemTotalRevenue = 0;

                    return (
                      <tr
                        key={foodEntry.foodName}
                        className={`border-b border-green-700 ${
                          idx % 2 === 0 ? "bg-gray-700" : "bg-gray-800"
                        }`} // Alternating rows
                      >
                        <td className="px-2 py-1 whitespace-nowrap">
                          {foodEntry.foodName}
                        </td>
                        {ALL_ORDER_TYPES.map((orderType) => {
                          const salesDetail =
                            foodEntry.orderTypeSales[orderType];
                          const quantity = salesDetail
                            ? salesDetail.quantity
                            : 0;
                          const revenue = salesDetail ? salesDetail.revenue : 0;

                          // Accumulate totals for this food item
                          itemTotalQuantity += quantity;
                          itemTotalRevenue += revenue;

                          return (
                            <>
                              <td className="px-2 py-1 text-center">
                                {salesDetail ? salesDetail.quantity : "-"}
                              </td>
                              <td className="px-2 py-1 text-right">
                                {salesDetail
                                  ? formatCurrency(Number(salesDetail.revenue))
                                  : "-"}
                              </td>
                            </>
                          );
                        })}
                        {/* Total column for the row */}
                        <td className="px-2 py-1 text-center font-bold">
                          {itemTotalQuantity}
                        </td>
                        <td className="px-2 py-1 text-right font-bold">
                          {formatCurrency(itemTotalRevenue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      {foodSalesByCategory && Object.keys(foodSalesByCategory).length === 0 && (
        <p className="text-white text-center p-4">
          No food sales data available for the selected dates.
        </p>
      )}
      {!foodSalesByCategory && !loading && (
        <p className="text-white text-center p-4">
          Select a date range and click submit to view food sales report.
        </p>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-800 border border-green-500 rounded p-4">
      <p className="text-sm text-gray-300">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
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
