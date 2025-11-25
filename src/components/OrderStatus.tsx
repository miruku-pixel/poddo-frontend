import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Order } from "../types/Order";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import {
  FaUtensils,
  FaShoppingBag,
  FaCircle,
  FaUsers,
  FaCrown,
  FaCreditCard,
} from "react-icons/fa";
import { SiShopee, SiGojek, SiGrab } from "react-icons/si";

interface Props {
  orders: Order[];
  currentUserId?: string | null;
  currentUserRole?: string | null;
  onStatusUpdateSuccess: () => void;
}

const PHP_PRINTER_URL: string = "http://localhost:8000/print.php";

const getOrderTypeIcon = (orderTypeName: string | undefined | null) => {
  const iconProps = {
    className: "w-8 h-8 mr-2",
  };

  switch (orderTypeName) {
    case "Dine In":
      return (
        <FaUtensils {...iconProps} className="text-pink-300 w-8 h-8 mr-2" />
      );
    case "GoFood":
      return <SiGojek {...iconProps} className="text-green-700 w-8 h-8 mr-2" />;
    case "GrabFood":
      return <SiGrab {...iconProps} className="text-green-500 w-8 h-8 mr-2" />;
    case "ShopeeFood":
      return (
        <SiShopee {...iconProps} className="text-orange-600 w-8 h-8 mr-2" />
      );
    case "Take Away":
      return (
        <FaShoppingBag {...iconProps} className="text-blue-300 w-8 h-8 mr-2" />
      );
    case "Staff":
      return <FaUsers {...iconProps} className="text-red-300 w-8 h-8 mr-2" />; //
    case "Boss":
      return (
        <FaCrown {...iconProps} className="text-yellow-300 w-8 h-8 mr-2" />
      );
    case "Kasbon":
      return (
        <FaCreditCard {...iconProps} className="text-purple-300 w-8 h-8 mr-2" />
      );

    default:
      return <FaCircle {...iconProps} />;
  }
};

const OrderStatus: React.FC<Props> = ({ orders, onStatusUpdateSuccess }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleUpdateStatus = useCallback(
    async (orderId: string, newStatus: string) => {
      if (updatingOrderId === orderId) {
        return;
      }
      setUpdatingOrderId(orderId);

      try {
        const response = await fetchWithAuth("/api/UpdateStatus", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, status: newStatus }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to update order status:", errorData);
          alert(
            `Failed to update status for order ${orderId}: ${errorData?.error || "Unknown error"
            }`
          );
        } else {
          onStatusUpdateSuccess();
        }
      } catch (error) {
        console.error("Error updating order status:", error);
        alert(`Failed to update status for order ${orderId}`);
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [onStatusUpdateSuccess, updatingOrderId]
  );

  const formatKitchenReceipt = (order: Order): string => {
    const now = new Date();
    const printedAt = now.toLocaleString("id-ID");
    let text = "";

    text += "------------------------------\n";
    text += "       ORDER TO KITCHEN\n";
    text += "------------------------------\n";
    text += `${printedAt}\n`;
    text += `Order No: ${order.orderNumber}\n`;
    text += `Waiter: ${order.waiterName || "-"}\n`;
    text += `Order Type: ${order.orderType?.name || "-"}\n`;

    if (order.orderType?.name === "Dine In" && order.tableNumber) {
      text += `Table: ${order.tableNumber}\n`;
    }

    if (
      (order.orderType?.name === "GoFood" ||
        order.orderType?.name === "ShopeeFood" ||
        order.orderType?.name === "GrabFood") &&
      order.onlineCode
    ) {
      text += `Online Code: ${order.onlineCode}\n`;
    }

    if (
      order.orderType?.name !== "Dine In" &&
      order.customerName &&
      order.customerName.trim() !== ""
    ) {
      text += `Customer: ${order.customerName}\n`;
    }

    if (order.remark) {
      text += `Remark: ${order.remark}\n`;
    }
    text += "------------------------------\n";

    // Group by category
    const groupedItems: Record<string, typeof order.items> = {};
    order.items.forEach((item) => {
      const categoryName = item.foodCategoryName || "Uncategorized";
      if (!groupedItems[categoryName]) {
        groupedItems[categoryName] = [];
      }
      groupedItems[categoryName].push(item);
    });

    Object.entries(groupedItems).forEach(([category, items]) => {
      text += `\n# ${category.toUpperCase()}\n`;
      items.forEach((item) => {
        const itemText = `${item.foodName} x${item.quantity}`;
        const isCanceled = item.status === "CANCELED";
        text += isCanceled ? `X (CANCELED) ${itemText}\n` : `[] ${itemText}\n`;

        item.options.forEach((opt) => {
          const optText = `> ${opt.name} x${opt.quantity}`;
          const isOptCanceled = opt.status === "CANCELED";
          text += isOptCanceled ? `(CANCELED) ${optText}\n` : `  ${optText}\n`;
        });
      });
    });

    text += "\n------------------------------\n";
    text += "  Please prepare this order\n";
    text += "------------------------------\n\n\n";

    return text;
  };

  const handlePrintKitchenOrder = async (order: Order) => {
    try {
      const printContent = formatKitchenReceipt(order);

      const res = await fetch(PHP_PRINTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: printContent, type: "kitchen" }),
      });

      const data = await res.json();
      if (!data.success) {
        alert("❌ Print failed: " + (data.error || "Unknown error"));
      } else {
        alert("✅ Sent to kitchen printer.");
      }
    } catch (err) {
      console.error("Kitchen print error:", err);
      alert("❌ Could not reach printer server.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-6 space-y-4">
      {orders.map((order) => {
        const isExpanded = expandedId === order.id;

        const showCustomerName =
          order.orderType?.name === "Take Away" ||
          order.orderType?.name === "GrabFood" ||
          order.orderType?.name === "ShopeeFood" ||
          order.orderType?.name === "GoFood";

        const showOnlineCode =
          order.orderType?.name === "GrabFood" ||
          order.orderType?.name === "ShopeeFood" ||
          order.orderType?.name === "GoFood";

        return (
          <div
            key={order.id}
            className="p-[2px] rounded-xl bg-[linear-gradient(159deg,_rgba(62,180,137,1)_0%,_rgba(144,238,144,1)_100%)] shadow"
          >
            <div className="rounded-xl w-full bg-gray-800">
              {/* Summary Row */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <div className="flex items-center space-x-2">
                  {" "}
                  {/* This div is for the plus/minus button and the first line of text */}
                  <button
                    className="text-2xl font-bold transform transition duration-300 text-green-300"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    {isExpanded ? "-" : "+"}
                  </button>
                  <div>{getOrderTypeIcon(order.orderType?.name)}</div>
                  <div className="flex flex-col">
                    {" "}
                    {/* This new div will stack its children vertically */}
                    <span className="font-medium text-red-300 text-xl">
                      {" "}
                      Order No : {order.orderNumber}{" "}
                    </span>
                    <span className="font-medium text-white">
                      {order.orderType?.name?.toLowerCase() === "dine in"
                        ? `Table ${order.tableNumber || "N/A"} - ${order.waiterName || "N/A"
                        }`
                        : `${order.orderType?.name || "N/A"} - ${order.waiterName || "N/A"
                        }`}
                    </span>
                    {/* Conditional rendering for Customer Name */}
                    {showCustomerName && order.customerName && (
                      <span className="font-medium text-yellow-300 text-sm">
                        Customer Name: {order.customerName}
                      </span>
                    )}
                    {/* Conditional rendering for Online Code */}
                    {showOnlineCode && order.onlineCode && (
                      <span className="font-medium text-yellow-300 text-sm">
                        Online Code: {order.onlineCode}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {
                    ["dine in", "take away"].includes(
                      order.orderType?.name?.toLowerCase() || ""
                    ) && (
                      <button
                        className="text-l px-2 py-1 border rounded bg-[#134686] text-white hover:bg-[#134686]/20 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/billing/${order.id}`);
                        }}
                      >
                        Edit Payment
                      </button>
                    )
                  }
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-green-400 px-4 py-3">
                  <div className="flex space-x-2 mb-4 border-b border-green-400 pb-3">
                    <button
                      className="text-sm px-2 py-1 border rounded bg-green-500 text-white hover:bg-green-600 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintKitchenOrder(order);
                      }}
                    >
                      🖨️ Print to Kitchen
                    </button>
                    <button
                      type="button"
                      className={
                        "text-sm px-2 py-1 border rounded bg-red-500 text-white hover:bg-blue-300 transition"
                      }
                      onClick={() => {
                        handleUpdateStatus(order.id, "COMPLETED");
                      }}
                      disabled={updatingOrderId === order.id}
                    >
                      {updatingOrderId === order.id ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                          Processing...
                        </>
                      ) : (
                        "Completed"
                      )}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const groupedItems: Record<string, typeof order.items> =
                        {};

                      order.items.forEach((item) => {
                        const categoryName =
                          item.foodCategoryName || "Uncategorized";
                        if (!groupedItems[categoryName]) {
                          groupedItems[categoryName] = [];
                        }
                        groupedItems[categoryName].push(item);
                      });

                      return Object.entries(groupedItems).map(
                        ([category, itemsInCategory]) => (
                          <div key={category} className="mb-4">
                            {" "}
                            <h4 className="text-lg font-bold text-green-300 mb-2 underline">
                              {category}
                            </h4>
                            <div className="space-y-2">
                              {itemsInCategory.map((item, idx) => {
                                const isItemCanceled =
                                  item.status === "CANCELED";
                                return (
                                  <div key={item.id || idx}>
                                    {" "}
                                    <p
                                      className={`font-semibold ${isItemCanceled
                                        ? "text-red-400"
                                        : "text-white"
                                        }`}
                                    >
                                      {item.foodName}{" "}
                                      {isItemCanceled
                                        ? "(CANCELED)"
                                        : `(x${item.quantity})`}
                                    </p>
                                    {item.options.length > 0 && (
                                      <ul
                                        className={`text-sm list-disc pl-5 ${isItemCanceled
                                          ? "text-red-400"
                                          : "text-white"
                                          }`}
                                      >
                                        {item.options.map((opt, i) => {
                                          const isOptCanceled =
                                            opt.status === "CANCELED";
                                          return (
                                            <li
                                              key={opt.id || i}
                                              className={
                                                isOptCanceled
                                                  ? "text-red-400"
                                                  : ""
                                              }
                                            >
                                              {opt.name}{" "}
                                              {isOptCanceled
                                                ? "(CANCELED)"
                                                : `(x${opt.quantity})`}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )
                      );
                    })()}
                  </div>
                  {order.remark && (
                    <div className="mt-3 text-sm text-green-200">
                      <span className="font-medium">Remark:</span>{" "}
                      {order.remark}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderStatus;
