var express = require("express");
var router = express.Router();
const auth = require("../middlewares/auth");
const payment = require("../controller/PaymentController");
const verifyPayOS = require("../middlewares/payOS");

/**
 * @openapi
 * tags:
 *   - name: payment
 *     description: Payment and premium membership
 */

// Premium membership payment:
/**
 * @openapi
 * /payment/create:
 *   post:
 *     tags: [payment]
 *     summary: Tạo đơn thanh toán premium (PayOS)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Trả về link thanh toán
 */
router.post("/create",
    auth.authMiddleWare,
    auth.requireRole("customer"),
    payment.createPaymentLink
); // Tạo đơn thanh toán, trả về link/transactionId
/**
 * @openapi
 * /payment/update-status:
 *   post:
 *     tags: [payment]
 *     summary: Cập nhật trạng thái thanh toán
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/update-status",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  payment.updatePaymentStatus
);
/**
 * @openapi
 * /payment/success:
 *   get:
 *     tags: [payment]
 *     summary: Redirect sau khi thanh toán thành công
 */
router.get("/success", payment.paymentSuccess);
/**
 * @openapi
 * /payment/cancel:
 *   get:
 *     tags: [payment]
 *     summary: Redirect khi thanh toán bị hủy
 */
router.get("/cancel", payment.paymentCancel);
/**
 * @openapi
 * /payment/history:
 *   get:
 *     tags: [payment]
 *     summary: Lấy lịch sử giao dịch premium của user hiện tại
 *     security:
 *       - bearerAuth: []
 */
router.get(
  	"/history",
  	auth.authMiddleWare,
  	auth.requireRole("customer", "admin"),
  	payment.getMyTransactions
); // Lấy lịch sử giao dịch premium cho user

// Webhook từ PayOS: KHÔNG yêu cầu auth, có xác thực chữ ký nếu header tồn tại
/**
 * @openapi
 * /payment/webhook:
 *   post:
 *     tags: [payment]
 *     summary: Webhook từ PayOS (không yêu cầu auth)
 */
router.post("/webhook", verifyPayOS, payment.payOSWebhook)

module.exports = router;