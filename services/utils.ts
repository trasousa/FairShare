/**
 * Generate a unique ID using crypto.randomUUID().
 */
export const generateId = (): string => crypto.randomUUID();

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
