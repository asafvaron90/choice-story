export default function StoryReaderLoading() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="text-center space-y-6 animate-pulse">
        {/* Animated loading spinner */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 border-4 border-purple-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <div className="h-8 w-64 bg-purple-200 rounded mx-auto" />
          <div className="h-4 w-48 bg-purple-100 rounded mx-auto" />
        </div>

        {/* Book icon skeleton */}
        <div className="w-16 h-16 bg-purple-200 rounded-lg mx-auto" />
      </div>
    </div>
  );
}
