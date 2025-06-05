import { Order } from "../types/Order";
import { Billing } from "../types/Billing";
import { useNavigate } from "react-router-dom";

interface ReceiptProps {
  order: Order; // Keep order for non-financial details like items, table, waiter
  billing: Billing; // Use billing for all final financial summary
}

// Helper for formatting Rupiah (assuming this is defined elsewhere or can be placed here)
const formatRupiah = (value: number | string) =>
  `Rp ${Number(value).toLocaleString("id-ID")}`;

export default function Receipt({ order, billing }: ReceiptProps) {
  // Determine order type name for easier use in logic
  const orderTypeName = order.orderType?.name;

  const navigate = useNavigate();

  // Conditional visibility flags
  const isDineIn = orderTypeName === "Dine In";
  const isOnlineOrder =
    orderTypeName === "GrabFood" || orderTypeName === "GoFood";
  //const isTakeAway = orderTypeName === "Take Away";

  const showOnlineCode = isOnlineOrder;
  const showCustomerName = !isDineIn && order.customerName; // Show if NOT Dine In AND customerName exists
  const showTableNumber = isDineIn && order.tableNumber; // Show if Dine In AND tableNumber exists

  return (
    <div className="w-full min-h-screen bg-transparent flex justify-center items-center p-4">
      <div className="text-white max-w-lg w-full mx-auto p-6 bg-gray-800 rounded-xl border border-green-700 relative">
        {/* X Button */}
        <button
          type="button"
          className="absolute top-4 right-4 hover:text-green-500 text-4xl font-bold focus:outline-none"
          onClick={() => navigate("/status")}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4 text-green-300">Receipt</h2>
        <div className="mb-2">
          Receipt #: <span className="font-mono">{billing.receiptNumber}</span>
        </div>
        {/* Responsive grid for Order No, Online Code, Customer Name, Table */}
        <div className="font-mono grid grid-cols-1 md:grid-cols-2 gap-x-4 mb-2">
          {/* Always show Order No */}
          <div>Order No: {billing.orderNumber}</div>

          {/* Conditional Online Code */}
          {showOnlineCode && order.onlineCode && (
            <div>Online Code: {order.onlineCode}</div>
          )}

          {/* Conditional Customer Name */}
          {showCustomerName && <div>Customer Name: {order.customerName}</div>}

          {/* Conditional Table Number */}
          {showTableNumber && <div>Table: {order.tableNumber}</div>}
        </div>
        <div className="mb-2 font-mono"> {order.waiterName || "-"}</div>{" "}
        <div className="my-4 border-b border-green-700" />{" "}
        <h3 className="text-lg font-semibold mb-2">Items:</h3>
        <div className="mb-4">
          {order.items.map((item, idx) => (
            <div key={idx} className="mb-1">
              <div className="flex justify-between">
                <span>
                  {item.foodName} x{item.quantity}
                </span>
                <span>{formatRupiah(item.totalPrice)}</span>{" "}
                {/* Item total price from order item */}
              </div>
              {item.options.length > 0 && (
                <ul className="ml-4 text-sm text-gray-300">
                  {" "}
                  {/* Added text-gray-300 for options */}
                  {item.options.map((opt, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        - {opt.name} x{opt.quantity}
                      </span>
                      <span>{formatRupiah(opt.totalPrice)}</span>{" "}
                      {/* Option total price from order item option */}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <div className="my-4 border-b border-green-700" />{" "}
        {/* Increased margin for better spacing */}
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatRupiah(billing.subtotal)}</span>{" "}
            {/* ✅ From billing */}
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{formatRupiah(billing.tax)}</span> {/* ✅ From billing */}
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>{formatRupiah(billing.discount)}</span>{" "}
            {/* ✅ From billing */}
          </div>
          <div className="flex justify-between font-bold text-lg text-red-300">
            <span>Total:</span>
            <span>{formatRupiah(billing.total)}</span> {/* ✅ From billing */}
          </div>
        </div>
        <div className="my-4 border-b border-green-700" /> {/* Separator */}
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Paid:</span>
            <span>{formatRupiah(billing.amountPaid)}</span> {/* From billing */}
          </div>
          <div className="flex justify-between font-bold text-green-300">
            <span>Change:</span>
            <span>{formatRupiah(billing.changeGiven)}</span>{" "}
            {/* From billing */}
          </div>
          <div className="flex justify-between">
            <span>Payment Type:</span>
            <span>{billing.paymentType}</span> {/* From billing */}
          </div>
          <div className="flex justify-between">
            <span>Paid At:</span>
            <span>{new Date(billing.paidAt).toLocaleString()}</span>{" "}
            {/* Format date */}
          </div>
          {billing.remark && (
            <div className="flex justify-between">
              <span>Remark:</span>
              <span>{billing.remark}</span>
            </div>
          )}
        </div>
        <div className="mt-6 text-center font-bold text-green-300 text-xl">
          Thank you!
        </div>
      </div>
    </div>
  );
}
