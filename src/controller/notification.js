import Notification from '../models/notification.js';

// @desc Get notifications for current user with pagination
// @route GET /api/v1/notifications
// @access Private - Only for logged in users
async function getNotifications(req, res) {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user.id;

    // Build query
    const query = { user: userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    // Parse pagination params
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Fetch notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await Notification.countDocuments(query);
    const hasMore = pageNum * limitNum < total;

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Get unread notification count for current user
// @route GET /api/v1/notifications/unread-count
// @access Private - Only for logged in users
async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id;
    const count = await Notification.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Mark notification as read
// @route PATCH /api/v1/notifications/:id/read
// @access Private - Only for logged in users
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find and update notification (ensure it belongs to the user)
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { isRead: true, readAt: new Date() },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Mark all notifications as read for current user
// @route PATCH /api/v1/notifications/mark-all-read
// @access Private - Only for logged in users
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;

    const result = await Notification.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notification(s) marked as read`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Delete a notification
// @route DELETE /api/v1/notifications/:id
// @access Private - Only for logged in users
async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find and delete notification (ensure it belongs to the user)
    const notification = await Notification.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
