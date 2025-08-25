const mongoose = require('mongoose');

const RideRequestSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride ID is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
      index: true,
    },
    message: {
      type: String,
      maxlength: [200, 'Message cannot exceed 200 characters'],
      trim: true,
    },
    respondedAt: {
      type: Date,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    responseMessage: {
      type: String,
      maxlength: [200, 'Response message cannot exceed 200 characters'],
      trim: true,
    },
  },
  { timestamps: true },
);

RideRequestSchema.index({ ride: 1, user: 1, status: 1 }, { unique: true });
RideRequestSchema.index({ ride: 1, status: 'pending' });
RideRequestSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('RideRequest', RideRequestSchema);
