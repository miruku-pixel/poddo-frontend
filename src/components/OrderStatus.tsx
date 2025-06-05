import React, { useState, useCallback } from "react";
import { Order } from "../types/Order";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { useNavigate } from "react-router-dom";

interface Props {
  orders: Order[];
  currentUserId?: string | null; // Add currentUserId to props
  currentUserRole?: string | null;
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "PREPARED":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "SERVED":
      return "bg-green-100 text-green-800 border-green-300";
    case "CANCELED":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

const OrderStatus: React.FC<Props> = ({
  orders,
  currentUserId,
  currentUserRole,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [localOrderStatus, setLocalOrderStatus] = useState<{
    [orderId: string]: string;
  }>({});
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const handleStatusChange = useCallback(
    (orderId: string, newStatus: string) => {
      setLocalOrderStatus((prev) => ({
        ...prev,
        [orderId]: newStatus,
      }));
    },
    [setLocalOrderStatus]
  );

  const [confirmCancel, setConfirmCancel] = useState<{
    orderId: string;
    newStatus: string;
  } | null>(null);

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

        if (response.ok) {
          setLocalOrderStatus((prev) => ({
            ...prev,
            [orderId]: newStatus,
          }));
        } else {
          const errorData = await response.json();
          console.error("Failed to update order status:", errorData);
          alert(
            `Failed to update status for order ${orderId}: ${
              errorData?.error || "Unknown error"
            }`
          );
        }
      } catch (error) {
        console.error("Error updating order status:", error);
        alert(`Failed to update status for order ${orderId}`);
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [updatingOrderId]
  );

  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto mt-6 space-y-4">
      {orders.map((order) => {
        const isExpanded = expandedId === order.id;
        const currentStatus = localOrderStatus[order.id] || order.status;
        const isCashier = currentUserRole === "CASHIER";
        const isWaiter = currentUserRole === "WAITER";
        const isAdmin = currentUserRole === "ADMIN";
        const canWaiterUpdate = isWaiter && currentUserId === order.waiterId;
        const checkStatusUpdate =
          currentStatus === "PREPARED" || currentStatus === "SERVED";
        const canUpdate =
          isCashier || isAdmin || (canWaiterUpdate && checkStatusUpdate);

        // Determine visibility based on orderType.name
        const showCustomerName =
          order.orderType?.name === "Take Away" ||
          order.orderType?.name === "GrabFood" ||
          order.orderType?.name === "GoFood";

        const showOnlineCode =
          order.orderType?.name === "GrabFood" ||
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
                  <div className="flex flex-col">
                    {" "}
                    {/* This new div will stack its children vertically */}
                    <span className="font-medium text-white">
                      {order.orderType?.name?.toLowerCase() === "dine in"
                        ? `Table ${order.tableNumber} - ${order.waiterName}`
                        : `${order.orderType?.name} - ${order.waiterName}`}
                    </span>
                    <span className="font-medium text-yellow-300 text-sm">
                      {" "}
                      {/* Use a span and adjust text size if needed */}
                      Order No : {order.orderNumber}{" "}
                      {/* Assuming order.id for order number, or replace with actual orderNumber */}
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
                  {expandedId === order.id && canUpdate ? (
                    <div
                      className="relative inline-block text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className={`inline-flex justify-between w-40 px-3 py-1 text-sm font-medium border rounded ${getStatusBadgeClass(
                          currentStatus
                        )}`}
                        onClick={() =>
                          setOpenDropdownId(
                            openDropdownId === order.id ? null : order.id
                          )
                        }
                      >
                        {currentStatus}
                        <svg
                          className="w-4 h-4 ml-2"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.25 8.27a.75.75 0 01-.02-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      {openDropdownId === order.id && (
                        <div className="absolute z-10 mt-1 w-40 rounded-md bg-black shadow-lg border border-green-300">
                          {(() => {
                            let statusOptions: string[] = [];
                            if (
                              isWaiter &&
                              (currentStatus === "PREPARED" ||
                                currentStatus === "SERVED")
                            ) {
                              statusOptions = ["PREPARED", "SERVED"];
                            } else {
                              statusOptions = [
                                "PENDING",
                                "PREPARED",
                                "SERVED",
                                "CANCELED",
                              ];
                            }
                            return statusOptions.map((status) => (
                              <button
                                key={status}
                                onClick={() => {
                                  if (status === "CANCELED") {
                                    setConfirmCancel({
                                      orderId: order.id,
                                      newStatus: status,
                                    });
                                  } else {
                                    handleStatusChange(order.id, status);
                                    handleUpdateStatus(order.id, status);
                                  }
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm font-medium hover:bg-lime-900/30 ${getStatusBadgeClass(
                                  status
                                )}`}
                              >
                                {status}
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      className={`text-sm font-semibold px-2 py-1 border rounded ${getStatusBadgeClass(
                        currentStatus
                      )}`}
                    >
                      {currentStatus}
                    </span>
                  )}
                  {expandedId === order.id && (
                    <div className="flex space-x-2">
                      {canWaiterUpdate && (
                        <button
                          className="text-sm px-2 py-1 border rounded bg-violet-500 text-white hover:bg-violet-600 transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/additem/${order.id}`);
                          }}
                        >
                          ➕ Add Item
                        </button>
                      )}
                      {canWaiterUpdate && (
                        <button
                          className="text-sm px-2 py-1 border rounded bg-orange-500 text-white hover:bg-orange-600 transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/editorder/${order.id}`);
                          }}
                        >
                          Edit Item
                        </button>
                      )}
                      {currentUserRole === "CASHIER" &&
                        currentStatus === "SERVED" && (
                          <button
                            className="text-sm px-2 py-1 border rounded bg-pink-500 text-white hover:bg-pink-600 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/billing/${order.id}`);
                            }}
                          >
                            💳 Billing
                          </button>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-green-400 px-4 py-3">
                  <div className="space-y-2">
                    {/* Group items by foodCategoryName before rendering */}
                    {(() => {
                      // Create an object to hold items grouped by category
                      const groupedItems: Record<string, typeof order.items> =
                        {};

                      // Populate the groupedItems object
                      order.items.forEach((item) => {
                        const categoryName =
                          item.foodCategoryName || "Uncategorized"; // Use the mapped category name
                        if (!groupedItems[categoryName]) {
                          groupedItems[categoryName] = [];
                        }
                        groupedItems[categoryName].push(item);
                      });

                      // Convert the grouped object into an array of [categoryName, itemsArray] pairs
                      // Then, map over these entries to render each category and its items
                      return Object.entries(groupedItems).map(
                        ([category, itemsInCategory]) => (
                          <div key={category} className="mb-4">
                            {" "}
                            {/* Add margin-bottom for spacing between categories */}
                            <h4 className="text-lg font-bold text-green-300 mb-2 underline">
                              {category} {/* Display the category name */}
                            </h4>
                            <div className="space-y-2">
                              {/* Map over items within this specific category */}
                              {itemsInCategory.map((item, idx) => {
                                const isItemCanceled =
                                  item.status === "CANCELED";
                                return (
                                  <div key={item.id || idx}>
                                    {" "}
                                    {/* Use item.id as key for unique identification */}
                                    <p
                                      className={`font-semibold ${
                                        isItemCanceled
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
                                        className={`text-sm list-disc pl-5 ${
                                          isItemCanceled
                                            ? "text-red-400"
                                            : "text-white"
                                        }`}
                                      >
                                        {item.options.map((opt, i) => {
                                          const isOptCanceled =
                                            opt.status === "CANCELED";
                                          return (
                                            <li
                                              key={opt.id || i} // Use opt.id as key for unique identification
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

      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative bg-gray-800 border-2 border-green-400 rounded-xl w-full max-w-md p-6 text-center">
            <h2 className="text-lg font-bold text-red-400 mb-4">
              Confirm Cancellation
            </h2>
            <p className="text-white mb-6">
              Are you sure you want to cancel this order? <br />
              This action{" "}
              <span className="text-green-300 font-semibold">
                cannot be undone
              </span>
              .
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  handleStatusChange(
                    confirmCancel.orderId,
                    confirmCancel.newStatus
                  );
                  handleUpdateStatus(
                    confirmCancel.orderId,
                    confirmCancel.newStatus
                  );
                  setConfirmCancel(null);
                }}
                className="px-4 py-2 rounded bg-green-300 text-black font-bold hover:bg-green-400 transition"
              >
                Yes, Cancel It
              </button>
              <button
                onClick={() => setConfirmCancel(null)}
                className="px-4 py-2 rounded bg-gray-600 text-white font-bold hover:bg-gray-500 transition"
              >
                No, Go Back
              </button>
            </div>

            {/* Close Button in Top-Right */}
            <button
              className="absolute top-2 right-2 text-green-400 hover:text-white text-4xl p-2"
              onClick={() => setConfirmCancel(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderStatus;
