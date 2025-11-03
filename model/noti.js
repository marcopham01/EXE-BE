const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    type: {
      type: String,
      enum: [
        "premium_success",
        "meal_plan_created",
        "weekly_kcal_summary",
        "generic",
      ],
      default: "generic",
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Object, default: {} },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model("notifications", NotificationSchema);
