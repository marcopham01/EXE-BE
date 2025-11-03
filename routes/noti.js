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
 */
router.post(
  "/weekly-kcal",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  noti.createWeeklyKcalSummary
);

module.exports = router;
