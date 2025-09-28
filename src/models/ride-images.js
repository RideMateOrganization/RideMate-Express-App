import mongoose from 'mongoose';

const RideImageSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    url: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    caption: {
      type: String,
      maxlength: [200, 'Caption can be at most 200 characters'],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

const RideImage = mongoose.model('RideImage', RideImageSchema);
export default RideImage;
