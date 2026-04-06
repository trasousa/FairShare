/**
 * Generate a unique ID. Uses crypto.randomUUID() when available (HTTPS),
 * falls back to a Math.random-based UUID v4 for HTTP / older browsers.
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

/**
 * Safely check if entry's tripId contains a given trip ID.
 * Handles both legacy string and current array formats.
 */
export const entryHasTrip = (tripId: string[] | string | undefined, targetTripId: string): boolean => {
    if (Array.isArray(tripId)) return tripId.includes(targetTripId);
    if (typeof tripId === 'string' && tripId) return tripId === targetTripId;
    return false;
};

/**
 * Check if entry has no trip assigned (handles both string and array formats).
 */
export const entryHasNoTrip = (tripId: string[] | string | undefined): boolean => {
    if (!tripId) return true;
    if (Array.isArray(tripId)) return tripId.length === 0;
    if (typeof tripId === 'string') return tripId === '';
    return true;
};

/**
 * Normalize tripId to always be an array.
 */
export const normalizeTripId = (tripId: string[] | string | undefined): string[] => {
    if (Array.isArray(tripId)) return tripId;
    if (typeof tripId === 'string' && tripId) return [tripId];
    return [];
};
