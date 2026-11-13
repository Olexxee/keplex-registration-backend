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
import souvenirRouter from "./modules/souvenirs/souvenir.routes.js";
import workshopRouter from "./modules/workshops/workshop.routes.js";
import certificateRouter from "./modules/certificates/certificate.routes.js";
import siteContentRouter from "./modules/siteContent/siteContent.routes.js";
import {globalRateLimiter} from "./middlewares/rateLimitMiddleware.js"
import { errorMiddleware } from "./middlewares/errorMiddleware.js";


const app = express();

app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      frameSrc: ["\u0027self\u0027", "https://res.cloudinary.com"],
    },
  },
}));

// ============================================================
// CORS
// ============================================================

const configuredFrontendOrigins = (process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredFrontendOrigins,
  "https://kpxacademy.com.ng",
  "https://www.kpxacademy.com.ng",
  "https://keplexregistration.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

console.log("[CORS] Allowed origins:", [...allowedOrigins]);

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients do not send Origin and are not subject to CORS.
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin)) return callback(null, true);

      console.error("[CORS] Blocked origin:", origin);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);

// CORS must run before rate limiting so browser clients can read 429 responses.
app.use(globalRateLimiter);

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
app.use("/api/souvenirs", souvenirRouter);
app.use("/api/workshops", workshopRouter);
app.use("/api/certificates", certificateRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/site-content", siteContentRouter);

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
