const {
    getPackages: getAllPackages,
    getPackageById: getOnePackageById,
    savePackage,
    updatePackage,
    deletePackage: deleteOnePackage,
} = require('../lib/db');
const { v4: uuidv4 } = require('uuid');

async function getCoordinates(location) {
    const apiKey = process.env.OPENCAGE_API_KEY;
    if (!apiKey) throw new Error('OPENCAGE_API_KEY is not set in .env');
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(location)}&key=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OpenCage API returned HTTP ${response.status} — check if your API key is valid`);
        }
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].geometry;
        } else {
            throw new Error(`OpenCage returned no results for "${location}"`);
        }
    } catch (error) {
        console.error('Error in getCoordinates:', error.message);
        throw error;
    }
}

// GET /api/packages — list all packages
const getPackages = (req, res) => {
    const packages = getAllPackages();
    res.status(200).json(packages);
};

// GET /api/packages/:id — fetch one package
const getPackageById = (req, res) => {
    const { id } = req.params;
    const pkg = getOnePackageById(id);
    if (!pkg) {
        return res.status(404).json({ message: 'Package not found' });
    }
    return res.status(200).json(pkg);
};

// POST /api/packages — create a new package
const addPackage = async (req, res) => {
    try {
        let picklat = null;
        let picklng = null;
        let destlat = null;
        let destlng = null;

        if (req.body.pickupLocation) {
            const coords = await getCoordinates(req.body.pickupLocation);
            picklat = coords.lat;
            picklng = coords.lng;
        }
        if (req.body.destination) {
            const coords = await getCoordinates(req.body.destination);
            destlat = coords.lat;
            destlng = coords.lng;
        }

        const newPackage = {
            id: uuidv4(),
            userId: req.userId,
            userName: req.body.userName,
            pickupLocation: req.body.pickupLocation,
            destination: req.body.destination,
            estimatedDeliveryTime: req.body.estimatedDeliveryTime,
            estimatedPrice: req.body.estimatedPrice,
            deliverTo: req.body.deliverTo,
            createdOn: new Date().toISOString(),
            picklat,
            picklng,
            destlat,
            destlng,
            status: 'pending',
        };

        savePackage(newPackage);
        res.status(201).json(newPackage);
    } catch (error) {
        console.error('Error adding package:', error);
        res.status(500).json({ message: 'An error occurred while adding the package', error: error.message });
    }
};

// GET /api/my-packages — packages belonging to the authenticated user
const getMyPackages = (req, res) => {
    try {
        const userId = req.userId;
        const myPackages = getAllPackages().filter((p) => p.userId === userId);
        res.status(200).json(myPackages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching packages', error: error.message });
    }
};

// PUT /api/packages/:id — update a package
const EditPackage = async (req, res) => {
    try {
        const { id } = req.params;
        const { pickupLocation, destination, estimatedPrice } = req.body;

        const existing = getOnePackageById(id);
        if (!existing) {
            return res.status(404).json({ message: 'Package not found' });
        }
        if (existing.userId !== req.userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        let picklat = null;
        let picklng = null;
        let destlat = null;
        let destlng = null;

        if (pickupLocation) {
            const coords = await getCoordinates(pickupLocation);
            picklat = coords.lat;
            picklng = coords.lng;
        }
        if (destination) {
            const coords = await getCoordinates(destination);
            destlat = coords.lat;
            destlng = coords.lng;
        }

        const updates = {
            ...(pickupLocation && { pickupLocation, picklat, picklng }),
            ...(destination && { destination, destlat, destlng }),
            ...(estimatedPrice !== undefined && { estimatedPrice }),
        };

        const updated = updatePackage(id, updates);

        if (!updated) {
            return res.status(404).json({ message: 'Package not found' });
        }

        res.status(200).json({ message: 'Package updated successfully', package: updated });
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ message: 'An error occurred while updating the package', error: error.message });
    }
};

// DELETE /api/packages/:id — delete a package (owner only)
const deletePackage = (req, res) => {
    const { id } = req.params;
    const existing = getOnePackageById(id);
    if (!existing) {
        return res.status(404).json({ message: 'Package not found' });
    }
    if (existing.userId !== req.userId) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const ok = deleteOnePackage(id);
    if (!ok) {
        return res.status(404).json({ message: 'Package not found' });
    }

    return res.status(200).json({ message: 'Package deleted successfully' });
};

const VALID_STATUSES = ['pending', 'accepted', 'in_transit', 'delivered', 'cancelled'];

// PATCH /api/packages/:id/status — update package status (role-based)
const updatePackageStatus = (req, res) => {
    const { id } = req.params;
    const { status: newStatus } = req.body;
    const userId = req.userId;
    const userRole = req.userRole || 'sender';

    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
        return res.status(400).json({ message: 'Invalid or missing status. Valid: pending, accepted, in_transit, delivered, cancelled' });
    }

    const pkg = getOnePackageById(id);
    if (!pkg) {
        return res.status(404).json({ message: 'Package not found' });
    }

    const currentStatus = pkg.status || 'pending';

    if (userRole === 'courier') {
        const allowed = {
            pending: ['accepted'],
            accepted: ['in_transit'],
            in_transit: ['delivered'],
        };
        const allowedNext = allowed[currentStatus];
        if (!allowedNext || !allowedNext.includes(newStatus)) {
            return res.status(400).json({
                message: `Courier can only transition ${currentStatus} → ${(allowed[currentStatus] || []).join(' or ')}`,
            });
        }
        const updates = { status: newStatus };
        if (newStatus === 'accepted') {
            updates.acceptedBy = userId;
        }
        const updated = updatePackage(id, updates);
        return res.status(200).json(updated);
    }

    if (userRole === 'sender') {
        if (currentStatus !== 'pending' || newStatus !== 'cancelled') {
            return res.status(400).json({ message: 'Sender can only cancel a package that is pending' });
        }
        if (pkg.userId !== userId) {
            return res.status(403).json({ message: 'You can only cancel your own packages' });
        }
        const updated = updatePackage(id, { status: 'cancelled' });
        return res.status(200).json(updated);
    }

    return res.status(403).json({ message: 'Forbidden' });
};

// GET /api/courier/packages — pending packages (courier only)
const getCourierPackages = (req, res) => {
    if (req.userRole !== 'courier') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    const packages = getAllPackages().filter((p) => (p.status || 'pending') === 'pending');
    res.status(200).json(packages);
};

// GET /api/courier/my-deliveries — packages accepted by this courier
const getMyDeliveries = (req, res) => {
    if (req.userRole !== 'courier') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    const packages = getAllPackages().filter((p) => p.acceptedBy === req.userId);
    res.status(200).json(packages);
};

// POST /api/packages/near-me — packages sorted by proximity to user's location
const PackagesNearMe = (req, res) => {
    try {
        const userlat = req.body.lat;
        const userlng = req.body.lng;

        if (!userlat || !userlng) {
            return res.status(400).json({ message: 'Location is required' });
        }

        const packages = getAllPackages();

        const calculateDistance = (lat1, lng1, lat2, lng2) => {
            const toRadians = (degree) => degree * (Math.PI / 180);
            const R = 6371; // Earth's radius in km
            const dLat = toRadians(lat2 - lat1);
            const dLng = toRadians(lng2 - lng1);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        const sortedPackages = packages
            .map((pkg) => {
                const distance = calculateDistance(userlat, userlng, pkg.picklat, pkg.picklng);
                return { ...pkg, distance };
            })
            .sort((a, b) => a.distance - b.distance);

        res.status(200).json(sortedPackages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getPackages,
    getPackageById,
    addPackage,
    getMyPackages,
    EditPackage,
    deletePackage,
    updatePackageStatus,
    getCourierPackages,
    getMyDeliveries,
    PackagesNearMe,
};
