import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    authId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    handle: {
      type: String,
      unique: true,
      trim: true,
      match: [
        /^@[a-zA-Z0-9_]+$/,
        'Handle must start with @ and contain only letters, numbers, and underscores.',
      ],
      minlength: [8, 'Handle must be at least 8 characters long'],
      maxlength: [20, 'Handle cannot be more than 20 characters long'],
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio cannot be more than 300 characters long'],
      trim: true,
      default: '',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer not to say'],
      default: 'prefer not to say',
    },
    dob: {
      type: Date,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allows multiple null values for unique constraint
      required: false,
      match: [/^(\+\d{1,3}[- ]?)?\d{10}$/, 'Please add a valid phone number'],
      default: '',
    },
    phoneCountryCode: {
      type: String,
      trim: true,
      required: false,
      match: [
        /^\+\d{1,4}$/,
        "Phone country code must start with '+' followed by 1 to 4 digits.",
      ],
      default: '',
    },
    isPhoneVerified: {
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

userSchema.statics.findByAuthId = function (authId) {
  return this.findOne({ authId });
};

userSchema.methods.syncWithBetterAuth = function () {
  return this.save();
};

const betterAuthUserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    emailVerified: { type: Boolean, default: false },
    phoneNumber: { type: String },
    phoneNumberVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'user',
    timestamps: true,
    strict: false,
  },
);

const User = mongoose.model('User', betterAuthUserSchema);
const UserProfile = mongoose.model('UserProfile', userSchema);

export { User, UserProfile };
