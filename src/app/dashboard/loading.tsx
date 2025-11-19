export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8 mt-16 max-w-6xl">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-8">
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Kids cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
        {Array(3).fill(0).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse"
          >
            <div className="p-5">
              <div className="flex flex-col items-center gap-4">
                {/* Avatar skeleton */}
                <div className="w-20 h-20 bg-gray-200 rounded-full flex-shrink-0" />

                {/* Name and age skeleton */}
                <div className="w-full">
                  <div className="h-5 bg-gray-200 w-28 mx-auto mb-2 rounded-full" />
                  <div className="h-4 bg-gray-100 w-20 mx-auto mb-4 rounded-full" />

                  {/* Action buttons skeleton */}
                  <div className="flex justify-center gap-3">
                    <div className="h-8 w-20 bg-gray-100 rounded-full" />
                    <div className="h-8 w-20 bg-gray-100 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Stories section skeleton */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="h-4 bg-gray-100 rounded-full mb-2" />
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-square bg-gray-100 rounded-md" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
