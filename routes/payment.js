var express = require("express");
var router = express.Router();
const auth = require("../middlewares/auth");
const payment = require("../controller/PaymentController");
const verifyPayOS = require("../middlewares/payOS");


// Premium membership payment:
router.post("/create",
    auth.authMiddleWare,
    auth.requireRole("customer"),
    payment.createPaymentLink
); // Tạo đơn thanh toán, trả về link/transactionId
router.post(
  "/update-status",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  payment.updatePaymentStatus
);
router.get("/success", payment.paymentSuccess);
router.get("/cancel", payment.paymentCancel);
router.get(
  	"/history",
  	auth.authMiddleWare,
  	auth.requireRole("customer", "admin"),
  	payment.getMyTransactions
); // Lấy lịch sử giao dịch premium cho user

// Webhook từ PayOS: KHÔNG yêu cầu auth, có xác thực chữ ký nếu header tồn tại
router.post("/webhook", verifyPayOS, payment.payOSWebhook)

module.exports = router;