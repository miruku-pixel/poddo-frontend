import React from "react";

export interface OrderType {
  id: string;
  name: string;
}

interface OrderTypeSelectorProps {
  orderTypes: OrderType[];
  selectedOrderTypeId: string;
  onChange: (orderTypeId: string) => void;
}

const OrderTypeSelector: React.FC<OrderTypeSelectorProps> = ({
  orderTypes,
  selectedOrderTypeId,
  onChange,
}) => {
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
          {orderTypes.length === 0 ? (
            <option disabled>No order types available</option>
          ) : (
            orderTypes.map((type) => (
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
