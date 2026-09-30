import "dotenv/config";
import { app } from "./src/app.js";
import { prisma } from "./src/config/prisma.js";

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

let isShuttingDown = false;

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected");

    const server = app.listen(PORT, HOST, () => {
      console.log(`Keplex Registration API running on ${HOST}:${PORT}`);
    });

    server.on("error", async (error) => {
      console.error("HTTP server error:", error);

      await prisma.$disconnect().catch((disconnectError) => {
        console.error("Database disconnect error:", disconnectError);
      });

      process.exit(1);
    });

    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`${signal} received. Shutting down...`);

      const forceExit = setTimeout(() => {
        console.error("Graceful shutdown timed out.");
        process.exit(1);
      }, 10000);

      forceExit.unref();

      try {
        await new Promise((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        await prisma.$disconnect();

        console.log("Database disconnected");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);

    await prisma.$disconnect().catch((disconnectError) => {
      console.error("Database disconnect error:", disconnectError);
    });

    process.exit(1);
  }
};

startServer();
