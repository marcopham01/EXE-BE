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
    birthDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          if (!value) return false;
          const today = new Date();
          const dob = new Date(value);
          if (isNaN(dob.getTime())) return false;
          let age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
          }
          return age >= 13 && age <= 120;
        },
        message: "Tuổi phải từ 13 đến 120",
      },
    },
    job: {
      type: String,
      required: true,
      enum: ["Học sinh", "Sinh viên", "Đã đi làm"],
      trim: true,
    },
    heightCm: { type: Number },
    weightKg: { type: Number },
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
      enum: ["monthly"],
    },
  },
  { timestamps: true }
);

// Tạo virtual age để lấy tuổi từ birthDate
userSchema.virtual("age").get(function () {
  if (!this.birthDate) return undefined;
  const today = new Date();
  const dob = new Date(this.birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
});

// Virtual BMI tính từ heightCm/weightKg nếu có
userSchema.virtual("bmi").get(function () {
  const h = Number(this.heightCm);
  const w = Number(this.weightKg);
  if (!h || !w) return undefined;
  const m = h / 100;
  return Number((w / (m * m)).toFixed(2));
});

const user = mongoose.model("User", userSchema);
module.exports = user;
