const mongoose = require("mongoose");

const schema = mongoose.Schema;
const userSchema = new schema(
  {
    username: {
      type: String,
      unique: true,
    },
    fullName: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
    },
    email: {
      type: String,
      unique: true,
    },
    phoneNumber: {
      type: String,
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    resetToken: {
      type: String,
    },
    resetTokenExpires: {
      type: Date,
    },
    premiumMembership: {
      type: Boolean,
      default: false,
    },
    premiumMembershipExpires: {
      type: Date,
    },
    premiumMembershipType: {
      type: String,
      enum: ["monthly", "yearly"],
    },
  },
  { timestamps: true }
);
const user = mongoose.model("User", userSchema);
module.exports = user;
