/**
 * This script suppresses React warnings related to unsafe lifecycle methods
 * in the Swagger UI components, which we can't modify directly.
 */
if (typeof window !== 'undefined') {
  // Store the original console.error
  const originalConsoleError = console.error;

  // Override console.error to filter out specific React warnings
  console.error = function filterWarnings(...args) {
    // Check if this is a React warning about unsafe lifecycle methods
    if (args[0] && typeof args[0] === 'string') {
      if (
        args[0].includes('Warning: Using UNSAFE_componentWillReceiveProps') &&
        (args[0].includes('ModelCollapse') || args[0].includes('OperationContainer'))
      ) {
        // Don't log these specific warnings
        return;
      }
    }
    
    // Forward all other errors to the original console.error
    return originalConsoleError.apply(console, args);
  };
}

export {}; 