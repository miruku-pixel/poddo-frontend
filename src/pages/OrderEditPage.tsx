import { useState, useEffect } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form"; // Import FormProvider
import { useNavigate, useParams } from "react-router-dom";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { RawOrder, RawOrderItem, RawOption } from "../types/RawOrder";
import { Order } from "../types/Order";

// Import the new sub-component
import OrderItemFormFields from "../components/OrderItemFormFields";

// --- Form Type Definitions ---
// These types should ideally be in a shared types file (e.g., src/types/forms.ts)
// if they are used by other components/APIs.
export type OptionForm = {
  id?: string; // Optional: The ID of an existing OrderItemOption record
  optionName: string; // Use optionName instead of optionId
  quantity: number;
  unitPrice: number;
  status: "ACTIVE" | "CANCELED";
};

export type OrderItemForm = {
  id?: string; // Optional: The ID of an existing OrderItem record
  foodName?: string; // For display purposes in the UI, not sent to API for update
  quantity: number;
  status: "ACTIVE" | "CANCELED"; // Status of this specific order item
  options: OptionForm[]; // Array of selected options for this order item
};

export type OrderForm = {
  items: OrderItemForm[]; // The main array of order items for the form
};

export type OrderItemFormFieldsProps = {
  itemIdx: number;
  onRemoveItem: (idx: number) => void;
  onCancelItem: (idx: number) => void;
};

// --- Data Mapping Function ---
// This function transforms the raw API response into a more usable 'Order' type
// and prepares it for React Hook Form's defaultValues.
function mapOrderResponse(raw: RawOrder): Order {
  return {
    id: raw.id,
    orderNumber: raw.orderNumber,
    status: raw.status as Order["status"], // Cast to your Order type's status
    remark: raw.remark,
    tableNumber: raw.diningTable?.number?.toString(), // Safely access table number
    waiterName: raw.waiter?.username ?? "-",
    items: (raw.items || []).map((item: RawOrderItem) => ({
      id: item.id,
      foodName: item.food?.name ?? "Unknown", // Safely access food name
      foodCategoryName: item.food?.foodCategory?.name ?? "Other",
      foodCat: item.food?.foodCategory?.name ?? "Uncategorized", // Safely access food category
      quantity: item.quantity,
      unitPrice: item.unitPrice ?? 0,
      totalPrice: item.totalPrice ?? 0,
      status: item.status ?? "ACTIVE", // Default to ACTIVE if status is null/undefined
      options: (item.options || []).map((opt: RawOption) => ({
        id: opt.id, // This is the OrderItemOption ID
        name: opt.option?.name ?? "Unnamed Option", // Safely access option name
        quantity: opt.quantity,
        unitPrice: opt.unitPrice ?? 0,
        totalPrice: opt.totalPrice ?? 0,
        status: opt.status ?? "ACTIVE", // Default to ACTIVE if status is null/undefined
      })),
    })),
    waiterId: raw.waiterId || raw.waiter?.id || "",
    subtotal: raw.subtotal ?? 0,
    tax: raw.tax ?? 0,
    discount: raw.discount ?? 0,
    total: raw.total ?? 0,
    orderType: raw.orderType ?? { id: "", name: "Unknown" },
  };
}

// --- Main Component: OrderEditPage ---
export default function OrderEditPage() {
  const { orderId } = useParams(); // Get orderId from URL parameters
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null); // State to hold the fetched order data
  const [loading, setLoading] = useState(true); // Loading state for initial data fetch
  const [error, setError] = useState<string | null>(null); // Error state for initial data fetch
  const [apiError, setApiError] = useState<string | null>(null); // Error state for form submission

  // Initialize React Hook Form methods
  // We use 'methods' object to pass all form methods to FormProvider
  const methods = useForm<OrderForm>({
    defaultValues: { items: [] }, // Set initial default values for the form
  });

  // Destructure individual methods from 'methods' for use in this component
  const {
    control,
    handleSubmit,
    reset, // Function to reset the form with new default values
    setValue, // Function to programmatically set form field values
    formState: { isSubmitting }, // State indicating if the form is currently submitting
  } = methods;

  // useFieldArray for the main 'items' array in the form
  const { fields: itemFields, remove: removeItem } = useFieldArray({
    control,
    name: "items", // Name of the array field in the form
  });

  const handleCancelItem = (idx: number) => {
    setValue(`items.${idx}.status`, "CANCELED");

    const currentOptions: OptionForm[] =
      methods.watch(`items.${idx}.options`) || [];

    setValue(
      `items.${idx}.options`,
      currentOptions.map((opt: OptionForm) => ({
        ...opt,
        status: "CANCELED",
      }))
    );
  };

  // --- useEffect for Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null); // Clear previous errors
      try {
        const response = await fetchWithAuth(`/api/fetchOrder/${orderId}`);

        if (!response.ok) {
          // If response is not OK, try to parse error message from body
          let errorDetail = "Unknown error";
          try {
            const errorJson = await response.json();
            errorDetail =
              errorJson.error ||
              errorJson.message ||
              `HTTP status: ${response.status}`;
          } catch {
            // Fallback if response body is not JSON
            errorDetail =
              response.statusText || `HTTP status: ${response.status}`;
          }
          throw new Error(`Failed to fetch order: ${errorDetail}`);
        }

        const rawOrder: RawOrder = await response.json();
        const mappedOrder = mapOrderResponse(rawOrder);
        setOrder(mappedOrder);

        // Transform fetched data into the OrderForm structure for `reset`
        const transformed: OrderForm = {
          items: mappedOrder.items.map((item) => ({
            id: item.id,
            foodName: item.foodName,
            quantity: item.quantity,
            status: item.status ?? "ACTIVE", // Ensure status is never undefined
            options: item.options.map((opt) => ({
              id: opt.id, // OrderItemOption ID
              optionName: opt.name ?? "Unnamed Option", // <- Updated here
              quantity: opt.quantity,
              unitPrice: opt.unitPrice,
              status: opt.status ?? "ACTIVE", // Ensure status is never undefined
            })),
          })),
        };
        reset(transformed); // Reset the form with the fetched data
      } catch (err: unknown) {
        // Catch as unknown for type safety
        console.error("Error fetching order data:", err);
        let errorMessage = "Failed to fetch order data.";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }
        setError(errorMessage);
      } finally {
        setLoading(false); // End loading regardless of success or failure
      }
    };

    // Only fetch data if orderId is available (prevents fetching on initial render before params are ready)
    if (orderId) {
      fetchData();
    }
  }, [orderId, reset]); // Dependency array: re-run if orderId or reset function changes

  // --- Form Submission Handler ---
  const onSubmit = async (data: OrderForm) => {
    setApiError(null); // Clear previous API errors
    try {
      // Prepare payload for the API
      const payload = {
        items: data.items.map((item) => ({
          id: item.id, // Include existing OrderItem ID for updates/cancellations
          quantity: Number(item.quantity),
          status: item.status,
          options: item.options.map((opt) => ({
            id: opt.id, // Include existing OrderItemOption ID
            quantity: Number(opt.quantity),
            status: opt.status, // Send option status as well
          })),
        })),
      };

      const response = await fetchWithAuth(
        `/api/orders/${orderId}/items/batch-update`,
        {
          method: "PATCH", // Using PATCH for partial updates
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        // Handle non-OK responses
        let errorMessage = "Failed to update order.";
        try {
          const errorJson = await response.json();
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Redirect to status page instead of alert
      navigate("/status");
    } catch (err: unknown) {
      // Catch as unknown for type safety
      console.error("Error submitting form:", err);
      setApiError(
        err instanceof Error
          ? err.message
          : "Unknown error occurred during update."
      );
    }
  };

  // --- Render Loading, Error, and Not Found States ---
  if (loading) {
    return <p className="text-white text-lg p-4">Loading order details...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-lg p-4">Error: {error}</p>;
  }

  if (!order) {
    return <p className="text-white text-lg p-4">Order not found.</p>;
  }

  // --- Main Component Render ---
  return (
    // FormProvider makes 'methods' available to all child components within the form
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-3xl mx-auto p-6 bg-gray-900 border-green-400 border rounded-xl shadow-sm"
      >
        <h2 className="text-2xl font-semibold text-white mb-4">
          Edit Order No :{" "}
          <span className="font-bold text-yellow-300">{order.orderNumber}</span>
          ({order.orderType?.name})
        </h2>
        <p className="text-green-300 font-semibold">
          Table Number:{" "}
          <span className="text-green-300 font-semibold">
            {order.tableNumber ?? "-"}
          </span>{" "}
        </p>
        <p className="text-green-300 font-semibold">
          <span> {order.waiterName}</span>{" "}
        </p>

        {/* List of Order Items */}
        {itemFields.map((field, itemIdx) => (
          <div
            key={field.id}
            className=" p-4 rounded mb-4 shadow-sm bg-gray-900 border-green-400"
          >
            <OrderItemFormFields
              itemIdx={itemIdx}
              onCancelItem={handleCancelItem}
              onRemoveItem={(idx: number) => removeItem(idx)}
            />
          </div>
        ))}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className={`px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded flex items-center justify-center ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
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
              "Save Changes"
            )}
          </button>
        </div>

        {/* Error Message */}
        {apiError && (
          <p className="text-red-500 text-center mt-2">{apiError}</p>
        )}
      </form>
    </FormProvider>
  );
}
