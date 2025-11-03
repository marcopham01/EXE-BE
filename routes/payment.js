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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreatePaymentRequest' }
 *     responses:
 *       201:
 *         description: Trả về link thanh toán
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment_id: { type: string }
 *                     order_code: { type: integer }
 *                     premium_package_type: { type: string, enum: ['monthly','trial'] }
 *                     amount: { type: number }
 *                     description: { type: string }
 *                     checkout_url: { type: string }
 *                     qr_code: { type: string }
 *                     expiredAt: { type: string, format: date-time }
 *       400:
 *         description: Dữ liệu không hợp lệ (loại gói…)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Không tìm thấy user
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdatePaymentStatusRequest' }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment_id: { type: string }
 *                     order_code: { type: integer }
 *                     status: { type: string }
 *                     premium_package_type: { type: string }
 *                     expiredAt: { type: string, format: date-time }
 *                     updated_at: { type: string, format: date-time }
 *       400:
 *         description: Thiếu/không hợp lệ order_code/status
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Không tìm thấy thanh toán
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
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
 *     responses:
 *       200:
 *         description: Trang HTML thông báo thành công hoặc redirect
 *       400:
 *         description: Thiếu order_code
 *       500:
 *         description: Lỗi máy chủ
 */
router.get("/success", payment.paymentSuccess);
/**
 * @openapi
 * /payment/cancel:
 *   get:
 *     tags: [payment]
 *     summary: Redirect khi thanh toán bị hủy
 *     responses:
 *       200:
 *         description: Trang HTML thông báo hủy hoặc redirect
 *       400:
 *         description: Thiếu order_code
 *       500:
 *         description: Lỗi máy chủ
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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: ['pending','paid','cancelled','failed'] }
 *     responses:
 *       200:
 *         description: Danh sách giao dịch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedPayments' }
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
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
 *     responses:
 *       200:
 *         description: Đã nhận webhook
 *       500:
 *         description: Lỗi máy chủ
 */
router.post("/webhook", verifyPayOS, payment.payOSWebhook)

module.exports = router;