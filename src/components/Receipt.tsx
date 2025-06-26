import { Order } from "../types/Order";
import { Billing } from "../types/Billing";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface ReceiptProps {
  order: Order; // Keep order for non-financial details like items, table, waiter
  billing: Billing; // Use billing for all final financial summary
}

// Helper for formatting Rupiah (assuming this is defined elsewhere or can be placed here)
const formatRupiah = (value: number | string) =>
  `Rp ${Number(value).toLocaleString("id-ID")}`;

const PHP_PRINTER_URL: string = "http://192.168.100.138:8000/print.php";

export default function Receipt({ order, billing }: ReceiptProps) {
  // Determine order type name for easier use in logic
  const orderTypeName = order.orderType?.name;
  const navigate = useNavigate();
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusMessageType, setStatusMessageType] = useState<
    "success" | "error"
  >("success");

  // Effect to clear the status message after a few seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 5000); // Message visible for 5 seconds
      return () => clearTimeout(timer); // Clean up the timer
    }
  }, [statusMessage]); // Rerun effect when statusMessage changes

  // Conditional visibility flags
  const isDineIn = orderTypeName === "Dine In";
  const isOnlineOrder =
    orderTypeName === "GrabFood" || orderTypeName === "GoFood";
  //const isTakeAway = orderTypeName === "Take Away";

  const showOnlineCode = isOnlineOrder;
  const showCustomerName = !isDineIn && order.customerName; // Show if NOT Dine In AND customerName exists
  const showTableNumber = isDineIn && order.tableNumber; // Show if Dine In AND tableNumber exists

  const formatReceiptForPrinter = (order: Order, billing: Billing): string => {
    let receiptText = "";

    receiptText += "--------------------------------\n";
    receiptText += "          RECEIPT\n";
    receiptText += "--------------------------------\n";
    receiptText += `Outlet: ${order.outletName}\n`;
    receiptText += `Cashier: ${billing.cashier.username}\n`;
    receiptText += `Receipt #: ${billing.receiptNumber}\n`;

    if (showOnlineCode && order.onlineCode) {
      receiptText += `Online Code: ${order.onlineCode}\n`;
    }
    if (showCustomerName) {
      receiptText += `Customer Name: ${order.customerName}\n`;
    }
    if (showTableNumber) {
      receiptText += `Table: ${order.tableNumber}\n`;
    }
    receiptText += `Paid At:     ${new Date(billing.paidAt).toLocaleString(
      "id-ID"
    )}\n`;

    receiptText += "--------------------------------\n";
    // Filter order items to only include those with quantity > 0
    order.items
      .filter((item) => item.quantity > 0)
      .forEach((item) => {
        receiptText += `${item.foodName}\n`;
        receiptText += `x${item.quantity}   ${formatRupiah(item.totalPrice)}\n`;
      });

    receiptText += "--------------------------------\n";
    receiptText += `Total:       ${formatRupiah(billing.total)}\n`;
    receiptText += "--------------------------------\n";
    receiptText += `Paid:        ${formatRupiah(billing.amountPaid)}\n`;
    receiptText += `Change:      ${formatRupiah(billing.changeGiven)}\n`;
    receiptText += `Payment Type: ${billing.paymentType}\n`;

    if (billing.remark) {
      receiptText += `Remark:      ${billing.remark}\n`;
    }
    receiptText += "--------------------------------\n";
    receiptText += "          THANK YOU!\n";
    receiptText += "--------------------------------\n\n\n"; // Add extra newlines for proper cut

    return receiptText;
  };

  const handlePrintFullReceipt = async () => {
    setIsPrinting(true); // Set loading state to true
    setStatusMessage(null); // Clear any existing message

    try {
      const printContent = formatReceiptForPrinter(order, billing);

      const response = await fetch(PHP_PRINTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: printContent }), // Send the formatted text
      });

      const data: { success?: boolean; error?: string; message?: string } =
        await response.json();

      if (response.ok) {
        setStatusMessage("Print Successful!");
        setStatusMessageType("success");
        console.log("Server response:", data);
      } else {
        setStatusMessage(
          `Print Failed: ${data.error || data.message || response.statusText}`
        );
        setStatusMessageType("error");
        console.error("Server error response:", data);
      }
    } catch (error) {
      console.error(
        "Error connecting to printer server for full receipt:",
        error
      );
      setStatusMessage(
        "Could not connect to printer server. Check connection!"
      );
      setStatusMessageType("error");
    } finally {
      setIsPrinting(false); // Reset loading state
    }
  };

  return (
    <div className="w-full min-h-screen bg-transparent flex justify-center items-center p-4">
      <div className="text-white max-w-lg w-full mx-auto p-6 bg-gray-800 rounded-xl border border-green-700 relative">
        {/* Status Message Display */}
        {statusMessage && (
          <div
            className={`absolute top-0 left-0 right-0 p-3 text-center rounded-t-xl transition-all duration-300 ease-in-out z-10
              ${
                statusMessageType === "success" ? "bg-green-600" : "bg-red-600"
              } text-white font-semibold`}
            role="status"
          >
            {statusMessage}
          </div>
        )}
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
          Outlet Name: <span className="font-mono">{order.outletName}</span>
        </div>
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
          {order.items.map(
            (item, idx) =>
              // Only render item if quantity is not 0
              item.quantity !== 0 && (
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
                      {item.options
                        .filter((opt) => opt.quantity !== 0)
                        .map(
                          (
                            opt,
                            i // Filter options by quantity
                          ) => (
                            <li key={i} className="flex justify-between">
                              <span>
                                - {opt.name} x{opt.quantity}
                              </span>
                              <span>{formatRupiah(opt.totalPrice)}</span>{" "}
                              {/* Option total price from order item option */}
                            </li>
                          )
                        )}
                    </ul>
                  )}
                </div>
              )
          )}
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
        <button
          onClick={handlePrintFullReceipt}
          disabled={isPrinting} // Disable button while printing
          className={`w-full py-2 rounded mt-4 text-white font-bold ${
            isPrinting
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isPrinting ? "Printing..." : "Print Receipt"}
        </button>
      </div>
    </div>
  );
}
