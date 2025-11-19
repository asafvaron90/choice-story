export default function StoryLoading() {
  return (
    <div className="container mx-auto px-4 py-8 mt-16 max-w-6xl">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Story metadata skeleton */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6 animate-pulse">
        <div className="h-4 bg-gray-200 w-48 mb-3 rounded" />
        <div className="h-3 bg-gray-100 w-full mb-2 rounded" />
        <div className="h-3 bg-gray-100 w-3/4 rounded" />
      </div>

      {/* Story pages skeleton */}
      <div className="space-y-6">
        {Array(3).fill(0).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse"
          >
            <div className="p-6">
              {/* Page header */}
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 bg-gray-200 w-32 rounded" />
                <div className="h-8 w-24 bg-gray-100 rounded-full" />
              </div>

              {/* Page content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image skeleton */}
                <div className="aspect-video bg-gray-100 rounded-lg" />

                {/* Text skeleton */}
                <div className="space-y-3">
                  <div className="h-4 bg-gray-100 w-full rounded" />
                  <div className="h-4 bg-gray-100 w-full rounded" />
                  <div className="h-4 bg-gray-100 w-3/4 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
