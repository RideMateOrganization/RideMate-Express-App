import mongoose from 'mongoose';

const legalAcceptanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    termsOfServiceAccepted: {
      type: Boolean,
      default: false,
    },
    termsOfServiceAcceptedAt: {
      type: Date,
      default: null,
    },
    termsOfServiceVersion: {
      type: String,
      default: '1.0',
    },
    privacyPolicyAccepted: {
      type: Boolean,
      default: false,
    },
    privacyPolicyAcceptedAt: {
      type: Date,
      default: null,
    },
    privacyPolicyVersion: {
      type: String,
      default: '1.0',
    },
    dataProcessingConsentAccepted: {
      type: Boolean,
      default: false,
    },
    dataProcessingConsentAcceptedAt: {
      type: Date,
      default: null,
    },
    dataProcessingConsentVersion: {
      type: String,
      default: '1.0',
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    acceptanceMethod: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

// Index for finding users who haven't accepted terms
legalAcceptanceSchema.index({
  termsOfServiceAccepted: 1,
  privacyPolicyAccepted: 1,
  dataProcessingConsentAccepted: 1,
});

// Static method to find acceptance by user ID
legalAcceptanceSchema.statics.findByUserId = function findByUserId(userId) {
  return this.findOne({ user: userId });
};

// Static method to create or update acceptance
legalAcceptanceSchema.statics.createOrUpdate = function createOrUpdate(
  userId,
  acceptanceData,
) {
  return this.findOneAndUpdate({ user: userId }, acceptanceData, {
    upsert: true,
    new: true,
    runValidators: true,
  });
};

// Method to check if user has accepted all required terms
legalAcceptanceSchema.methods.hasAcceptedAllTerms =
  function hasAcceptedAllTerms() {
    return (
      this.termsOfServiceAccepted &&
      this.privacyPolicyAccepted &&
      this.dataProcessingConsentAccepted
    );
  };

// Method to get acceptance status
legalAcceptanceSchema.methods.getAcceptanceStatus =
  function getAcceptanceStatus() {
    return {
      termsOfService: {
        accepted: this.termsOfServiceAccepted,
        acceptedAt: this.termsOfServiceAcceptedAt,
        version: this.termsOfServiceVersion,
      },
      privacyPolicy: {
        accepted: this.privacyPolicyAccepted,
        acceptedAt: this.privacyPolicyAcceptedAt,
        version: this.privacyPolicyVersion,
      },
      dataProcessingConsent: {
        accepted: this.dataProcessingConsentAccepted,
        acceptedAt: this.dataProcessingConsentAcceptedAt,
        version: this.dataProcessingConsentVersion,
      },
      allAccepted: this.hasAcceptedAllTerms(),
    };
  };

const LegalAcceptance = mongoose.model(
  'LegalAcceptance',
  legalAcceptanceSchema,
);

export default LegalAcceptance;
