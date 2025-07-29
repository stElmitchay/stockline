export function LoadingSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 animate-pulse"
         style={{
           background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
           backdropFilter: 'blur(10px)',
           border: '1px solid rgba(255, 255, 255, 0.1)',
           boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
         }}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 opacity-50"></div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-600/50 rounded-xl shadow-lg"></div>
            <div>
              <div className="h-5 bg-gray-600/50 rounded w-24 mb-2"></div>
              <div className="h-4 bg-gray-600/50 rounded w-16"></div>
            </div>
          </div>
          <div className="h-6 bg-gray-600/50 rounded w-16"></div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="h-8 bg-gray-600/50 rounded w-32 mb-2"></div>
          <div className="h-5 bg-gray-600/50 rounded w-20"></div>
        </div>

        {/* Stats */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-600/50 rounded w-20"></div>
            <div className="h-4 bg-gray-600/50 rounded w-16"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-4 bg-gray-600/50 rounded w-20"></div>
            <div className="h-4 bg-gray-600/50 rounded w-16"></div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <div className="h-8 bg-gray-600/50 rounded"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-600/50 rounded flex-1"></div>
            <div className="h-8 bg-gray-600/50 rounded w-12"></div>
          </div>
        </div>
      </div>
    </div>
  );
}