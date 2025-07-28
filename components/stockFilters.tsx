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
    <div className="space-y-4">
      {/* Sort Options */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-2">
          Sort By
        </label>
        <div className="flex flex-wrap gap-1.5">
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={sortBy === option.value ? "default" : "outline"}
              onClick={() => onSortChange(option.value as SortOption)}
              className={`text-xs px-2 py-1 h-7 ${
                sortBy === option.value 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 border-gray-600'
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Refresh Button */}
      {onRefresh && (
        <div className="pt-2 border-t border-gray-700/50">
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="text-xs px-3 py-1.5 h-8 text-blue-400 hover:text-blue-300 border-blue-500/50 hover:border-blue-400/50 bg-blue-600/10 hover:bg-blue-600/20"
          >
            Refresh Data
          </Button>
        </div>
      )}
    </div>
  );
}