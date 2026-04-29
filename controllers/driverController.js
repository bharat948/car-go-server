const { getDriverById: getOneDriverById } = require('../lib/db');
const { applyDriverLocationUpdate } = require('../services/driverLocationService');

const updateDriverLocation = (req, res) => {
  try {
    const result = applyDriverLocationUpdate({
      actorUserId: req.userId,
      body: req.body,
      enforceFreshness: Boolean(req.body?.timestamp || req.body?.lastUpdated),
      eventTimestamp: req.body?.timestamp || req.body?.lastUpdated,
      requireEventTimestampForExistingRecord: true,
      requireActiveAssignment: true,
    });

    if (!result.ok) {
      return res.status(result.status).json({
        message: result.message,
        ...(result.code ? { code: result.code } : {}),
      });
    }

    return res.status(200).json(result.driver);
  } catch (error) {
    console.error('Error updating driver location:', error);
    return res.status(500).json({ message: 'An error occurred while updating driver location' });
  }
};

const getDriverById = (req, res) => {
  const { id } = req.params;
  const driver = getOneDriverById(id);

  if (!driver) {
    return res.status(404).json({ message: 'Driver not found' });
  }

  return res.status(200).json(driver);
};

module.exports = {
  updateDriverLocation,
  getDriverById,
};
