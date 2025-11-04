# Deploy nhanh lên Render (Web Service - Node.js)

## 1) Điều kiện

- Repo đã push lên GitHub/GitLab.
- Đã có `package.json` với script `start: node ./bin/www`.
- Không hardcode port; app lắng nghe `process.env.PORT` (đã OK).

## 2) Tạo dịch vụ trên Render

- Render → New → Web Service → Chọn repo.
- Runtime: Node 18/20 LTS, Region gần VN.
- Build Command: `npm install`
- Start Command: `npm start`

## 3) Thiết lập biến môi trường

Thiết lập trong Render → Service → Environment → Add Environment Variable:

- `MONGO_URI`: chuỗi MongoDB Atlas
- `REDIS_URL`: chuỗi Redis (Render Redis/Upstash)
- `SECRET_KEY`, `REFRESH_KEY`: JWT secrets
- `GOOGLE_GENERATIVE_AI_API_KEY` (hoặc `GEMINI_API_KEY`), `GEMINI_MODEL=gemini-1.5-flash`
- `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`
- `BACKEND_BASE_URL`: URL của service sau khi deploy (ví dụ `https://exe201-be.onrender.com`)
- `FRONTEND_URL`: domain FE (ví dụ `https://your-fe.app`)
- `CLIENT_URL`: danh sách origin FE cho CORS, phân tách bằng dấu phẩy (ví dụ `https://your-fe.app,https://staging-your-fe.app`)
- `APP_DEEPLINK`: nếu có

Lưu ý: Project có dùng Redis nên `REDIS_URL` bắt buộc.

## 4) Deploy

- Nhấn Create Web Service → đợi build & deploy xong.
- Test: gọi `GET https://<render-url>/api/meal/...` hoặc `POST /api/users/login`.
- Xem log: Render → Service → Logs.

## 5) IaC (tuỳ chọn) bằng render.yaml

File `render.yaml` đã được thêm ở root. Bạn có thể dùng “Blueprints” của Render để provision tự động.

---

## Mẹo

- Free plan có cold start: lần gọi đầu chậm, FE nên retry 1-2 lần.
- Bảo mật: chỉ đặt secrets trong Render Env, không commit `.env`.

### Cookie & CORS (quan trọng cho đăng nhập)

- Server đã cấu hình `sameSite: 'none'` (prod) và `secure: true` để chạy trên HTTPS của Render.
- Cần đặt `CLIENT_URL` (hoặc `FRONTEND_URL`) đúng domain FE để bật `credentials: true` trong CORS.
- Nếu dùng proxy/CDN, Render là proxy → server đã `app.set('trust proxy', 1)`.
- Khi test Postman: có thể gửi thành công mà không có `origin`, nhưng FE phải gọi với `fetch`/`axios` kèm `withCredentials: true`.
