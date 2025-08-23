const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true,
      index: true,
    },
    tokenId: {
      type: String,
      required: [true, 'Token ID is required'],
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Token expiration is required'],
    },
  },
  {
    timestamps: true,
  },
);

TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
TokenSchema.index({ token: 1, expiresAt: 1 });

module.exports = mongoose.model('Tokens', TokenSchema);
