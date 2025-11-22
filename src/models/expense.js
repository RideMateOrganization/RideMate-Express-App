import mongoose from 'mongoose';
import { ExpenseCategory } from '../utils/constants.js';

const ExpenseSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride ID is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [3, 'Description must be at least 3 characters'],
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    amountInSmallestUnit: {
      type: Number,
      required: [true, 'Amount in smallest unit is required'],
      validate: {
        validator(v) {
          if (v === null || v === undefined) return false;
          return Number.isInteger(v) && v > 0;
        },
        message: 'Amount in smallest unit must be a positive integer',
      },
    },
    dateTime: {
      type: Date,
      required: [true, 'Date time is required'],
      validate: {
        validator(v) {
          if (!v) return false;
          const now = new Date();
          return v <= now;
        },
        message: 'Expense date time cannot be in the future',
      },
    },
    currencyCode: {
      type: String,
      required: [true, 'Currency code is required'],
      uppercase: true,
      trim: true,
      length: [3, 'Currency code must be exactly 3 characters'],
      validate: {
        validator(v) {
          if (!v) return false;
          return /^[A-Z]{3}$/.test(v);
        },
        message:
          'Currency code must be a valid ISO 4217 code (3 uppercase letters)',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: Object.values(ExpenseCategory),
        message:
          'Category must be one of: fuel, food, lodging, maintenance, tolls, other',
      },
      index: true,
    },
    receipt: {
      type: String,
      trim: true,
      validate: {
        validator(v) {
          if (!v) return true; // Optional field
          try {
            const url = new URL(v);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        message: 'Receipt must be a valid URL',
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

// Indexes for query optimization
ExpenseSchema.index({ ride: 1, dateTime: -1 });
ExpenseSchema.index({ ride: 1, category: 1 });
ExpenseSchema.index({ user: 1, dateTime: -1 });
ExpenseSchema.index({ dateTime: 1 });
ExpenseSchema.index({ currencyCode: 1 });

// Transform to ensure proper field names in JSON
ExpenseSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    // Ensure amountInSmallestUnit is returned as integer
    const transformed = { ...ret };
    if (transformed.amountInSmallestUnit !== undefined) {
      transformed.amountInSmallestUnit = parseInt(
        transformed.amountInSmallestUnit,
        10,
      );
    }
    return transformed;
  },
});

export default mongoose.model('Expense', ExpenseSchema);
