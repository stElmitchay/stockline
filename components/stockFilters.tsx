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
              variant={sortBy === option.value ? "primary" : "outline"}
              onClick={() => onSortChange(option.value as SortOption)}
              className={`text-xs px-2 py-1 h-7 ${
                sortBy === option.value 
                  ? 'text-black' 
                  : 'text-gray-300 border-gray-600 hover:bg-gray-700'
              }`}
              style={{
                backgroundColor: sortBy === option.value ? '#D9FF66' : '#1A1A1A'
              }}
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
            className="text-xs px-3 py-1.5 h-8 text-gray-300 hover:text-white"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #D9FF66',
              color: '#D9FF66'
            }}
          >
            Refresh Data
          </Button>
        </div>
      )}
    </div>
  );
}