var express = require("express");
var router = express.Router();
const meal = require("../controller/MealController");
const auth = require("../middlewares/auth");

/**
 * @openapi
 * tags:
 *   - name: meal
 *     description: Meal endpoints
 */

/**
 * @openapi
 * /meal/getallmeal:
 *   get:
 *     tags: [meal]
 *     summary: Lấy tất cả món ăn
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách món ăn
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedMeals' }
 *       500:
 *         description: Lỗi máy chủ
 */
router.get("/getallmeal",
    auth.authMiddleWare,
    auth.requireRole("admin","customer"),
    meal.getAllMeal);
/**
 * @openapi
 * /meal/getmealbyid/{id}:
 *   get:
 *     tags: [meal]
 *     summary: Lấy chi tiết món ăn theo id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin món ăn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: 'Meal found successfully' }
 *                 success: { type: boolean, example: true }
 *                 error: { type: boolean, example: false }
 *                 data: { $ref: '#/components/schemas/Meal' }
 *       404:
 *         description: Không tìm thấy
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               notFound:
 *                 value: { success: false, error: true, message: 'Meal not found' }
 *       500:
 *         description: Lỗi máy chủ
 */
router.get("/getmealbyid/:id",
    auth.authMiddleWare,
    auth.requireRole("admin","customer"),
    meal.getMealById);

// Premium: khuyến nghị theo BMI
/**
 * @openapi
 * /meal/recommendation/bmi:
 *   post:
 *     tags: [meal]
 *     summary: Gợi ý thực đơn theo BMI cho user hiện tại
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               heightCm: { type: number, example: 170 }
 *               weightKg: { type: number, example: 65 }
 *               activityLevel: { type: string, example: 'Vận động vừa phải' }
 *               goal: { type: string, example: 'Giảm cân' }
 *     responses:
 *       200:
 *         description: Danh sách gợi ý và kế hoạch bữa ăn
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
 *                     bmi: { type: number }
 *                     bmiClass: { type: string }
 *                     bmr: { type: number }
 *                     tdee: { type: number }
 *                     calorieTarget: { type: number }
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         breakfast: { type: number }
 *                         lunch: { type: number }
 *                         dinner: { type: number }
 *                     dietType: { type: string }
 *                     meals: { type: object }
 *       400:
 *         description: Thiếu/không hợp lệ đầu vào
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               missingBody:
 *                 value: { success: false, message: 'Thiếu chiều cao hoặc cân nặng' }
 *               invalidLevel:
 *                 value: { success: false, message: "activityLevel chỉ được phép: 'Ít vận động' | 'Vận động vừa phải' | 'Vận động nhiều'" }
 *               invalidGoal:
 *                 value: { success: false, message: "goal chỉ được phép: 'Giảm cân' | 'Duy trì cân nặng' | 'Tăng cân'" }
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       402:
 *         description: Premium required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               premium:
 *                 value: { success: false, message: 'Tính năng Premium: gói đã hết hạn hoặc chưa kích hoạt' }
 *       500:
 *         description: Lỗi máy chủ
 */
router.post("/recommendation/bmi",
    auth.authMiddleWare,
    auth.requireRole("customer","admin"),
    meal.recommendMealsByBMI);

// Lịch sử và bản mới nhất
router.get("/recommendation/history",
    auth.authMiddleWare,
    auth.requireRole("customer","admin"),
    meal.getMealPlanHistory);
/**
 * @openapi
 * /meal/recommendation/latest:
 *   get:
 *     tags: [meal]
 *     summary: Lấy bản kế hoạch bữa ăn mới nhất của user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bản kế hoạch mới nhất
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/MealPlan' }
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Chưa có kế hoạch nào
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
 */
router.get("/recommendation/latest",
    auth.authMiddleWare,
    auth.requireRole("customer","admin"),
    meal.getLatestMealPlan);

// Admin routes
router.post("/createmeal",
    auth.authMiddleWare,
    auth.requireRole("admin"),
    meal.createMeal);
/**
 * @openapi
 * /meal/createmeal:
 *   post:
 *     tags: [meal]
 *     summary: Tạo món ăn (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MealCreateRequest'
 *     responses:
 *       201:
 *         description: Tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 success: { type: boolean }
 *                 error: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Meal' }
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Chưa đăng nhập hoặc thiếu quyền
 *       500:
 *         description: Lỗi máy chủ
 */
router.put("/updatemeal/:id",
    auth.authMiddleWare,
    auth.requireRole("admin"),
    meal.updateMeal);
/**
 * @openapi
 * /meal/updatemeal/{id}:
 *   put:
 *     tags: [meal]
 *     summary: Cập nhật món ăn (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
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
 *                 error: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Meal' }
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Không tìm thấy
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
 */
router.delete("/deletemeal/:id",
    auth.authMiddleWare,
    auth.requireRole("admin"),
    meal.deleteMeal);
/**
 * @openapi
 * /meal/deletemeal/{id}:
 *   delete:
 *     tags: [meal]
 *     summary: Xóa món ăn (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đã xóa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 success: { type: boolean }
 *                 error: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Meal' }
 *       404:
 *         description: Không tìm thấy
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
 */

module.exports = router;