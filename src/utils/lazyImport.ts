import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { isChunkLoadFailureMessage, scheduleChunkReloadRecovery } from "./chunkLoadRecovery";

function failureMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

/** React.lazy wrapper: on stale chunk 404, trigger recovery reload before the error surfaces. */
export function lazyImport<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(() =>
    importFn().catch((err: unknown) => {
      const msg = failureMessage(err);
      if (isChunkLoadFailureMessage(msg)) {
        void scheduleChunkReloadRecovery();
      }
      throw err;
    })
  );
}
