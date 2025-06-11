import { useRef, useState, useMemo } from "react";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { IoCalendarOutline } from "react-icons/io5";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

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
  // Add a property to store the total revenue for this food item for sorting
  totalFoodRevenue?: number;
}

interface FoodSalesByCategoryAndOrderType {
  [category: string]: FoodEntry[];
}

// Define SortDirection type
type SortDirection = "asc" | "desc" | null;

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

  // Sorting state for overall order type revenue
  const [orderTypeSortColumn, setOrderTypeSortColumn] = useState<string | null>(
    null
  );
  const [orderTypeSortDirection, setOrderTypeSortDirection] =
    useState<SortDirection>(null);

  // Sorting state for food sales tables
  const [foodSortColumn, setFoodSortColumn] = useState<string | null>(null); // 'foodName', 'total', or an orderType name
  const [foodSortDirection, setFoodSortDirection] =
    useState<SortDirection>(null);

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

      // Process food sales data to add totalFoodRevenue for sorting
      const processedFoodSales = data.foodSalesByCategoryAndOrderType
        ? Object.entries(data.foodSalesByCategoryAndOrderType).reduce(
            (acc, [categoryName, foodEntriesUntyped]) => {
              // Explicitly cast foodEntriesUntyped to FoodEntry[]
              const foodEntries = foodEntriesUntyped as FoodEntry[];
              acc[categoryName] = foodEntries.map((entry: FoodEntry) => {
                const totalRevenue = Object.values(entry.orderTypeSales).reduce(
                  (sum, detail) => sum + detail.revenue,
                  0
                );
                return { ...entry, totalFoodRevenue: totalRevenue };
              });
              return acc;
            },
            {} as FoodSalesByCategoryAndOrderType
          )
        : null;

      setFoodSalesByCategory(processedFoodSales);
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
    setOrderTypeSortColumn(null);
    setOrderTypeSortDirection(null);
    setFoodSortColumn(null);
    setFoodSortDirection(null);
  };

  const formatCurrency = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

  // --- Sorting functions ---

  // Sort function for overall order type revenue
  const handleOrderTypeSort = (column: string) => {
    if (orderTypeSortColumn === column) {
      setOrderTypeSortDirection((prev) =>
        prev === "asc" ? "desc" : prev === "desc" ? null : "asc"
      );
    } else {
      setOrderTypeSortColumn(column);
      setOrderTypeSortDirection("asc");
    }
  };

  const sortedSalesByOrderType = useMemo(() => {
    if (!salesByOrderType) return null;

    if (!orderTypeSortColumn) {
      return salesByOrderType;
    }

    return [...salesByOrderType].sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (orderTypeSortColumn === "orderType") {
        valA = a.orderType.toLowerCase();
        valB = b.orderType.toLowerCase();
      } else if (orderTypeSortColumn === "revenue") {
        valA = a.revenue;
        valB = b.revenue;
      }

      if (valA < valB) return orderTypeSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return orderTypeSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [salesByOrderType, orderTypeSortColumn, orderTypeSortDirection]);

  // Sort function for food sales tables
  const handleFoodSort = (column: string) => {
    if (foodSortColumn === column) {
      setFoodSortDirection((prev) =>
        prev === "asc" ? "desc" : prev === "desc" ? null : "asc"
      );
    } else {
      setFoodSortColumn(column);
      setFoodSortDirection("asc");
    }
  };

  // Helper function to get sort icon
  const getSortIcon = (
    column: string,
    currentSortColumn: string | null,
    currentSortDirection: SortDirection
  ) => {
    if (currentSortColumn === column) {
      if (currentSortDirection === "asc")
        return <FaSortUp className="inline ml-1" />;
      if (currentSortDirection === "desc")
        return <FaSortDown className="inline ml-1" />;
    }
    return <FaSort className="inline ml-1 text-black" />;
  };

  // Memoized sorted food sales data
  const sortedFoodSalesByCategory = useMemo(() => {
    if (!foodSalesByCategory) return null;

    const sortedData: FoodSalesByCategoryAndOrderType = {};
    for (const categoryName in foodSalesByCategory) {
      // Corrected line: Use Object.prototype.hasOwnProperty.call()
      if (
        Object.prototype.hasOwnProperty.call(foodSalesByCategory, categoryName)
      ) {
        const foodEntries = [...foodSalesByCategory[categoryName]]; // Create a shallow copy to sort

        if (foodSortColumn) {
          foodEntries.sort((a, b) => {
            let valA: number | string = 0;
            let valB: number | string = 0;

            if (foodSortColumn === "foodName") {
              valA = a.foodName.toLowerCase();
              valB = b.foodName.toLowerCase();
            } else if (foodSortColumn === "total") {
              // Sorting by total revenue for the food item
              valA = a.totalFoodRevenue || 0;
              valB = b.totalFoodRevenue || 0;
            } else {
              // Sorting by a specific order type's revenue
              valA = a.orderTypeSales[foodSortColumn]?.revenue || 0;
              valB = b.orderTypeSales[foodSortColumn]?.revenue || 0;
            }

            if (valA < valB) return foodSortDirection === "asc" ? -1 : 1;
            if (valA > valB) return foodSortDirection === "asc" ? 1 : -1;
            return 0;
          });
        }
        sortedData[categoryName] = foodEntries;
      }
    }
    return sortedData;
  }, [foodSalesByCategory, foodSortColumn, foodSortDirection]);

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

      {Array.isArray(sortedSalesByOrderType) && ( // Use sortedSalesByOrderType here
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Sales by Order Type</h2>
          <div className="overflow-x-auto w-80 rounded border border-green-400">
            <table className="w-full text-sm">
              <thead className="bg-green-500 text-black">
                <tr>
                  <th
                    className="px-4 py-2 text-left cursor-pointer"
                    onClick={() => handleOrderTypeSort("orderType")}
                  >
                    Order Type
                    {getSortIcon(
                      "orderType",
                      orderTypeSortColumn,
                      orderTypeSortDirection
                    )}
                  </th>
                  <th
                    className="px-4 py-2 text-right cursor-pointer"
                    onClick={() => handleOrderTypeSort("revenue")}
                  >
                    Total Revenue
                    {getSortIcon(
                      "revenue",
                      orderTypeSortColumn,
                      orderTypeSortDirection
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSalesByOrderType.map(
                  (
                    row // Map over sorted data
                  ) => (
                    <tr
                      key={row.orderType}
                      className="border-b border-green-700"
                    >
                      <td className="px-4 py-2">{row.orderType}</td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(Number(row.revenue))}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Food Sales by Category and Order Type Tables */}

      {sortedFoodSalesByCategory &&
        Object.keys(sortedFoodSalesByCategory).map(
          (
            categoryName // Use sortedFoodSalesByCategory
          ) => (
            <div key={categoryName} className="mt-6 category-container">
              <h2 className="category-heading text-xl font-bold mb-2 text-white">
                {categoryName}
              </h2>
              <div className="table-wrapper overflow-x-auto w-full rounded border border-green-400">
                <table className="food-sales-table min-w-full text-sm border-collapse">
                  <thead className="bg-gray-400 text-black">
                    <tr>
                      <th
                        rowSpan={2}
                        className="px-2 py-1 text-left align-bottom border-b border-r border-green-700 whitespace-nowrap cursor-pointer"
                        onClick={() => handleFoodSort("foodName")}
                      >
                        Item Menu
                        {getSortIcon(
                          "foodName",
                          foodSortColumn,
                          foodSortDirection
                        )}
                      </th>
                      {ALL_ORDER_TYPES.map((orderType) => (
                        <th
                          key={orderType}
                          colSpan={2}
                          className={`px-2 py-1 text-center border-b border-green-700 whitespace-nowrap cursor-pointer ${
                            ORDER_TYPE_COLORS[orderType]?.headerBg ||
                            ORDER_TYPE_COLORS["Default"].headerBg
                          }`}
                          onClick={() => handleFoodSort(orderType)} // Sort by this order type's revenue
                        >
                          {orderType}
                        </th>
                      ))}
                      <th
                        key="total-header"
                        colSpan={2}
                        className="px-2 py-1 text-center border-b border-green-700 whitespace-nowrap cursor-pointer"
                        onClick={() => handleFoodSort("total")} // Sort by total food revenue
                      >
                        Total
                        {getSortIcon(
                          "total",
                          foodSortColumn,
                          foodSortDirection
                        )}
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
                    {sortedFoodSalesByCategory[categoryName].map(
                      // Map over sorted data
                      (foodEntry, idx) => {
                        // Total quantity and revenue for the entire row (all order types for this food item)
                        const itemTotalQuantity = Object.values(
                          foodEntry.orderTypeSales
                        ).reduce((sum, detail) => sum + detail.quantity, 0);
                        const itemTotalRevenue =
                          foodEntry.totalFoodRevenue || 0; // Use the pre-calculated total

                        return (
                          <tr
                            key={foodEntry.foodName}
                            className={`border-b border-green-700 ${
                              idx % 2 === 0 ? "bg-gray-700" : "bg-gray-800"
                            }`}
                          >
                            <td className="px-2 py-1 whitespace-nowrap">
                              {foodEntry.foodName}
                            </td>
                            {ALL_ORDER_TYPES.map((orderType) => {
                              const salesDetail =
                                foodEntry.orderTypeSales[orderType];

                              return (
                                <>
                                  <td className="px-2 py-1 text-center">
                                    {salesDetail ? salesDetail.quantity : "-"}
                                  </td>
                                  <td className="px-2 py-1 text-right">
                                    {salesDetail
                                      ? formatCurrency(
                                          Number(salesDetail.revenue)
                                        )
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
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
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
