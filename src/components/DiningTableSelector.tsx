import React, { Dispatch, SetStateAction } from "react";
import { DiningTable } from "../types/DiningTable";

export interface DiningTableSelectorProps {
  tables: DiningTable[];
  selectedTableId: string;
  setSelectedTableId: Dispatch<SetStateAction<string>>; // add this line
}

const DiningTableSelector: React.FC<DiningTableSelectorProps> = ({
  tables,
  selectedTableId,
  setSelectedTableId,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white mb-1">
        Dining Table
      </label>
      <div className="p-[2px] rounded-lg bg-[linear-gradient(159deg,_rgba(62,180,137,1)_0%,_rgba(144,238,144,1)_100%)] w-fit">
        <select
          className="w-full px-3 py-2 rounded bg-gray-800 text-white"
          value={selectedTableId}
          onChange={(e) => setSelectedTableId(e.target.value)}
        >
          <option value="">-- Select Table --</option>
          {tables.length === 0 ? (
            <option disabled>No tables available</option>
          ) : (
            tables.map((table) => (
              <option key={table.id} value={table.id}>
                Table #{table.number}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
};

export default DiningTableSelector;
