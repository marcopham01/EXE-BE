const mongoose = require("mongoose");
const schema = mongoose.Schema;

const paymentSchema = new schema(
  {
    order_code: {
      type: Number,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled", "failed"], // Cho phép trạng thái failed
      default: "pending",
    },

    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkout_url: {
      type: String,
      required: false,
    },
    qr_code: {
      type: String,
      required: false,
    },
    premium_package_type: {
      type: String,
      enum: ["monthly", "trial"],
      required: true,
    },
    expiredAt: {
        type: Date,
        required: false,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
