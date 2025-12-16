import express from 'express';
import protect from '../../middleware/auth.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../../controller/notification.js';

const router = express.Router();

// All notification routes require authentication
router.use(protect);

// Get unread count (must be before /:id routes)
router.get('/unread-count', getUnreadCount);

// Mark all as read
router.patch('/mark-all-read', markAllAsRead);

// Base route for getting all notifications
router.route('/').get(getNotifications);

// Individual notification routes
router.route('/:id/read').patch(markAsRead);
router.route('/:id').delete(deleteNotification);

export default router;
