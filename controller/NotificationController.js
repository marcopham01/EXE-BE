const Notification = require("../model/noti");
const MealPlan = require("../model/mealPlan");
const { emitToUser } = require("../services/socket");

exports.create = async (req, res) => {
  try {
    const userId = req._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });

    const { type = "generic", title, message, data = {} } = req.body || {};
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Thiếu title hoặc message" });
    }
    const doc = await Notification.create({ user_id: userId, type, title, message, data });
    try { emitToUser(userId, "notification:new", doc); } catch (_) {}
    return res.status(201).json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || error });
  }
};

exports.listMy = async (req, res) => {
  try {
    const userId = req._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    const { page = 1, limit = 10, unreadOnly } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const q = { user_id: userId };
    if (String(unreadOnly) === "true") q.read = false;
    const total = await Notification.countDocuments(q);
    const items = await Notification.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean();
    return res.status(200).json({ success: true, data: items, pagination: { page: p, limit: l, total } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || error });
  }
};

exports.markRead = async (req, res) => {
  try {
    const userId = req._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    const { id } = req.params;
    const updated = await Notification.findOneAndUpdate({ _id: id, user_id: userId }, { read: true }, { new: true }).lean();
    try { emitToUser(userId, "notification:updated", updated); } catch (_) {}
    if (!updated) return res.status(404).json({ success: false, message: "Không tìm thấy thông báo" });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || error });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const userId = req._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    const result = await Notification.updateMany({ user_id: userId, read: false }, { $set: { read: true } });
    try { emitToUser(userId, "notification:read-all", { ok: true }); } catch (_) {}
    return res.status(200).json({ success: true, data: { matched: result.matchedCount ?? result.n, modified: result.modifiedCount ?? result.nModified } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || error });
  }
};

exports.remove = async (req, res) => {
  try {
    const userId = req._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    const { id } = req.params;
    const deleted = await Notification.findOneAndDelete({ _id: id, user_id: userId }).lean();
    try { emitToUser(userId, "notification:deleted", { _id: id }); } catch (_) {}
    if (!deleted) return res.status(404).json({ success: false, message: "Không tìm thấy thông báo" });
    return res.status(200).json({ success: true, data: deleted });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || error });
  }
};

// Helper dùng lại trong các controller khác
exports.createForUser = async (userId, payload) => {
  try {
    if (!userId) return null;
    const { type = "generic", title, message, data = {} } = payload || {};
    if (!title || !message) return null;
    const doc = await Notification.create({ user_id: userId, type, title, message, data });
    try { emitToUser(userId, "notification:new", doc); } catch (_) {}
    return doc;
  } catch (_) {
    return null;
  }
};

// API tạo noti tổng kết kcal 7 ngày dựa trên lịch sử MealPlan (ước lượng theo kế hoạch)
exports.createWeeklyKcalSummary = async (req, res) => {
  try {
    const userId = req._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const plans = await MealPlan.find({ user_id: userId, createdAt: { $gte: sevenDaysAgo } })
      .sort({ createdAt: 1 })
      .lean();
    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: "Chưa có dữ liệu kế hoạch 7 ngày" });
    }
    const summary = plans.map(p => ({
      date: p.createdAt,
      tdee: p.result?.tdee,
      calorieTarget: p.result?.calorieTarget,
      breakdown: p.result?.breakdown,
    }));
    const totalTarget = summary.reduce((acc, it) => acc + (Number(it.calorieTarget) || 0), 0);
    const title = "Tổng kết kế hoạch kcal 7 ngày";
    const message = `Tổng mục tiêu kcal: ${totalTarget} trong ${summary.length} ngày`;
    const doc = await Notification.create({
      user_id: userId,
      type: "weekly_kcal_summary",
      title,
      message,
      data: { days: summary.length, totalTarget, detail: summary },
    });
    return res.status(201).json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || error });
  }
};
