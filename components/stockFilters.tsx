"use client";

import { Button } from "@/components/ui/button";

interface StockFiltersProps {
  sectors: string[];
  selectedSector: string;
  onSectorChange: (sector: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function StockFilters({
  sectors,
  selectedSector,
  onSectorChange,
  sortBy,
  onSortChange
}: StockFiltersProps) {
  const sortOptions = [
    { value: "marketCap", label: "Market Cap" },
    { value: "price", label: "Price" },
    { value: "change24h", label: "24h Change" },
    { value: "volume", label: "Volume" }
  ];

  return (
    <div className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sector Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sector
          </label>
          <div className="flex flex-wrap gap-2">
            {sectors.map((sector) => (
              <Button
                key={sector}
                size="sm"
                variant={selectedSector === sector ? "primary" : "outline"}
                onClick={() => onSectorChange(sector)}
                className="capitalize"
              >
                {sector === "all" ? "All Sectors" : sector}
              </Button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div className="lg:w-48">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort By
          </label>
          <div className="flex flex-wrap lg:flex-col gap-2">
            {sortOptions.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={sortBy === option.value ? "primary" : "outline"}
                onClick={() => onSortChange(option.value)}
                className="lg:w-full"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}