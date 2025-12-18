import mongoose from 'mongoose';

// GiftedChat IMessage User Schema (embedded)
const ChatUserSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: 'Unknown',
    },
    avatar: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

// GiftedChat IMessage Schema for ride chat
const RideChatMessageSchema = new mongoose.Schema(
  {
    // Reference to the ride this message belongs to
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
      index: true,
    },
    // IMessage required fields
    text: {
      type: String,
      required: [true, 'Message text cannot be empty'],
      maxlength: [1000, 'Message cannot be more than 1000 characters'],
      trim: true,
    },
    user: {
      type: ChatUserSchema,
      required: true,
    },
    // IMessage optional fields
    image: {
      type: String,
      default: null,
    },
    video: {
      type: String,
      default: null,
    },
    audio: {
      type: String,
      default: null,
    },
    system: {
      type: Boolean,
      default: false,
    },
    sent: {
      type: Boolean,
      default: true,
    },
    received: {
      type: Boolean,
      default: false,
    },
    pending: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

// Indexes for efficient querying
RideChatMessageSchema.index({ ride: 1, createdAt: -1 });
RideChatMessageSchema.index({ 'user._id': 1 });

export default mongoose.model('RideChatMessage', RideChatMessageSchema);
