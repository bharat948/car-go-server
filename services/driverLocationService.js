const { getDriverById, upsertDriverLocation, getPackages } = require('../lib/db');

const ACTIVE_PACKAGE_STATUSES = new Set(['accepted', 'in_transit']);

const hasActiveCourierAssignment = (courierId) => {
  const allPackages = getPackages();
  return allPackages.some((pkg) => {
    const packageStatus = (pkg.status || 'pending').toLowerCase();
    return pkg.acceptedBy === courierId && ACTIVE_PACKAGE_STATUSES.has(packageStatus);
  });
};

const normalizeIsOnlineValue = (rawValue) => {
  if (rawValue === true || rawValue === 'true' || rawValue === 1 || rawValue === '1') {
    return 1;
  }
  if (rawValue === false || rawValue === 'false' || rawValue === 0 || rawValue === '0') {
    return 0;
  }
  return null;
};

const toIsoTimestamp = (rawTimestamp) => {
  if (!rawTimestamp || typeof rawTimestamp !== 'string') {
    return null;
  }

  const parsed = new Date(rawTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const applyDriverLocationUpdate = ({
  actorUserId,
  body,
  enforceFreshness = false,
  eventTimestamp,
  requireEventTimestampForExistingRecord = false,
  requireActiveAssignment = false,
}) => {
  const { id: bodyId, lat, lng, isOnline } = body;
  const targetDriverId = actorUserId;

  if (bodyId && bodyId !== targetDriverId) {
    return { ok: false, status: 403, message: 'Forbidden: cannot update another driver identity' };
  }

  const numericLat = Number(lat);
  if (!Number.isFinite(numericLat) || numericLat < -90 || numericLat > 90) {
    return { ok: false, status: 400, message: 'lat must be between -90 and 90' };
  }

  const numericLng = Number(lng);
  if (!Number.isFinite(numericLng) || numericLng < -180 || numericLng > 180) {
    return { ok: false, status: 400, message: 'lng must be between -180 and 180' };
  }

  const hasIsOnline = Object.prototype.hasOwnProperty.call(body, 'isOnline');
  const existingDriver = getDriverById(targetDriverId);
  const normalizedInputIsOnline = hasIsOnline ? normalizeIsOnlineValue(isOnline) : null;

  if (hasIsOnline && normalizedInputIsOnline === null) {
    return { ok: false, status: 400, message: 'isOnline must be boolean' };
  }

  if (requireActiveAssignment && !hasActiveCourierAssignment(actorUserId)) {
    return {
      ok: false,
      status: 409,
      message: 'No active accepted/in_transit package for this courier',
      code: 'NO_ACTIVE_COURIER_ASSIGNMENT',
    };
  }

  const normalizedIsOnline = hasIsOnline
    ? normalizedInputIsOnline
    : (existingDriver ? existingDriver.isOnline : 0);

  const resolvedEventTimestamp = eventTimestamp ? toIsoTimestamp(eventTimestamp) : null;
  if (requireEventTimestampForExistingRecord && existingDriver && !resolvedEventTimestamp) {
    // Pragmatic cross-path consistency rule:
    // if a record already exists, callers must provide event time so we can reject stale writes.
    return {
      ok: false,
      status: 409,
      message: 'timestamp is required when updating an existing driver location',
      code: 'TIMESTAMP_REQUIRED_FOR_EXISTING_LOCATION',
    };
  }

  if (enforceFreshness && !resolvedEventTimestamp) {
    return { ok: false, status: 400, message: 'timestamp must be a valid ISO 8601 string' };
  }

  if (enforceFreshness && existingDriver && existingDriver.lastUpdated) {
    const previousTs = new Date(existingDriver.lastUpdated).getTime();
    const incomingTs = new Date(resolvedEventTimestamp).getTime();
    if (Number.isFinite(previousTs) && incomingTs <= previousTs) {
      return {
        ok: false,
        status: 409,
        message: 'stale location update rejected',
        code: 'STALE_LOCATION_UPDATE',
      };
    }
  }

  const canonicalTimestamp = enforceFreshness ? resolvedEventTimestamp : new Date().toISOString();

  const updatedDriver = upsertDriverLocation({
    id: targetDriverId,
    userId: actorUserId,
    lat: numericLat,
    lng: numericLng,
    isOnline: normalizedIsOnline,
    lastUpdated: canonicalTimestamp,
  });

  return { ok: true, status: 200, driver: updatedDriver };
};

module.exports = {
  applyDriverLocationUpdate,
};
