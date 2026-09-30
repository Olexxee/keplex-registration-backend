import "dotenv/config";

import { app } from "./src/app.js";
import { prisma } from "./src/config/prisma.js";

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    await prisma.$connect();

    console.log("Database connected");

    const server = app.listen(PORT, () => {
      console.log(`Keplex Registration API running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(async () => {
        try {
          await prisma.$disconnect();
          console.log("Database disconnected");
          process.exit(0);
        } catch (error) {
          console.error("Error during database shutdown:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);

    await prisma.$disconnect().catch(() => {});

    process.exit(1);
  }
};

startServer();
