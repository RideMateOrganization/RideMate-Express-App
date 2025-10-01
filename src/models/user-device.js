import mongoose from 'mongoose';

const UserDeviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    pushToken: {
      type: String,
      required: [true, 'Push notification token is required'],
      trim: true,
    },
    deviceType: {
      type: String,
      enum: ['android', 'ios', 'web'],
      default: 'android',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

// Compound index to ensure unique pushToken per user
UserDeviceSchema.index({ user: 1, pushToken: 1 }, { unique: true });

// Index for active devices
UserDeviceSchema.index({ user: 1, isActive: 1 });

// Update lastSeen when document is updated
UserDeviceSchema.pre('save', function (next) {
  this.lastSeen = new Date();
  next();
});

// Static method to get all active devices for a user
UserDeviceSchema.statics.getActiveDevicesForUser = function (userId) {
  return this.find({ user: userId, isActive: true });
};

// Static method to get all push tokens for a user
UserDeviceSchema.statics.getPushTokensForUser = function (userId) {
  return this.find({ user: userId, isActive: true }).select('pushToken');
};

// Static method to deactivate a device
UserDeviceSchema.statics.deactivateDevice = function (userId, pushToken) {
  return this.findOneAndUpdate(
    { user: userId, pushToken },
    { isActive: false },
    { new: true },
  );
};

// Static method to deactivate all devices for a user
UserDeviceSchema.statics.deactivateAllDevicesForUser = function (userId) {
  return this.updateMany({ user: userId }, { isActive: false });
};

export default mongoose.model('UserDevice', UserDeviceSchema);
