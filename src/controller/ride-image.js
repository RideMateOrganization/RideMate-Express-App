const Ride = require('../models/ride');
const RideImage = require('../models/ride-images');

// @desc    Upload images for a ride
// @route   POST /api/v1/rides/:id/images
// @access  Private (only participants can upload)
async function uploadRideImage(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authorized.' });
    }
    const { id } = req.params;
    const { images } = req.body;

    // Validate that images array is provided and not empty
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Images array is required and cannot be empty.',
      });
    }

    // Validate each image object
    const invalidImageIndex = images.findIndex((image) => !image.url);
    if (invalidImageIndex !== -1) {
      return res.status(400).json({
        success: false,
        error: `Image URL is required for image at index ${invalidImageIndex}.`,
      });
    }

    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found.' });
    }

    // Ensure the user is a participant of the ride
    const isParticipant = ride.participants.some(
      (p) => p.user.equals(req.user.id) && p.isApproved,
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Only participants can upload images to this ride.',
      });
    }

    // Prepare images data for bulk creation
    const imagesData = images.map((image) => ({
      ride: id,
      user: req.user.id,
      url: image.url,
      caption: image.caption || '',
    }));

    // Bulk create all images
    const newImages = await RideImage.insertMany(imagesData);

    res.status(201).json({
      success: true,
      data: newImages,
      count: newImages.length,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, error: messages.join(', ') });
    }
    res
      .status(500)
      .json({ success: false, error: 'Server Error uploading images.' });
  }
}

// @desc    Get all images for a ride
// @route   GET /api/v1/rides/:id/images
// @access  Private (only participants can view)
async function getRideImages(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authorized.' });
    }
    const { id } = req.params;

    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found.' });
    }

    // Ensure the user is a participant of the ride
    const isParticipant = ride.participants.some(
      (p) => p.user.equals(req.user.id) && p.isApproved,
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Only participants can view images for this ride.',
      });
    }

    // Get all images for the ride with user information
    const images = await RideImage.find({ ride: id })
      .populate('user', 'name email profilePicture')
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      success: true,
      data: images,
      count: images.length,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, error: messages.join(', ') });
    }
    res
      .status(500)
      .json({ success: false, error: 'Server Error fetching ride images.' });
  }
}

module.exports = {
  uploadRideImage,
  getRideImages,
};
