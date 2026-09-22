// @types/chrome (0.0.287) predates chrome.mimeHandler (Chrome 151+). Minimal
// ambient typings for the subset Subraya uses. See:
// https://developer.chrome.com/docs/extensions/reference/api/mimeHandler
declare namespace chrome.mimeHandler {
  interface StreamInfo {
    embedded: boolean;
    mimeType: string;
    originalUrl: string;
    responseHeaders: Record<string, string>;
    streamUrl: string;
    tabId: number;
  }

  interface MimeHandlerOptions {
    enabled?: boolean;
  }

  function getStreamInfo(): Promise<StreamInfo>;
  function abortAndFallbackToNativeHandler(): Promise<void>;
  function getMimeHandlerOptions(mimeType: string): Promise<MimeHandlerOptions>;
  function setMimeHandlerOptions(mimeType: string, options: MimeHandlerOptions): Promise<void>;
}
