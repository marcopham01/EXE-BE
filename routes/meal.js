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
 *               bmi: { type: number, example: 22.5 }
 *     responses:
 *       200:
 *         description: Danh sách gợi ý và kế hoạch bữa ăn
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
 *             type: object
 *             properties:
 *               name: { type: string }
 *               dietType: { type: string, example: "Eat clean" }
 *               ingredients: { type: array, items: { type: string } }
 *               calories: { type: number }
 *     responses:
 *       201:
 *         description: Tạo thành công
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
 */

module.exports = router;