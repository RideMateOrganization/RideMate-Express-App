import RideChatMessage from '../models/ride-comments.js';
import { logError } from '../utils/logger.js';
import Ride from '../models/ride.js';

// @desc    Send a message to ride chat
// @route   POST /api/v1/rides/:rideId/comments
// @access  Private
async function addComment(req, res) {
  try {
    const { rideId } = req.params;
    const { text, image, video, audio, system } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required',
      });
    }

    // Check if ride exists
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found',
      });
    }

    // Check if user is a participant or owner of the ride
    const isOwner = ride.owner.toString() === userId.toString();
    const isParticipant = ride.participants.some(
      (p) => p.user.toString() === userId.toString() && p.isApproved,
    );

    if (!isOwner && !isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Only ride participants can send messages',
      });
    }

    // Create the message in IMessage format
    const message = await RideChatMessage.create({
      ride: rideId,
      text: text.trim(),
      user: {
        _id: req.user.id,
        name: req.user.name || 'Unknown',
        avatar: req.user.image || null,
      },
      image: image || null,
      video: video || null,
      audio: audio || null,
      system: system || false,
      sent: true,
      received: false,
      pending: false,
    });

    // Return the message in IMessage format
    res.status(201).json({
      success: true,
      data: {
        // eslint-disable-next-line no-underscore-dangle
        _id: message._id,
        text: message.text,
        createdAt: message.createdAt,
        user: message.user,
        image: message.image,
        video: message.video,
        audio: message.audio,
        system: message.system,
        sent: message.sent,
        received: message.received,
        pending: message.pending,
      },
    });
  } catch (error) {
    logError('Error sending message:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', '),
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ride ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// @desc    Get messages for a ride chat
// @route   GET /api/v1/rides/:rideId/comments
// @access  Private
async function getComments(req, res) {
  try {
    const { rideId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    // Check if ride exists
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found',
      });
    }

    // Check if user is a participant or owner of the ride
    const isOwner = ride.owner.toString() === userId.toString();
    const isParticipant = ride.participants.some(
      (p) => p.user.toString() === userId.toString() && p.isApproved,
    );

    if (!isOwner && !isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Only ride participants can view messages',
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalMessages = await RideChatMessage.countDocuments({
      ride: rideId,
    });
    const totalPages = Math.ceil(totalMessages / limitNum);

    // Get messages with pagination (newest first for GiftedChat)
    const messages = await RideChatMessage.find({ ride: rideId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Transform to IMessage format
    const formattedMessages = messages.map((msg) => ({
      // eslint-disable-next-line no-underscore-dangle
      _id: msg._id,
      text: msg.text,
      createdAt: msg.createdAt,
      user: msg.user,
      image: msg.image,
      video: msg.video,
      audio: msg.audio,
      system: msg.system,
      sent: msg.sent,
      received: msg.received,
      pending: msg.pending,
    }));

    res.status(200).json({
      success: true,
      count: formattedMessages.length,
      total: totalMessages,
      data: formattedMessages,
      pagination: {
        currentPage: pageNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        nextPage: pageNum < totalPages ? pageNum + 1 : null,
        prevPage: pageNum > 1 ? pageNum - 1 : null,
        limit: limitNum,
      },
    });
  } catch (error) {
    logError('Error getting messages:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ride ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// @desc    Update a message
// @route   PUT /api/v1/rides/:rideId/comments/:commentId
// @access  Private
async function updateComment(req, res) {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required',
      });
    }

    // Find the message
    const message = await RideChatMessage.findById(commentId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Check if user is the author of the message
    // eslint-disable-next-line no-underscore-dangle
    if (message.user._id !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the message author can update the message',
      });
    }

    // Update the message
    message.text = text.trim();
    await message.save();

    res.status(200).json({
      success: true,
      data: {
        // eslint-disable-next-line no-underscore-dangle
        _id: message._id,
        text: message.text,
        createdAt: message.createdAt,
        user: message.user,
        image: message.image,
        video: message.video,
        audio: message.audio,
        system: message.system,
        sent: message.sent,
        received: message.received,
        pending: message.pending,
      },
    });
  } catch (error) {
    logError('Error updating message:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', '),
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid message ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// @desc    Delete a message
// @route   DELETE /api/v1/rides/:rideId/comments/:commentId
// @access  Private
async function deleteComment(req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Find the message
    const message = await RideChatMessage.findById(commentId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Check if user is the author of the message or the ride owner
    const ride = await Ride.findById(message.ride);
    // eslint-disable-next-line no-underscore-dangle
    const isMessageAuthor = message.user._id === userId.toString();
    const isRideOwner = ride && ride.owner.toString() === userId.toString();

    if (!isMessageAuthor && !isRideOwner) {
      return res.status(403).json({
        success: false,
        error: 'Only the message author or ride owner can delete the message',
      });
    }

    await RideChatMessage.findByIdAndDelete(commentId);

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    logError('Error deleting message:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid message ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// @desc    Get a single message
// @route   GET /api/v1/rides/:rideId/comments/:commentId
// @access  Private
async function getComment(req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Find the message
    const message = await RideChatMessage.findById(commentId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Check if user is a participant or owner of the ride
    const ride = await Ride.findById(message.ride);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found',
      });
    }

    const isOwner = ride.owner.toString() === userId.toString();
    const isParticipant = ride.participants.some(
      (p) => p.user.toString() === userId.toString() && p.isApproved,
    );

    if (!isOwner && !isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Only ride participants can view messages',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        // eslint-disable-next-line no-underscore-dangle
        _id: message._id,
        text: message.text,
        createdAt: message.createdAt,
        user: message.user,
        image: message.image,
        video: message.video,
        audio: message.audio,
        system: message.system,
        sent: message.sent,
        received: message.received,
        pending: message.pending,
      },
    });
  } catch (error) {
    logError('Error getting message:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid message ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Note: Like functionality removed as it's not part of standard chat UX
// If needed, can be re-added as message reactions

export { addComment, getComments, updateComment, deleteComment, getComment };
