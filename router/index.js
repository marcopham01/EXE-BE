const express = require("express");
const router = express.Router();

const userRouter = require("../routes/users");
const mealRouter = require("../routes/meal");

router.use("/users", userRouter);
router.use("/meal", mealRouter);

module.exports = router;