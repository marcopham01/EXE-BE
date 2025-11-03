var express = require("express");
var router = express.Router();
const auth = require("../middlewares/auth");
const noti = require("../controller/NotificationController");

/**
 * @openapi
 * tags:
 *   - name: notification
 *     description: Notification APIs
 */

/**
 * @openapi
 * /noti:
 *   get:
 *     tags: [notification]
 *     summary: Lấy thông báo của user hiện tại (phân trang)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 10 }
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean, example: false }
 *     responses:
 *       200:
 *         description: Danh sách thông báo
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedNotifications' }
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get(
  "/",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  noti.listMy
);

/**
 * @openapi
 * /noti:
 *   post:
 *     tags: [notification]
 *     summary: Tạo thông báo thủ công cho chính user hiện tại
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateNotificationRequest' }
 *     responses:
 *       201:
 *         description: Tạo thông báo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Notification' }
 *       400:
 *         description: Thiếu title hoặc message
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               missing:
 *                 value: { success: false, message: 'Thiếu title hoặc message' }
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  "/",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  noti.create
);

/**
 * @openapi
 * /noti/read-all:
 *   patch:
 *     tags: [notification]
 *     summary: Đánh dấu đã đọc tất cả thông báo
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Đã đánh dấu tất cả là đã đọc
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.patch(
  "/read-all",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  noti.markAllRead
);

/**
 * @openapi
 * /noti/{id}/read:
 *   patch:
 *     tags: [notification]
 *     summary: Đánh dấu đã đọc 1 thông báo
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Đã đánh dấu đã đọc
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Notification' }
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Không tìm thấy thông báo
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               notFound:
 *                 value: { success: false, message: 'Không tìm thấy thông báo' }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.patch(
  "/:id/read",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  noti.markRead
);

/**
 * @openapi
 * /noti/{id}:
 *   delete:
 *     tags: [notification]
 *     summary: Xóa 1 thông báo của chính user hiện tại
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Đã xóa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Notification' }
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Không tìm thấy thông báo
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.delete(
  "/:id",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  noti.remove
);

/**
 * @openapi
 * /noti/weekly-kcal:
 *   post:
 *     tags: [notification]
 *     summary: Tạo thông báo tổng kết kcal 7 ngày dựa trên MealPlan lịch sử
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       201:
 *         description: Đã tạo thông báo tổng kết
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Notification' }
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Chưa có dữ liệu kế hoạch 7 ngày
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               noData:
 *                 value: { success: false, message: 'Chưa có dữ liệu kế hoạch 7 ngày' }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  "/weekly-kcal",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  noti.createWeeklyKcalSummary
);

module.exports = router;
