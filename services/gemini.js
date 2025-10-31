const { GoogleGenerativeAI } = require("@google/generative-ai");

// Service gọi Gemini để nhận diện nguyên liệu từ ảnh
// Input: Buffer ảnh hoặc URL
// Output: mảng tên nguyên liệu dạng chuỗi tiếng Việt/Anh tùy ảnh

const systemPrompt = `Bạn là trợ lý bếp chuyên nhận diện nguyên liệu trong ảnh.
YÊU CẦU:
- Chỉ liệt kê tên nguyên liệu thực phẩm có thể nấu ăn (ví dụ: trứng, cà chua, thịt gà, hành tây, tỏi,...).
- Không mô tả món ăn, không nói câu dài.
- Trả JSON thuần theo schema: { "ingredients": ["ten1", "ten2", ...] }.
- Tối đa 15 mục, loại bỏ trùng, dùng tên phổ biến, không kèm số lượng.
`;

function getClient() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY/GEMINI_API_KEY in .env");
  }
  return new GoogleGenerativeAI(apiKey);
}

async function extractIngredientsFromImage({ imageBuffer, mimeType, imageUrl }) {
  const client = getClient();
  // Dùng model đa phương thức mới (ưu tiên 1.5/2.0 vision nếu khả dụng)
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = client.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });

  const parts = [];
  if (imageUrl) {
    // Fetch ảnh về và nhúng inline_data (API không hỗ trợ image_url)
    const resp = await fetch(imageUrl);
    if (!resp.ok) {
      throw new Error(`Fetch image failed: ${resp.status} ${resp.statusText}`);
    }
    const ct = resp.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await resp.arrayBuffer());
    parts.push({ text: "Ảnh từ URL" });
    parts.push({ inline_data: { data: buf.toString("base64"), mime_type: ct } });
  } else if (imageBuffer && mimeType) {
    parts.push({ text: "Ảnh tải lên" });
    parts.push({ inline_data: { data: imageBuffer.toString("base64"), mime_type: mimeType } });
  } else {
    throw new Error("No image provided");
  }

  const result = await model.generateContent([{ text: "Hãy trích xuất danh sách nguyên liệu" }, ...parts]);
  const text = result.response.text();
  // Cố gắng bóc JSON nếu model trả kèm mô tả/markdown
  const jsonStr = (() => {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? m[0] : text;
  })();
  try {
    const json = JSON.parse(jsonStr);
    const list = Array.isArray(json.ingredients) ? json.ingredients : [];
    return list
      .map((s) => String(s).replace(/^\"|\"$/g, "").trim())
      .filter(Boolean)
      .slice(0, 15);
  } catch (_) {
    // fallback: tách dòng/ dấu phẩy
    const items = jsonStr
      .split(/\n|,|\u2022|-/g)
      .map((s) => s.replace(/^[\s\-\*\d\.]+/, "").replace(/^\"|\"$/g, "").trim())
      .filter(Boolean);
    return Array.from(new Set(items)).slice(0, 15);
  }
}

module.exports = { extractIngredientsFromImage };


