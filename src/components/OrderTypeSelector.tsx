import React from "react";

export interface OrderType {
  id: string;
  name: string;
}

interface OrderTypeSelectorProps {
  orderTypes: OrderType[];
  selectedOrderTypeId: string;
  onChange: (orderTypeId: string) => void;
  currentUserRole?: string | null;
}

const OrderTypeSelector: React.FC<OrderTypeSelectorProps> = ({
  orderTypes,
  selectedOrderTypeId,
  onChange,
  currentUserRole,
}) => {
  const isWaiter = currentUserRole === "WAITER";

  const availableOptions = orderTypes.filter((type) => {
    if (isWaiter) {
      // If the user is a Waiter, only allow "Dine In" and "Take Away"
      return type.name === "Dine In" || type.name === "Take Away";
    }
    // For other roles or if role is not defined, allow all order types
    return true;
  });

  React.useEffect(() => {
    if (
      selectedOrderTypeId &&
      !availableOptions.some((type) => type.id === selectedOrderTypeId)
    ) {
      onChange("");
    }
  }, [selectedOrderTypeId, availableOptions, onChange]); // Depend on availableOptions

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white mb-1">
        Order Type
      </label>
      <div className="p-[2px] rounded-lg bg-[linear-gradient(159deg,_rgba(62,180,137,1)_0%,_rgba(144,238,144,1)_100%)] w-fit">
        <select
          className="w-full px-3 py-2 rounded bg-gray-800 text-white"
          value={selectedOrderTypeId}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">-- Select Order Type --</option>
          {availableOptions.length === 0 ? (
            <option disabled>No order types available</option>
          ) : (
            availableOptions.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
};

export default OrderTypeSelector;
