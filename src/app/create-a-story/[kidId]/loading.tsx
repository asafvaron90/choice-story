export default function CreateStoryLoading() {
  return (
    <div className="container mx-auto px-4 py-8 mt-16 max-w-4xl">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 bg-gray-100 w-96 rounded animate-pulse" />
      </div>

      {/* Progress steps skeleton */}
      <div className="flex items-center justify-between mb-8">
        {Array(3).fill(0).map((_, index) => (
          <div key={index} className="flex items-center">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            {index < 2 && (
              <div className="h-1 w-24 bg-gray-100 mx-2 animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
        <div className="space-y-6">
          {/* Form field skeleton */}
          <div>
            <div className="h-5 bg-gray-200 w-48 mb-2 rounded" />
            <div className="h-32 bg-gray-100 w-full rounded" />
          </div>

          {/* Form field skeleton */}
          <div>
            <div className="h-5 bg-gray-200 w-48 mb-2 rounded" />
            <div className="h-10 bg-gray-100 w-full rounded" />
          </div>

          {/* Buttons skeleton */}
          <div className="flex justify-end gap-4">
            <div className="h-10 w-24 bg-gray-100 rounded-full" />
            <div className="h-10 w-32 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
