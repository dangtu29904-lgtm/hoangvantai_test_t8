export const SYNC_RETRY_BASE_DELAY_MS = 1000;
export const SYNC_RETRY_MAX_DELAY_MS = 8000;
export const SYNC_RETRY_MAX_ATTEMPTS = 5;

export const getSyncRetryDelayMs = (retryIndex) => (
  Math.min(
    SYNC_RETRY_BASE_DELAY_MS * 2 ** retryIndex,
    SYNC_RETRY_MAX_DELAY_MS
  )
);

export const isRetryableSyncError = (error) => {
  if (error?.code === 'ECONNABORTED') return true;

  const status = error?.response?.status;
  if (!status) return true;

  return status === 429 || status >= 500;
};
