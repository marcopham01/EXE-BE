const crypto = require("crypto");

// Xác thực chữ ký webhook từ PayOS (nếu có header). Không chặn nếu thiếu để dễ thử nghiệm.
module.exports = function verifyPayOSSignature(req, res, next) {
  try {
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY || "";
    const signatureHeader = req.headers["x-signature"] || req.headers["x-payos-signature"];

    // Nếu không có header chữ ký, cho qua nhưng log cảnh báo (phục vụ dev/ngrok)
    if (!signatureHeader || !checksumKey) {
      if (!checksumKey) console.warn("[PayOS] Missing PAYOS_CHECKSUM_KEY env.");
      if (!signatureHeader) console.warn("[PayOS] Missing x-signature header.");
      return next();
    }

    const raw = req.rawBody ? req.rawBody : JSON.stringify(req.body || {});
    const expected = crypto.createHmac("sha256", checksumKey).update(raw).digest("hex");
    if (expected !== signatureHeader) {
      return res.status(401).json({ success: false, message: "Invalid PayOS signature" });
    }
    return next();
  } catch (e) {
    return res.status(400).json({ success: false, message: "PayOS signature verification error", error: e?.message });
  }
};
