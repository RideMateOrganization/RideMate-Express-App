import mongoose from 'mongoose';
import { RideVisibility, RideStatus } from '../utils/constants.js';

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
    stateProvince: { type: String, trim: true },
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
      validate: {
        validator: function validator(v) {
          return v.length === 2;
        },
        message: 'Coordinates must be an array of [longitude, latitude].',
      },
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
    // Motorcycle ride statistics for this participant
    rideStats: {
      totalDistance: {
        type: Number, // in meters
        default: 0,
        min: 0,
      },
      averageSpeed: {
        type: Number, // in m/s
        default: 0,
        min: 0,
      },
      maxSpeed: {
        type: Number, // in m/s
        default: 0,
        min: 0,
      },
      totalDuration: {
        type: Number, // in seconds
        default: 0,
        min: 0,
      },
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
    plannedRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoutePath',
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
      enum: Object.values(RideStatus),
      default: RideStatus.PLANNED,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'extreme'],
      default: 'easy',
    },
    rideId: {
      type: String,
      required: [true, 'A unique ride ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [6, 'Ride ID must be 6 characters long'],
      maxlength: [6, 'Ride ID must be 6 characters long'],
    },
    bannerImage: {
      type: String,
      trim: true,
    },
    waypoints: [LocationSchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    // Ride-level statistics (aggregated from all participants)
    rideStats: {
      totalDistance: {
        type: Number, // in meters
        default: 0,
        min: 0,
      },
      averageSpeed: {
        type: Number, // in m/s
        default: 0,
        min: 0,
      },
      maxSpeed: {
        type: Number, // in m/s
        default: 0,
        min: 0,
      },
      totalDuration: {
        type: Number, // in seconds
        default: 0,
        min: 0,
      },
      // Ride completion metrics
      completionRate: {
        type: Number, // percentage of participants who completed the ride
        default: 0,
        min: 0,
        max: 100,
      },
      averageParticipantDistance: {
        type: Number, // in meters
        default: 0,
        min: 0,
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

// Add owner as a participant if not already present
RideSchema.pre('save', function addOwnerAsParticipant(next) {
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

// Add geospatial indexes for efficient coordinate-based queries
RideSchema.index({ 'startLocation.coordinates': '2dsphere' });
RideSchema.index({ 'endLocation.coordinates': '2dsphere' });
RideSchema.index({ startTime: 1 });
RideSchema.index({ owner: 1 });
RideSchema.index({ plannedRoute: 1 });
RideSchema.index({ 'participants.user': 1 });

export default mongoose.model('Ride', RideSchema);
