import { ConvexError } from "convex/values";

// Convex redacts plain (non-ConvexError) thrown errors on the client down to
// a generic "Server Error" in production, hiding the real cause. Re-throw
// anything unexpected as a ConvexError so the actual message reaches the
// client instead of being silently swallowed.
export function withSurfacedErrors<Args extends any[], Ret>(
  fn: (...args: Args) => Promise<Ret>
): (...args: Args) => Promise<Ret> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err: any) {
      if (err instanceof ConvexError) throw err;
      throw new ConvexError(`${err?.name || "Error"}: ${err?.message || String(err)}`);
    }
  };
}
