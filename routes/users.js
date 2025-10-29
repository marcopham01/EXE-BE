var express = require("express");
var router = express.Router();
const user = require("../controller/UserController");
const auth = require("../middlewares/auth");

router.post("/register", user.registerUser);
router.post("/login", user.login);
router.get(
  "/getprofile",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  user.getProfileUser
);
router.get("/getallprofile", user.getAllProfileUsers);

module.exports = router;