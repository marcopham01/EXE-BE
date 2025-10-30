const Payment = require("../model/payment");
const User = require("../model/user");
const { PayOS } = require("@payos/node");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

/**
 * Tạo đơn thanh toán cho gói tháng hoặc dùng thử.
 * Chỉ cho phép 'monthly' và 'trial'.
 */
exports.createPaymentLink = async (req, res) => {
  try {
    const { amount, premium_package_type } = req.body;
    const userId = req._id?.toString();
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập", success: false });
    // Chỉ nhận 'monthly' hoặc 'trial'
    let description = "";
    if (premium_package_type === "trial") description = "Dùng thử 3 ngày miễn phí";
    else if (premium_package_type === "monthly") description = "Đăng ký gói tháng";
    else {
      return res.status(400).json({ message: "Loại gói chỉ được phép là monthly hoặc trial", success: false });
    }
    // Gói dùng thử
    if (premium_package_type === "trial") {
      const trialExpiredAt = new Date(Date.now() + 3*24*60*60*1000); // 3 ngày
      const paymentData = {
        order_code: parseInt(Date.now().toString() + Math.floor(Math.random() * 1000)),
        amount: 0,
        description,
        premium_package_type,
        user_id: userId,
        status: "paid",
        checkout_url: null,
        qr_code: null,
        expiredAt: trialExpiredAt,
      };
      const payment = await new Payment(paymentData).save();
      return res.status(201).json({
        message: "Kích hoạt dùng thử thành công!",
        success: true,
        data: {
          ...paymentData,
          payment_id: payment._id,
        }
      });
    }
    // Gói tháng: phải có amount > 0
    // Chuẩn bị & gọi PayOS
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user", success: false });
    }
    // Tính giá theo nghề nghiệp (enum từ model User)
    const isStudent = user.job === "Học sinh" || user.job === "Sinh viên";
    const finalAmount = isStudent ? 19000 : 29000;
    const order_code = parseInt(Date.now().toString() + Math.floor(Math.random() * 1000));
    const paymentDataForPayOS = {
      orderCode: order_code,
      amount: finalAmount,
      description,
      items: [{ name: description, quantity: 1, price: finalAmount }],
      returnUrl: `${process.env.BASE_URL}/api/payment/success?order_code=${order_code}`,
      cancelUrl: `${process.env.BASE_URL}/api/payment/cancel?order_code=${order_code}`,
    };
    const paymentLinkResponse = await payOS.paymentRequests.create(paymentDataForPayOS);
    const paymentData = {
      order_code: order_code,
      amount: finalAmount,
      description,
      premium_package_type: premium_package_type,
      user_id: user._id,
      status: "pending",
      checkout_url: paymentLinkResponse.checkoutUrl,
      qr_code: paymentLinkResponse.qrCode,
      expiredAt: new Date(Date.now() + 15 * 60 * 1000),
    };
    const payment = await new Payment(paymentData).save();
    return res.status(201).json({
      message: "Tạo link thanh toán thành công",
      success: true,
      data: {
        payment_id: payment._id,
        order_code,
        premium_package_type,
        amount: finalAmount,
        description,
        checkout_url: paymentLinkResponse.checkoutUrl,
        qr_code: paymentLinkResponse.qrCode,
        customer_info: {
          user_id: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
          job: user.job,
          age: user.age,
        },
        expiredAt: payment.expiredAt,
      },
    });
  } catch (error) {
    console.error("Create payment link error:", error);
    return res.status(500).json({ message: "Lỗi tạo link thanh toán", error: error.message, success: false });
  }
};

/**
 * Cập nhật trạng thái thanh toán
 * Chỉ cho phép các trạng thái: pending, paid, cancelled, failed
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { order_code, status } = req.body;
    // Kiểm tra đầy đủ dữ liệu
    if (!order_code || !status) {
      return res.status(400).json({ message: "Thiếu order_code hoặc status", success: false });
    }
    // Bộ các trạng thái hợp lệ
    const validStatuses = ["pending", "paid", "cancelled", "failed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ", success: false });
    }
    // Tìm bản ghi cần cập nhật
    const payment = await Payment.findOne({ order_code: parseInt(order_code) });
    if (!payment) {
      return res.status(404).json({ message: "Không tìm thấy thanh toán", success: false });
    }
    // Cập nhật trạng thái
    payment.status = status;
    if (status === "paid") {
      // Thêm 3 ngày bonus cho gói monthly
      let extraDays = 0;
      if (payment.premium_package_type === "monthly") extraDays = 30 + 3; // 30 ngày + 3 ngày trial bonus
      if (payment.premium_package_type === "trial") extraDays = 3;
      const now = new Date();
      let oldExpired = payment.expiredAt || now;
      if (oldExpired < now) oldExpired = now;
      payment.expiredAt = new Date(oldExpired.getTime() + extraDays * 24 * 60 * 60 * 1000);
      payment.paid_at = now;
    }
    await payment.save();
    console.log(`Đã cập nhật trạng thái: ${order_code} -> ${status}`);
    // Trả về thông tin cập nhật
    return res.status(200).json({
      message: "Đã cập nhật trạng thái thành công",
      success: true,
      data: {
        payment_id: payment._id,
        order_code,
        status,
        premium_package_type: payment.premium_package_type,
        expiredAt: payment.expiredAt,
        updated_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    return res.status(500).json({ message: "Lỗi cập nhật trạng thái thanh toán", error: error.message, success: false });
  }
};

/**
 * Xử lý redirect khi thanh toán thành công (PayOS trả về)
 * Trả về giao diện frontend với tham số order_code
 */
exports.paymentSuccess = async (req, res) => {
  try {
    const { order_code } = req.query;
    if (!order_code) {
      return res.status(400).json({ message: "Thiếu order_code", success: false });
    }
    // In log cho dev
    console.log(`Thanh toán thành công: ${order_code}`);
    // Redirect về frontend (chỉnh link theo môi trường thực tế)
    const frontendUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/success?order_code=${order_code}`;
    return res.redirect(frontendUrl);
  } catch (error) {
    console.error("Payment success error:", error);
    return res.status(500).json({ message: "Lỗi xử lý thanh toán thành công", error: error.message, success: false });
  }
};

/**
 * Xử lý redirect khi thanh toán bị hủy
 */
exports.paymentCancel = async (req, res) => {
  try {
    const { order_code } = req.query;
    if (!order_code) {
      return res.status(400).json({ message: "Thiếu order_code", success: false });
    }
    console.log(`Thanh toán bị hủy: ${order_code}`);
    const frontendUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/cancel?order_code=${order_code}`;
    return res.redirect(frontendUrl);
  } catch (error) {
    console.error("Payment cancel error:", error);
    return res.status(500).json({ message: "Lỗi xử lý hủy thanh toán", error: error.message, success: false });
  }
};

/**
 * API lấy lịch sử giao dịch premiumMembership của chính user hiện tại
 * Có hỗ trợ phân trang
 */
exports.getMyTransactions = async (req, res) => {
  try {
    const userId = req._id?.toString();
    const { page = 1, limit = 10, status } = req.query;
    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập", success: false });
    }
    // Validate phân trang
    const { page: validatedPage, limit: validatedLimit } = validatePagination(page, limit);
    // Tạo query lọc
    const query = { user_id: userId };
    if (status) query.status = status;
    // Đếm tổng số giao dịch
    const total = await Payment.countDocuments(query);
    const pagination = createPagination(validatedPage, validatedLimit, total);
    // Lấy danh sách giao dịch
    const transactions = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();
    // Đóng gói trả về dạng phân trang
    const response = createPaginatedResponse(
      transactions,
      pagination,
      "Lấy danh sách giao dịch thành công"
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error("Get my transactions error:", error);
    return res.status(500).json({ message: "Lỗi lấy danh sách transactions", error: error.message, success: false });
  }
};