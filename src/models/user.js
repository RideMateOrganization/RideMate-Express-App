const { default: mongoose } = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
    handle: {
      type: String,
      required: [true, "Please provide a handle"],
      unique: true,
      trim: true,
      match: [
        /^@[a-zA-Z0-9_]+$/,
        "Handle must start with @ and contain only letters, numbers, and underscores.",
      ],
      minlength: [8, "Handle must be at least 8 characters long"],
      maxlength: [20, "Handle cannot be more than 20 characters long"],
    },
    image: {
      type: String,
      default: "https://placehold.co/100x100",
    },
    bio: {
      type: String,
      maxlength: [200, "Bio cannot be more than 200 characters long"],
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      match: [/^(\+\d{1,3}[- ]?)?\d{10}$/, "Please add a valid phone number"],
      default: "",
    },
    phoneCountryCode: {
      type: String,
      trim: true,
      match: [
        /^\+\d{1,4}$/,
        "Phone country code must start with '+' followed by 1 to 4 digits.",
      ],
      default: "",
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
