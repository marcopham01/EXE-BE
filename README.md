# EXE-BE

## AI: Nhận diện nguyên liệu từ ảnh (Gemini)

POST `/api/ai/ingredients-from-image`

Form-data:

- `image` (file) hoặc `imageUrl` (string)
- `userId` (tùy chọn, để áp dụng premiumMembership)
- `heightCm`, `weightKg` hoặc `bmi` (tùy chọn cho lọc BMI nếu user premium)

Response ví dụ:

```
{
  "success": true,
  "ingredientsDetected": ["trứng", "cà chua"],
  "matchedIngredients": [{ "_id": "...", "name": "Trứng", "unit": "quả", "type": "meat" }],
  "meals": [{ "_id": "...", "name": "Trứng sốt cà chua", "dietType": "Eat clean" }]
}
```

Cấu hình .env:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_key
GEMINI_MODEL=gemini-1.5-flash
```
