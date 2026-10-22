import express from "express";
import multer from "multer";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import withdrawalRoutes from "./routes/withdrawal.routes.js";
import depositRoutes from "./routes/deposit.routes.js";
import usersInvestmentRoutes from "./routes/plan.routes.js";
import planRoutes from "./routes/plan.routes.js";
import usersRoutes from "./routes/user.routes.js";

const app = express();

// Security headers
app.use(helmet());

// Request logging (only in development)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Enable JSON & URL-encoded body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.USER_APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "https://blockvextrade.com",
  "https://www.blockvextrade.com",
  "https://admin.blockvextrade.com",
  "https://admin-api.blockvextrade.com",
  "https://api.blockvextrade.com",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);


app.use("/api/users/investments", usersInvestmentRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/admin/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/users", usersRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Multer file upload error handler (specific)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes("Only")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error",
  });
});

const shutdown = (signal) => {
  console.log(`Received ${signal}. Closing server gracefully...`);
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;
