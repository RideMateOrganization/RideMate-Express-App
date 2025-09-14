const mongoose = require('mongoose');

const RideTrackingSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    path: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
          required: true,
        },
        coordinates: {
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
        },
        // Basic GPS data
        speed: {
          type: Number, // in m/s
          min: 0,
        },
        heading: {
          type: Number, // in degrees (0-360)
          min: 0,
          max: 360,
        },
        // Distance from previous point
        distanceFromPrevious: {
          type: Number, // in meters
          min: 0,
        },
      },
    ],
    trackingStatus: {
      type: String,
      enum: ['active', 'paused', 'completed', 'stopped'],
      default: 'active',
      required: true,
    },
    // Start and end times for this tracking session
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    // Calculated statistics for this user's ride
    calculatedStats: {
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
    // Last known position for quick access
    lastKnownPosition: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function validator(v) {
            return v.length === 2;
          },
          message: 'Coordinates must be an array of [longitude, latitude].',
        },
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true },
);

RideTrackingSchema.index({ ride: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('RideTracking', RideTrackingSchema);
