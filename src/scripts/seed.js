require('dotenv').config({ path: './.env', quiet: true });
const { v4: uuidv4 } = require('uuid');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/user');
const Ride = require('../models/ride');
const RideRequest = require('../models/ride-requests');
const { RideVisibility } = require('../utils/constants');

// Sample data generators
const cities = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Philadelphia',
  'San Antonio',
  'San Diego',
  'Dallas',
  'San Jose',
  'Austin',
  'Jacksonville',
  'Fort Worth',
  'Columbus',
  'Charlotte',
  'San Francisco',
  'Indianapolis',
  'Seattle',
  'Denver',
  'Washington',
];

const states = [
  'NY',
  'CA',
  'IL',
  'TX',
  'AZ',
  'PA',
  'FL',
  'OH',
  'NC',
  'WA',
  'CO',
  'IN',
  'OR',
  'NV',
  'MN',
  'WI',
  'MI',
  'GA',
  'VA',
  'NJ',
];

const countries = ['USA', 'Canada', 'UK', 'Australia', 'Germany'];

const rideNames = [
  'Morning Coffee Ride',
  'Weekend Adventure',
  'City Tour',
  'Mountain Trail',
  'Sunset Cruise',
  'Urban Explorer',
  'Countryside Escape',
  'Beach Run',
  'Forest Path',
  'Riverside Journey',
  'Hill Climb',
  'Valley Crossing',
  'Coastal Route',
  'Park Loop',
  'Downtown Dash',
  'Early Bird Special',
  'Midnight Run',
  'Holiday Cruise',
  'Training Session',
  'Recovery Ride',
  'Speed Challenge',
  'Leisure Loop',
  'Adventure Quest',
  'Scenic Byway',
  'Historic Route',
  'Nature Trail',
  'Urban Challenge',
  'Mountain Pass',
  'Valley Vista',
  'Coastal Breeze',
  'Riverside Ramble',
  'Forest Adventure',
  'City Lights Tour',
  'Country Road',
  'Beach Path',
  'Sunset Boulevard',
  'Morning Glory',
  'Evening Stroll',
  'Weekend Warrior',
  'Daily Grind',
  'Holiday Special',
  'Seasonal Route',
];

const rideDescriptions = [
  'A relaxing ride through the city with coffee stops',
  'An exciting weekend adventure for all skill levels',
  'Explore the city landmarks and hidden gems',
  'Challenging mountain trails with amazing views',
  'Peaceful evening ride to catch the sunset',
  'Discover urban areas and street art',
  'Escape to the peaceful countryside',
  'Enjoy the ocean breeze on this coastal route',
  'Navigate through beautiful forest paths',
  'Follow the river for a scenic journey',
  'Test your climbing skills on challenging hills',
  'Cross beautiful valleys and meadows',
  'Experience the stunning coastal views',
  'Easy loop around the local park',
  'Fast-paced ride through downtown',
  'Perfect for early risers who love morning rides',
  'Night ride through the city with beautiful lights',
  'Special holiday-themed route with festive stops',
  'Intensive training session for serious cyclists',
  'Easy recovery ride for active rest days',
  'Speed-focused ride for performance training',
  'Leisurely pace perfect for social riding',
  'Epic adventure with multiple terrain types',
  'Scenic route with multiple photo opportunities',
  'Historical route passing important landmarks',
  'Natural trail through preserved wilderness',
  'Urban cycling challenge with traffic navigation',
  'Mountain pass with elevation challenges',
  'Valley route with panoramic views',
  'Coastal path with ocean vistas',
  'Riverside trail following the water',
  'Forest exploration through dense woodlands',
  'City tour showcasing architectural highlights',
  'Country road through rural landscapes',
  'Beach path with sand and surf views',
  'Sunset route for evening photography',
  'Morning route to start your day right',
  'Evening ride to wind down after work',
  'Weekend challenge for dedicated cyclists',
  'Daily commute route for regular riders',
  'Holiday special with seasonal attractions',
  'Seasonal route that changes with the weather',
];

// Generate random coordinates within a reasonable range
function generateCoordinates() {
  // Roughly centered around US coordinates
  const lat = 35 + (Math.random() - 0.5) * 20; // 25-45 latitude
  const lng = -100 + (Math.random() - 0.5) * 40; // -80 to -120 longitude
  return [lng, lat]; // MongoDB expects [longitude, latitude]
}

// Generate random address
function generateAddress() {
  const city = cities[Math.floor(Math.random() * cities.length)];
  const state = states[Math.floor(Math.random() * states.length)];
  const country = countries[Math.floor(Math.random() * countries.length)];

  return {
    addressLine1: `${Math.floor(Math.random() * 9999) + 1} ${['Main St', 'Oak Ave', 'Pine Rd', 'Elm St', 'Maple Dr'][Math.floor(Math.random() * 5)]}`,
    addressLine2:
      Math.random() > 0.7 ? `Apt ${Math.floor(Math.random() * 999) + 1}` : '',
    city,
    state,
    country,
    postalCode: `${Math.floor(Math.random() * 90000) + 10000}`,
    landmark:
      Math.random() > 0.8
        ? ['Near Park', 'Close to Mall', 'By Lake'][
            Math.floor(Math.random() * 3)
          ]
        : '',
  };
}

// Generate random location
function generateLocation() {
  return {
    type: 'Point',
    coordinates: generateCoordinates(),
    address: generateAddress(),
  };
}

// Generate random route coordinates
function generateRoute(startCoords, endCoords) {
  const numPoints = Math.floor(Math.random() * 5) + 3; // 3-7 points
  const route = [startCoords];

  for (let i = 1; i < numPoints - 1; i += 1) {
    const lat =
      startCoords[1] +
      (endCoords[1] - startCoords[1]) * (i / (numPoints - 1)) +
      (Math.random() - 0.5) * 0.1;
    const lng =
      startCoords[0] +
      (endCoords[0] - startCoords[0]) * (i / (numPoints - 1)) +
      (Math.random() - 0.5) * 0.1;
    route.push([lng, lat]);
  }

  route.push(endCoords);
  return route;
}

// Generate random date within a range
function generateDate(startDate, endDate) {
  return new Date(
    startDate.getTime() +
      Math.random() * (endDate.getTime() - startDate.getTime()),
  );
}

// Generate random participants for a ride
function generateParticipants(ownerId) {
  const participants = [
    {
      user: ownerId,
      joinedAt: new Date(),
      role: 'owner',
      isApproved: true,
    },
  ];

  // Only add the owner as participant - no additional participants
  return participants;
}

// Generate random ride data for a user
function generateRideData(ownerId) {
  // Generate rides across different time periods: next week, next month, next 3 months
  const timeRanges = [
    { min: 1, max: 7 }, // Next week
    { min: 8, max: 30 }, // Next month
    { min: 31, max: 90 }, // Next 3 months
    { min: 91, max: 180 }, // Next 6 months
  ];

  const selectedRange =
    timeRanges[Math.floor(Math.random() * timeRanges.length)];
  const startTime = generateDate(
    new Date(Date.now() + selectedRange.min * 24 * 60 * 60 * 1000),
    new Date(Date.now() + selectedRange.max * 24 * 60 * 60 * 1000),
  );

  // Vary ride duration: short (1-2h), medium (2-4h), long (4-8h), full-day (8-12h)
  const durationTypes = [
    { min: 1, max: 2 }, // Short rides
    { min: 2, max: 4 }, // Medium rides
    { min: 4, max: 8 }, // Long rides
    { min: 8, max: 12 }, // Full day rides
  ];

  const selectedDuration =
    durationTypes[Math.floor(Math.random() * durationTypes.length)];
  const endTime = new Date(
    startTime.getTime() +
      (selectedDuration.min +
        Math.random() * (selectedDuration.max - selectedDuration.min)) *
        60 *
        60 *
        1000,
  );

  const startLocation = generateLocation();
  const endLocation = generateLocation();

  return {
    name: rideNames[Math.floor(Math.random() * rideNames.length)],
    description:
      rideDescriptions[Math.floor(Math.random() * rideDescriptions.length)],
    owner: ownerId,
    startTime,
    endTime,
    startLocation,
    endLocation,
    route: {
      type: 'LineString',
      coordinates: generateRoute(
        startLocation.coordinates,
        endLocation.coordinates,
      ),
    },
    maxParticipants: (() => {
      const max = Math.floor(Math.random() * 8) + 2; // 2-10 participants
      return max;
    })(),
    participants: generateParticipants(ownerId),
    visibility:
      Object.values(RideVisibility)[
        Math.floor(Math.random() * Object.values(RideVisibility).length)
      ],
    status: (() => {
      // Weighted distribution: mostly planned rides, some active, fewer completed/cancelled
      const rand = Math.random();
      if (rand < 0.6) return 'planned'; // 60% planned
      if (rand < 0.8) return 'active'; // 20% active
      if (rand < 0.95) return 'completed'; // 15% completed
      return 'cancelled'; // 5% cancelled
    })(),
    rideId: uuidv4(),
  };
}

// Generate random ride request data
function generateRideRequestData(rideId, userId, ownerId, forcedStatus = null) {
  // Weighted distribution: mostly pending, some approved, fewer rejected
  let status;
  if (forcedStatus) {
    status = forcedStatus;
  } else {
    const rand = Math.random();
    if (rand < 0.5)
      status = 'pending'; // 50% pending
    else if (rand < 0.8)
      status = 'approved'; // 30% approved
    else status = 'rejected'; // 20% rejected
  }

  const data = {
    ride: rideId,
    user: userId,
    status,
    message:
      Math.random() > 0.4
        ? [
            'I would love to join this ride!',
            'This looks like a great adventure!',
            'Count me in for this ride!',
            "I'm interested in joining",
            'This ride fits my schedule perfectly',
            'Been looking for a ride like this!',
            'Perfect timing for my training schedule',
            'Love the route, count me in!',
            'This looks challenging and fun!',
            'Great opportunity to meet fellow cyclists',
            'The timing works perfectly for me',
            'Excited to explore this area',
            'Been wanting to try this route',
            'Perfect for my fitness level',
            'Looking forward to the adventure!',
            'This ride matches my goals perfectly',
            'Great way to explore the city',
            'Been training for rides like this',
            'Perfect weekend activity!',
            'Love the scenic route choice',
          ][Math.floor(Math.random() * 20)]
        : '',
    requestedAt: new Date(),
  };

  if (status !== 'pending') {
    data.respondedAt = new Date();
    data.respondedBy = ownerId;
    data.responseMessage =
      status === 'approved'
        ? [
            'Welcome to the ride!',
            'Great to have you join us!',
            "You're in! See you there!",
            'Excited to have you on board!',
            'Perfect! Looking forward to riding with you',
            'Welcome aboard! See you at the start point',
            "Great! You'll love this route",
            "Awesome! You're officially part of the team",
            'Welcome! This is going to be a great ride',
            'Perfect addition to our group!',
          ][Math.floor(Math.random() * 10)]
        : [
            'Sorry, the ride is full',
            "Unfortunately, we can't accommodate more riders",
            "Thanks for your interest, but we're at capacity",
            'The ride has reached its maximum participants',
            "Sorry, we've hit our rider limit",
            'Unfortunately, the group is full for this ride',
            "Thanks for your interest, but we're at max capacity",
            'The ride is currently full, maybe next time!',
            "Sorry, we can't take any more riders on this one",
            'Unfortunately, the participant limit has been reached',
          ][Math.floor(Math.random() * 10)];
  }

  return data;
}

// Main seeding function
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Get existing users
    const users = await User.find({}).select('_id');
    if (users.length === 0) {
      console.log('❌ No users found in database. Please create users first.');
      return;
    }

    console.log(`📊 Found ${users.length} existing users`);

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await Ride.deleteMany({});
    await RideRequest.deleteMany({});
    console.log('✅ Cleared existing data');

    // Generate rides for each user
    console.log('🚴 Generating rides...');
    const rides = [];
    users.forEach((user) => {
      const numRides = Math.floor(Math.random() * 5) + 3; // 3-7 rides per user
      for (let i = 0; i < numRides; i += 1) {
        const rideData = generateRideData(user.id);
        rides.push(rideData);
      }
    });

    const createdRides = await Ride.insertMany(rides);
    console.log(`✅ Created ${createdRides.length} rides`);

    // Generate ride requests
    console.log('📝 Generating ride requests...');
    const rideRequests = [];
    createdRides.forEach((ride) => {
      // Skip rides owned by the ride owner and users who are already participants
      const potentialRequesters = users.filter((user) => {
        const isOwner = user.id.toString() === ride.owner.toString();
        const isAlreadyParticipant = ride.participants.some(
          (p) => p.user.toString() === user.id.toString(),
        );
        return !isOwner && !isAlreadyParticipant;
      });

      if (potentialRequesters.length > 0) {
        const numRequests = Math.floor(Math.random() * 6) + 2; // 2-7 requests per ride
        const selectedRequesters = potentialRequesters
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(numRequests, potentialRequesters.length));

        // Ensure at least one pending request is created
        let hasPendingRequest = false;

        selectedRequesters.forEach((user, index) => {
          // Force the first request to be pending if we haven't created one yet
          let requestData;
          if (index === 0 && !hasPendingRequest) {
            requestData = generateRideRequestData(
              ride.id,
              user.id,
              ride.owner,
              'pending', // Force pending status
            );
            hasPendingRequest = true;
          } else {
            requestData = generateRideRequestData(ride.id, user.id, ride.owner);
            if (requestData.status === 'pending') {
              hasPendingRequest = true;
            }
          }
          rideRequests.push(requestData);
        });
      }
    });

    const createdRequests = await RideRequest.insertMany(rideRequests);
    console.log(`✅ Created ${createdRequests.length} ride requests`);

    // Summary
    console.log('\n🎉 Database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Rides: ${createdRides.length}`);
    console.log(`   - Ride Requests: ${createdRequests.length}`);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    // Disconnect from database
    await disconnectDB();
    console.log('🔌 Disconnected from database');
  }
}

// Run the seeding function if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
