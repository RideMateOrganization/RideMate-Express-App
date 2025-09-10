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
        speed: Number,
        altitude: Number,
        heading: Number,
      },
    ],
    trackingStatus: {
      type: String,
      enum: ['active', 'paused', 'completed', 'stopped'],
      default: 'active',
      required: true,
    },
  },
  { timestamps: true },
);

RideTrackingSchema.index({ ride: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('RideTracking', RideTrackingSchema);
