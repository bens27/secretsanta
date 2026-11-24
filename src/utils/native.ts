// Bridge to the macOS app (see macos/). When the web UI runs inside it, the
// Swift side registers a `secretSanta` message handler that answers each
// postMessage with a promise.

interface NativeHandler {
  postMessage(message: { type: string; [key: string]: unknown }): Promise<any>;
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: Record<string, NativeHandler | undefined>;
    };
  }
}

function handler(): NativeHandler | undefined {
  return window.webkit?.messageHandlers?.secretSanta;
}

export function isNativeApp(): boolean {
  return !!handler();
}

export function callNative<T = unknown>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
  const native = handler();
  if (!native)
    return Promise.reject(new Error('Not running in the Secret Santa app'));

  return native.postMessage({ type, ...payload });
}
