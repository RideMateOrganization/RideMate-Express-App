import mongoose from 'mongoose';

const RideInteractionSchema = new mongoose.Schema(
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
    interactionType: {
      type: String,
      enum: ['heart', 'bookmark'],
      required: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

RideInteractionSchema.index(
  { ride: 1, user: 1, interactionType: 1 },
  { unique: true },
);

export default mongoose.model('RideInteraction', RideInteractionSchema);
