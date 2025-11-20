// controller/UserController.js
var User = require("../model/user");
const Payment = require("../model/payment");
var bryctjs = require("bcryptjs");
var jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { cacheGet, cacheSet, cacheDel } = require("../services/redis");
const crypto = require("crypto");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

exports.registerUser = async (req, res) => {
  try {
    const { username, password, phoneNumber, email, fullName, gender, birthDate, job } = req.body;

    // Kiểm tra trùng username
    const checkuserName = await User.findOne({ username }).lean();
    if (checkuserName) {
      return res.status(400).json({ message: "Please Create New UserName", success: false });
    }
    // Kiểm tra trùng fullName
    const checkfullName = await User.findOne({ fullName }).lean();
    if (checkfullName) {
      return res.status(400).json({ message: "Please Create New Full Name", success: false });
    }
    // Validate tuổi 13-120 (trước khi lưu để báo lỗi rõ ràng cho client)
    const dob = new Date(birthDate);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({ message: "birthDate invalid", success: false });
    }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age < 13 || age > 120) {
      return res.status(400).json({ message: "Tuổi phải từ 13 đến 120", success: false });
    }

    // Validate job theo enum trong model
    const allowedJobs = ["Học sinh", "Sinh viên", "Đã đi làm"];
    if (!allowedJobs.includes(job)) {
      return res.status(400).json({ message: "job must be one of: Học sinh, Sinh viên, Đã đi làm", success: false });
    }

    const salt = await bryctjs.genSalt(10);
    const hashPassword = await bryctjs.hash(password, salt);

    const payload = { username, password: hashPassword, phoneNumber, email, fullName, gender, birthDate: dob, job };
    const newUser = await new User(payload).save();

    // BUST CACHE sau khi ghi
    await cacheDel("users:all");
    await cacheDel(`users:${newUser._id}`);

    return res.status(201).json({
      message: "User register successfully",
      error: false,
      success: true,
      data: {
        username: newUser.username,
        phonenumber: newUser.phoneNumber,
        email: newUser.email,
        fullname: newUser.fullName,
        gender: newUser.gender,
        job: newUser.job,
        birthDate: newUser.birthDate,
        age: newUser.age,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false });
  }
};

exports.login = async (req, res) => {
  const secretKey = process.env.SECRET_KEY;
  const refreshKey = process.env.REFRESH_KEY;
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found", error: false, success: false });
    }

    const checkPassword = await bryctjs.compare(password, user.password);
    if (!checkPassword) {
      return res
        .status(400)
        .json({ message: "Password Incorect", error: false, success: false });
    }

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      secretKey,
      { expiresIn: "1h" }
    );
    const refreshToken = jwt.sign({ userId: user._id }, refreshKey, {
      expiresIn: "1d",
    });
    // Lưu refreshToken vào HttpOnly cookie (xoay bảo mật theo môi trường)
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd, // cần HTTPS ở production
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1d
      path: "/",
    });

    return res.status(201).json({ status: true, accessToken, refreshToken });
  } catch (error) {
    return res.status(401).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};

// Phát hành accessToken mới bằng refreshToken
exports.refresh = async (req, res) => {
  try {
    const secretKey = process.env.SECRET_KEY;
    const refreshKey = process.env.REFRESH_KEY;

    // Ưu tiên lấy từ cookie HttpOnly nếu có, fallback về body
    const providedToken =
      req.cookies?.refreshToken || req.body?.refreshToken || "";
    if (!providedToken) {
      return res
        .status(400)
        .json({ message: "Missing refreshToken", success: false });
    }

    // Xác thực refreshToken
    let payload;
    try {
      payload = jwt.verify(providedToken, refreshKey);
    } catch (e) {
      return res
        .status(401)
        .json({ message: "Invalid refreshToken", success: false });
    }

    // Lấy thông tin user tối thiểu để nhúng vào accessToken
    const user = await User.findById(payload.userId).select("username").lean();
    if (!user) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    // Cấp accessToken mới và xoay refreshToken (tăng an toàn)
    const accessToken = jwt.sign(
      { userId: payload.userId, username: user.username },
      secretKey,
      { expiresIn: "1h" }
    );
    const newRefreshToken = jwt.sign({ userId: payload.userId }, refreshKey, {
      expiresIn: "1d",
    });

    // Cập nhật cookie HttpOnly cho refreshToken mới
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res
      .status(200)
      .json({ success: true, accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || error, success: false });
  }
};

exports.getProfileUser = async (req, res) => {
  const userId = req._id?.toString();
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const key = `users:${userId}`;
  try {
    const cached = await cacheGet(key);
    if (cached) return res.status(200).json({ user: cached });

    const user = await User.findById(userId)
      .select("-password -verifyToken -verifyTokenExpires")
      .lean();
    if (!user) return res.status(404).json({ message: "Not found profile" });

    await cacheSet(key, user, 300);
    return res.status(201).json({ user });
  } catch (e) {
    return res.status(500).json({ message: "Server Error", error: e.message });
  }
};

exports.getAllProfileUsers = async (req, res) => {
  try {
    const { role, id, page = 1, limit = 10 } = req.query;

    const { page: validatedPage, limit: validatedLimit } = validatePagination(
      page,
      limit
    );
    const query = {};
    if (id) {
      query._id = id;
    } else {
      query.role = role || "customer";
    }
    const cacheKey = `users:all:${
      id ? `id:${id}` : `role:${role || "customer"}`
    }:${validatedPage}:${validatedLimit}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const total = await User.countDocuments(query);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const users = await User.find(query)
      .select(
        "-password -verifyToken -verifyTokenExpires -resetToken -resetTokenExpires"
      )
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
      users,
      pagination,
      "Lấy danh sách users thành công"
    );

    await cacheSet(cacheKey, response, 120);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get all profile users error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách users",
      error: error.message,
      success: false,
    });
  }
};

// Xóa tài khoản của chính mình
exports.deleteMe = async (req, res) => {
  try {
    const userId = req._id?.toString();
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    // Xóa các Payment liên quan tới user
    await Payment.deleteMany({ user_id: userId });

    // Xóa User
    await User.findByIdAndDelete(userId);

    // Dọn cache liên quan
    try {
      await cacheDel(`users:${userId}`);
      await cacheDel("users:all");
    } catch (e) {
      // bỏ qua lỗi cache để không chặn luồng xóa chính
    }

    return res.json({ success: true, message: "Đã xóa tài khoản" });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Lỗi xóa tài khoản", error: e.message, success: false });
  }
};

// Admin xóa tài khoản bất kỳ (chỉ cho role customer)
exports.deleteUserByAdmin = async (req, res) => {
  try {
    const targetUserId = req.params?.id;
    const adminId = req._id?.toString();

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "Thiếu userId cần xóa" });
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: "userId không hợp lệ" });
    }

    if (adminId && adminId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Không thể tự xóa qua endpoint admin, dùng /users/delete nếu cần",
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy user" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Không thể xóa tài khoản admin" });
    }

    await Payment.deleteMany({ user_id: targetUserId });
    await User.findByIdAndDelete(targetUserId);

    try {
      await cacheDel(`users:${targetUserId}`);
      await cacheDel("users:all");
    } catch (err) {
      // bỏ qua lỗi cache
    }

    return res.status(200).json({
      success: true,
      message: "Admin đã xóa user thành công",
      data: { deletedUserId: targetUserId },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Lỗi admin xóa user", error: error.message });
  }
};

// Helper: Tính đầu tuần (Thứ 2) và cuối tuần (Chủ nhật)
function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
  const diff = day === 0 ? -6 : 1 - day; // Nếu Chủ nhật thì lùi 6 ngày, nếu không thì về Thứ 2
  
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return { startOfWeek, endOfWeek };
}

// Helper: Format ngày thành DD/MM
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

// Helper: Kiểm tra user có premium active không
async function isPremiumActive(userId) {
  const now = new Date();
  // Ưu tiên Payment còn hạn
  const paid = await Payment.findOne({ 
    user_id: userId, 
    status: "paid", 
    expiredAt: { $gt: now } 
  })
    .sort({ expiredAt: -1 })
    .lean();
  if (paid) return true;
  // Fallback: dựa vào field trên User để test nhanh
  const u = await User.findById(userId)
    .select("premiumMembership premiumMembershipExpires")
    .lean();
  if (u?.premiumMembership && u?.premiumMembershipExpires && new Date(u.premiumMembershipExpires) > now) {
    return true;
  }
  return false;
}

// Thống kê user theo free/premium cho biểu đồ
exports.getUserStats = async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const validPeriods = ["week", "month", "year"];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: "period phải là 'week', 'month' hoặc 'year'",
      });
    }

    const now = new Date();
    const mongoose = require("mongoose");

    // Tính toán thời gian bắt đầu dựa trên period
    let startDate;
    let dateFormat;
    let dateGroup;

    if (period === "week") {
      // 12 tuần gần nhất
      startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
      dateFormat = {
        year: { $year: "$createdAt" },
        week: { $week: "$createdAt" },
      };
      dateGroup = {
        $concat: [
          { $toString: { $year: "$createdAt" } },
          "-W",
          { $toString: { $week: "$createdAt" } },
        ],
      };
    } else if (period === "month") {
      // 12 tháng gần nhất
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      dateFormat = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
      dateGroup = {
        $concat: [
          { $toString: { $year: "$createdAt" } },
          "-",
          { $toString: { $month: "$createdAt" } },
        ],
      };
    } else {
      // 5 năm gần nhất
      startDate = new Date(now.getFullYear() - 5, 0, 1);
      dateFormat = { year: { $year: "$createdAt" } };
      dateGroup = { $toString: { $year: "$createdAt" } };
    }

    // Lấy tất cả Payment active để xác định premium users
    const activePayments = await Payment.find({
      status: "paid",
      expiredAt: { $gt: now },
    })
      .select("user_id")
      .lean();

    const premiumUserIds = new Set(
      activePayments.map((p) => p.user_id.toString())
    );

    // Lấy tất cả user có premiumMembership active
    const premiumUsersFromField = await User.find({
      role: "customer",
      premiumMembership: true,
      premiumMembershipExpires: { $gt: now },
    })
      .select("_id")
      .lean();

    premiumUsersFromField.forEach((u) => {
      premiumUserIds.add(u._id.toString());
    });

    // Thống kê tổng quan (không theo thời gian)
    const allUsers = await User.find({ role: "customer" }).select("_id").lean();
    const total = allUsers.length;
    let premiumCount = 0;
    for (const user of allUsers) {
      if (premiumUserIds.has(user._id.toString())) {
        premiumCount++;
      }
    }
    const freeCount = total - premiumCount;
    const freePercentage =
      total > 0 ? Number(((freeCount / total) * 100).toFixed(2)) : 0;
    const premiumPercentage =
      total > 0 ? Number(((premiumCount / total) * 100).toFixed(2)) : 0;

    // Thống kê theo thời gian (group theo period)
    // Lấy tất cả users trong khoảng thời gian
    const usersInPeriod = await User.find({
      role: "customer",
      createdAt: { $gte: startDate },
    })
      .select("_id createdAt")
      .lean();

    // Group users theo period và tính premium/free
    const periodMap = new Map();

    for (const user of usersInPeriod) {
      const createdAt = new Date(user.createdAt);
      let periodKey;
      let sortKey; // Để sort theo thời gian thực

      if (period === "week") {
        const { startOfWeek, endOfWeek } = getWeekRange(createdAt);
        const year = startOfWeek.getFullYear();
        // Format: "20/11 - 26/11/2025" (khoảng ngày trong tuần)
        periodKey = `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}/${year}`;
        // Sort key: timestamp của đầu tuần
        sortKey = startOfWeek.getTime();
      } else if (period === "month") {
        const year = createdAt.getFullYear();
        const month = createdAt.getMonth() + 1;
        // Format: "Tháng 11/2025"
        periodKey = `Tháng ${month}/${year}`;
        // Sort key: YYYYMM
        sortKey = year * 100 + month;
      } else {
        const year = createdAt.getFullYear();
        // Format: "Năm 2025"
        periodKey = `Năm ${year}`;
        // Sort key: năm
        sortKey = year;
      }

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, { total: 0, premium: 0, free: 0, sortKey });
      }

      const stats = periodMap.get(periodKey);
      stats.total++;
      
      if (premiumUserIds.has(user._id.toString())) {
        stats.premium++;
      } else {
        stats.free++;
      }
    }

    // Convert map to array và sort theo thời gian thực
    const chartData = Array.from(periodMap.entries())
      .map(([period, stats]) => ({
        period,
        free: stats.free,
        premium: stats.premium,
        total: stats.total,
        sortKey: stats.sortKey,
      }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ sortKey, ...rest }) => rest); // Bỏ sortKey khỏi response

    return res.status(200).json({
      success: true,
      data: {
        pieChart: {
          free: {
            count: freeCount,
            percentage: freePercentage,
          },
          premium: {
            count: premiumCount,
            percentage: premiumPercentage,
          },
        },
        barChart: {
          free: freeCount,
          premium: premiumCount,
        },
        total: total,
        timeSeries: chartData,
        period: period,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy thống kê user",
      error: error.message,
    });
  }
};