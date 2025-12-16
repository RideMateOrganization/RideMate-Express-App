import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: [
        'USER_RIDE_JOIN_REQUEST',
        'USER_RIDE_REQUEST_APPROVED',
        'USER_RIDE_REQUEST_REJECTED',
        'NOTIFICATION__RIDE_STARTED',
        'NOTIFICATION__RIDE_CANCELLED',
        'NOTIFICATION__RIDE_COMPLETED',
        'NOTIFICATION__RIDE_UPDATED',
        'NOTIFICATION__RIDE_REMINDER_24H',
        'NOTIFICATION__RIDE_REMINDER_1H',
        'NOTIFICATION__RIDE_REMINDER_5MIN',
      ],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    body: {
      type: String,
      required: [true, 'Notification body is required'],
      trim: true,
      maxlength: [500, 'Body cannot exceed 500 characters'],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [200, 'Subtitle cannot exceed 200 characters'],
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    pushSent: {
      type: Boolean,
      default: false,
    },
    pushSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

// Compound indexes for efficient queries
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

// Static method to get unread count for a user
NotificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({ user: userId, isRead: false });
};

// Static method to mark all notifications as read for a user
NotificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() },
  );
};

// Static method to get recent notifications for a user
NotificationSchema.statics.getRecentNotifications = function (
  userId,
  limit = 20,
) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export default mongoose.model('Notification', NotificationSchema);
