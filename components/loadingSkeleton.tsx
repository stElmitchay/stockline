export function LoadingSkeleton() {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-700 rounded-xl"></div>
          <div>
            <div className="h-5 bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-16"></div>
          </div>
        </div>
        <div className="h-6 bg-gray-700 rounded w-16"></div>
      </div>

      {/* Price */}
      <div className="mb-4">
        <div className="h-8 bg-gray-700 rounded w-32 mb-2"></div>
        <div className="h-5 bg-gray-700 rounded w-20"></div>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-700 rounded w-20"></div>
          <div className="h-4 bg-gray-700 rounded w-16"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-4 bg-gray-700 rounded w-20"></div>
          <div className="h-4 bg-gray-700 rounded w-16"></div>
        </div>
      </div>

      {/* Address */}
      <div className="mb-4">
        <div className="h-3 bg-gray-700 rounded w-24 mb-2"></div>
        <div className="h-8 bg-gray-700 rounded"></div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <div className="h-8 bg-gray-700 rounded flex-1"></div>
        <div className="h-8 bg-gray-700 rounded w-12"></div>
      </div>
    </div>
  );
}