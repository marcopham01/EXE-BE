// controller/UserController.js
var User = require("../model/user");
var bryctjs = require("bcryptjs");
var jwt = require("jsonwebtoken");
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
    return res.status(201).json({ status: true, accessToken, refreshToken });
  } catch (error) {
    return res.status(401).json({
      message: error.message || error,
      error: true,
      success: false,
    });
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