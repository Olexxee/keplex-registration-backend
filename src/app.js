import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import trainingRouter from "./modules/training/trainingProgram.routes.js";
import trainingMediaRouter from "./modules/training/media/trainingMedia.routes.js";
import paymentRouter from "./modules/payment/payment.routes.js";
import authRouter from "./modules/auth/auth.route.js";
import registrationRouter from "./modules/registration/registration.routes.js";
import testimonialRouter from "./modules/testimonials/testimonial.routes.js";
import {globalRateLimiter} from "./middlewares/rateLimitMiddleware.js"
import { errorMiddleware } from "./middlewares/errorMiddleware.js";


const app = express();

// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.set("trust proxy", 1);

app.use(globalRateLimiter);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header
      // such as Postman, server-to-server requests, etc.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);


// ============================================================
// BODY PARSING
// ============================================================

app.use(
  express.json({
    verify: (req, _res, buffer) => {
      req.rawBody = Buffer.from(buffer);
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Keplex Registration API is running",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// API ROUTES
// ============================================================
app.use("/api/auth", authRouter);
app.use("/api/training", trainingRouter);
app.use("/api/training", trainingMediaRouter);
app.use("/api/registrations", registrationRouter);
app.use("/api/testimonial", testimonialRouter);
app.use("/api/payments", paymentRouter);

// ============================================================
// 404
// ============================================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(errorMiddleware);

export { app };
