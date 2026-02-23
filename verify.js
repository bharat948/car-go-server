const db = require('./lib/db');
const { v4: uuidv4 } = require('uuid');

async function test() {
    console.log('Testing CRUD operations...');

    // 1. Test Users
    console.log('\n--- Testing Users ---');
    const allUsers = db.getUsers();
    console.log(`Initial user count: ${allUsers.length}`);

    const testUser = {
        id: uuidv4(),
        username: 'testuser_' + Date.now(),
        password: 'password123',
        role: 'sender',
        friends: []
    };
    db.saveUser(testUser);
    console.log('Saved test user.');

    const fetchedUser = db.getUserByUsername(testUser.username);
    console.log(`Fetched user: ${fetchedUser.username === testUser.username ? 'SUCCESS' : 'FAILURE'}`);

    // 2. Test Packages
    console.log('\n--- Testing Packages ---');
    const allPackages = db.getPackages();
    console.log(`Initial package count: ${allPackages.length}`);

    const testPkg = {
        id: uuidv4(),
        userId: testUser.id,
        userName: testUser.username,
        pickupLocation: 'Test Pickup',
        destination: 'Test Destination',
        estimatedDeliveryTime: '2026-01-01T12:00',
        estimatedPrice: '10.00',
        deliverTo: 'Test Receiver',
        createdOn: new Date().toISOString(),
        picklat: 0,
        picklng: 0,
        destlat: 1,
        destlng: 1,
        status: 'pending'
    };
    db.savePackage(testPkg);
    console.log('Saved test package.');

    const fetchedPkg = db.getPackageById(testPkg.id);
    console.log(`Fetched package: ${fetchedPkg.id === testPkg.id ? 'SUCCESS' : 'FAILURE'}`);

    db.updatePackage(testPkg.id, { status: 'accepted', acceptedBy: testUser.id });
    const updatedPkg = db.getPackageById(testPkg.id);
    console.log(`Updated package status: ${updatedPkg.status === 'accepted' ? 'SUCCESS' : 'FAILURE'}`);

    const deleted = db.deletePackage(testPkg.id);
    console.log(`Deleted package: ${deleted ? 'SUCCESS' : 'FAILURE'}`);

    console.log('\nVerification completed.');
}

test().catch(console.error);
