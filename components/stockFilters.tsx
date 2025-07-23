"use client";

import { Button } from "@/components/ui/button";

import { SortOption } from "@/types/stock";

interface StockFiltersProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onRefresh?: () => void;
}

import { SORT_OPTIONS } from "@/constants";

export function StockFilters({
  sortBy,
  onSortChange,
  onRefresh
}: StockFiltersProps) {
  const sortOptions = SORT_OPTIONS;

  return (
    <div className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start">
        {/* Sort Options */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort By
          </label>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={sortBy === option.value ? "primary" : "outline"}
                onClick={() => onSortChange(option.value as SortOption)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Refresh Button */}
        {onRefresh && (
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              className="text-blue-400 hover:text-blue-300 border-blue-500 hover:border-blue-400"
            >
              Refresh Data
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}