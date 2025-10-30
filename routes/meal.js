var express = require("express");
var router = express.Router();
const meal = require("../controller/MealController");
const auth = require("../middlewares/auth");

router.get("/getallmeal",
    auth.authMiddleWare,
    auth.requireRole("admin","customer"),
    meal.getAllMeal);
router.get("/getmealbyid/:id",
    auth.authMiddleWare,
    auth.requireRole("admin","customer"),
    meal.getMealById);

// Admin routes
router.post("/createmeal",
    auth.authMiddleWare,
    auth.requireRole("admin"),
    meal.createMeal);
router.put("/updatemeal/:id",
    auth.authMiddleWare,
    auth.requireRole("admin"),
    meal.updateMeal);
router.delete("/deletemeal/:id",
    auth.authMiddleWare,
    auth.requireRole("admin"),
    meal.deleteMeal);

module.exports = router;