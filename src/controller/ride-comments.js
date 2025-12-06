import RideComment from '../models/ride-comments.js';
import Ride from '../models/ride.js';
import { User } from '../models/user.js';
import { invalidateCommentsCache } from '../utils/cache.js';

// @desc    Add a comment to a ride
// @route   POST /api/v1/rides/:rideId/comments
// @access  Private
async function addComment(req, res) {
  try {
    const { rideId } = req.params;
    const { text, parentComment } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment text is required',
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
        error: 'Only ride participants can add comments',
      });
    }

    // If parentComment is provided, validate it exists and belongs to the same ride
    if (parentComment) {
      const parentCommentDoc = await RideComment.findById(parentComment);
      if (!parentCommentDoc || parentCommentDoc.ride.toString() !== rideId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parent comment',
        });
      }
    }

    // Create the comment
    const comment = await RideComment.create({
      ride: rideId,
      user: userId,
      text: text.trim(),
      parentComment: parentComment || null,
    });

    // Populate user details
    await comment.populate({
      path: 'user',
      select: 'name email image phoneNumber',
      populate: { path: 'profile', select: 'handle' },
    });

    await invalidateCommentsCache(rideId);

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error('Error adding comment:', error);
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

// @desc    Get comments for a ride
// @route   GET /api/v1/rides/:rideId/comments
// @access  Private
async function getComments(req, res) {
  try {
    const { rideId } = req.params;
    const { page = 1, limit = 20, parentComment } = req.query;
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
        error: 'Only ride participants can view comments',
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter = { ride: rideId };
    if (parentComment === 'null' || parentComment === null) {
      filter.parentComment = null;
    } else if (parentComment) {
      filter.parentComment = parentComment;
    }

    // Get total count for pagination
    const totalComments = await RideComment.countDocuments(filter);
    const totalPages = Math.ceil(totalComments / limitNum);

    // Get comments with pagination
    const comments = await RideComment.find(filter)
      .populate({
        path: 'user',
        select: 'name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
      .populate('parentComment')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum);

    // Add like status for current user to each comment
    const commentsWithLikeStatus = comments.map((comment) => {
      const commentObj = comment.toObject();
      const isLikedByUser = comment.likes.some(
        (like) => like.user.toString() === userId.toString(),
      );
      commentObj.isLikedByUser = isLikedByUser;
      return commentObj;
    });

    res.status(200).json({
      success: true,
      count: commentsWithLikeStatus.length,
      total: totalComments,
      data: commentsWithLikeStatus,
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
    console.error('Error getting comments:', error);
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

// @desc    Update a comment
// @route   PUT /api/v1/comments/:commentId
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
        error: 'Comment text is required',
      });
    }

    // Find the comment
    const comment = await RideComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    // Check if user is the author of the comment
    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the comment author can update the comment',
      });
    }

    // Update the comment
    comment.text = text.trim();
    await comment.save();

    // Populate user details
    await comment.populate({
      path: 'user',
      select: 'name email image phoneNumber',
      populate: { path: 'profile', select: 'handle' },
    });

    await invalidateCommentsCache(comment.ride.toString());

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error('Error updating comment:', error);
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
        error: 'Invalid comment ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// @desc    Delete a comment
// @route   DELETE /api/v1/comments/:commentId
// @access  Private
async function deleteComment(req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Find the comment
    const comment = await RideComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    // Check if user is the author of the comment or the ride owner
    const ride = await Ride.findById(comment.ride);
    const isCommentAuthor = comment.user.toString() === userId.toString();
    const isRideOwner = ride && ride.owner.toString() === userId.toString();

    if (!isCommentAuthor && !isRideOwner) {
      return res.status(403).json({
        success: false,
        error: 'Only the comment author or ride owner can delete the comment',
      });
    }

    const rideId = comment.ride.toString();

    // Delete the comment (this will also delete any replies due to cascade)
    await RideComment.findByIdAndDelete(commentId);

    await invalidateCommentsCache(rideId);

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// @desc    Get a single comment with replies
// @route   GET /api/v1/comments/:commentId
// @access  Private
async function getComment(req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Find the comment
    const comment = await RideComment.findById(commentId)
      .populate({
        path: 'user',
        select: 'name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
      .populate('parentComment');

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    // Check if user is a participant or owner of the ride
    const ride = await Ride.findById(comment.ride);
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
        error: 'Only ride participants can view comments',
      });
    }

    // Get replies to this comment
    const replies = await RideComment.find({ parentComment: commentId })
      .populate({
        path: 'user',
        select: 'name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
      .sort({ createdAt: 1 });

    // Add like status for current user to main comment
    const commentObj = comment.toObject();
    const isLikedByUser = comment.likes.some(
      (like) => like.user.toString() === userId.toString(),
    );
    commentObj.isLikedByUser = isLikedByUser;

    // Add like status for current user to replies
    const repliesWithLikeStatus = replies.map((reply) => {
      const replyObj = reply.toObject();
      const isReplyLikedByUser = reply.likes.some(
        (like) => like.user.toString() === userId.toString(),
      );
      replyObj.isLikedByUser = isReplyLikedByUser;
      return replyObj;
    });

    res.status(200).json({
      success: true,
      data: {
        ...commentObj,
        replies: repliesWithLikeStatus,
      },
    });
  } catch (error) {
    console.error('Error getting comment:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// @desc    Like or unlike a comment
// @route   POST /api/v1/rides/:rideId/comments/:commentId/like
// @access  Private
async function toggleLike(req, res) {
  try {
    const { commentId, rideId } = req.params;
    const userId = req.user.id;

    // Find the comment
    const comment = await RideComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    // Verify the comment belongs to the specified ride
    if (comment.ride.toString() !== rideId) {
      return res.status(400).json({
        success: false,
        error: 'Comment does not belong to the specified ride',
      });
    }

    // Check if user is a participant or owner of the ride
    const ride = await Ride.findById(rideId);
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
        error: 'Only ride participants can like comments',
      });
    }

    // Check if user has already liked this comment
    const existingLikeIndex = comment.likes.findIndex(
      (like) => like.user.toString() === userId.toString(),
    );

    let isLiked = false;
    let { likeCount } = comment;

    if (existingLikeIndex > -1) {
      // Unlike: remove the like
      comment.likes.splice(existingLikeIndex, 1);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
      likeCount = comment.likeCount;
    } else {
      // Like: add the like
      comment.likes.push({
        user: userId,
        likedAt: new Date(),
      });
      comment.likeCount += 1;
      likeCount = comment.likeCount;
      isLiked = true;
    }

    await comment.save();
    await invalidateCommentsCache(comment.ride.toString());

    res.status(200).json({
      success: true,
      data: {
        commentId: comment.id,
        isLiked,
        likeCount,
        message: isLiked
          ? 'Comment liked successfully'
          : 'Comment unliked successfully',
      },
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// @desc    Get users who liked a comment
// @route   GET /api/v1/rides/:rideId/comments/:commentId/likes
// @access  Private
async function getCommentLikes(req, res) {
  try {
    const { commentId, rideId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    // Find the comment
    const comment = await RideComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    // Verify the comment belongs to the specified ride
    if (comment.ride.toString() !== rideId) {
      return res.status(400).json({
        success: false,
        error: 'Comment does not belong to the specified ride',
      });
    }

    // Check if user is a participant or owner of the ride
    const ride = await Ride.findById(rideId);
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
        error: 'Only ride participants can view comment likes',
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Get likes with pagination
    const likes = comment.likes
      .sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt))
      .slice(skip, skip + limitNum);

    // Populate user details for the likes
    const populatedLikes = await Promise.all(
      likes.map(async (like) => {
        const user = await User.findById(like.user)
          .select('name email image phoneNumber')
          .populate('profile', 'handle');
        return {
          user,
          likedAt: like.likedAt,
        };
      }),
    );

    const totalLikes = comment.likeCount;
    const totalPages = Math.ceil(totalLikes / limitNum);

    res.status(200).json({
      success: true,
      count: populatedLikes.length,
      total: totalLikes,
      data: populatedLikes,
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
    console.error('Error getting comment likes:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

export {
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getComment,
  toggleLike,
  getCommentLikes,
};
