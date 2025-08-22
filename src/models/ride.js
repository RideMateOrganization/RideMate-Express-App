const mongoose = require('mongoose');
const { RideVisibility } = require('../utils/constants');

const AddressSchema = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      required: [true, 'Address line 1 is required'],
    },
    addressLine2: { type: String, trim: true },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: { type: String, trim: true },
    country: {
      type: String,
      trim: true,
      required: [true, 'Country is required'],
    },
    postalCode: { type: String, trim: true },
    landmark: { type: String, trim: true },
  },
  { _id: false },
);

const LocationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates are required'],
      index: '2dsphere',
    },
    address: {
      type: AddressSchema,
      required: [true, 'Address is required'],
    },
  },
  { _id: false },
);

const RideParticipantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'owner'],
      default: 'member',
      required: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const RideSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a ride name'],
      trim: true,
      maxlength: [100, 'Name can not be more than 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description can not be more than 500 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [RideParticipantSchema],
    startTime: {
      type: Date,
      required: [true, 'Please add a start time for the ride'],
    },
    endTime: Date,
    startLocation: {
      type: LocationSchema,
      required: [true, 'Please add a start location'],
    },
    endLocation: LocationSchema,
    route: {
      type: {
        type: String,
        enum: ['LineString'],
        default: 'LineString',
      },
      coordinates: {
        type: [[Number]],
      },
    },
    maxParticipants: {
      type: Number,
      min: [2, 'Minimum 2 participants for a group ride'],
    },
    visibility: {
      type: String,
      enum: Object.values(RideVisibility),
      default: RideVisibility.Public,
      required: true,
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed', 'cancelled'],
      default: 'planned',
    },
    rideId: {
      type: String,
      required: [true, 'A unique ride ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [36, 'Ride ID must be a UUID (36 characters long)'], // Standard UUID length
      maxlength: [36, 'Ride ID must be a UUID (36 characters long)'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Add owner as a participant if not already present
RideSchema.pre('save', function (next) {
  if (this.isNew) {
    const ownerExists = this.participants.some((p) =>
      p.user.equals(this.owner),
    );
    if (!ownerExists) {
      this.participants.push({
        user: this.owner,
        joinedAt: new Date(),
        role: 'owner',
        isApproved: true,
      });
    }
  }
  next();
});

module.exports = mongoose.model('Ride', RideSchema);
