const mysql = require("mysql2/promise");

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 5,
      idleTimeout: 60000,
      queueLimit: 0
    });
  }

  return pool;
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const {
      name = "匿名",
      message = "",
      sliceCount = 0,
      createdAt = null,
      userAgent = ""
    } = req.body || {};

    const normalizedName = String(name).trim().slice(0, 20) || "匿名";
    const normalizedMessage = String(message).trim().slice(0, 120);
    const normalizedSliceCount = Number.isFinite(Number(sliceCount)) ? Number(sliceCount) : 0;
    const normalizedCreatedAt = createdAt ? new Date(createdAt) : new Date();
    const normalizedUserAgent = String(userAgent).slice(0, 255);
    const clientIp =
      String(req.headers["x-forwarded-for"] || "")
        .split(",")[0]
        .trim() || null;

    if (!normalizedMessage) {
      return sendJson(res, 400, { ok: false, error: "Message is required" });
    }

    if (Number.isNaN(normalizedCreatedAt.getTime())) {
      return sendJson(res, 400, { ok: false, error: "Invalid createdAt" });
    }

    const sql = `
      INSERT INTO wishes (
        name,
        message,
        slice_count,
        created_at,
        user_agent,
        ip_address
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      normalizedName,
      normalizedMessage,
      normalizedSliceCount,
      normalizedCreatedAt,
      normalizedUserAgent,
      clientIp
    ];

    await getPool().execute(sql, values);

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("Failed to store wish:", error);
    return sendJson(res, 500, { ok: false, error: "Internal server error" });
  }
};
