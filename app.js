require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const dbConnect = require("./DB/db");
const routes = require("./router");
const { connectRedis } = require("./services/redis");
var app = express();
// Tin cậy proxy của Render/Heroku để secure cookie hoạt động đúng
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
// Initialize Redis (non-blocking)
connectRedis().catch((err) => console.error("Redis init failed:", err));
var cors = require("cors");
const bodyParser = require("body-parser");
//API only
app.use(logger('dev'));
// Lưu lại rawBody để xác thực chữ ký webhook (PayOS)
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Đăng ký các schema tham chiếu để mongoose biết khi populate
require("./model/meal/ingredient");
require("./model/meal/category");
require("./model/meal/subCategory");

app.use(
  cors({
    // Chỉ định origin cụ thể để bật credential cookie
    origin: (origin, callback) => {
      const allowed = (process.env.CLIENT_URL || process.env.FRONTEND_URL || "").split(","
      ).map(o => o.trim()).filter(Boolean);
      // Cho phép requests không có origin (Postman/cURL) hoặc nằm trong whitelist
      if (!origin || allowed.length === 0 || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// connect DB
dbConnect();
// Swagger UI - API docs at /api/docs
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", routes);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: req.app.get("env") === "development" ? err : {},
    success: false,
  });
});

module.exports = app;
