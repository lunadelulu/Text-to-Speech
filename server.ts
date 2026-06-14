import express from "express";
import path from "path";
import dotenv from "dotenv";
import { apiRouter } from "./src/api-router.ts";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Mount our unified, rate-limited and cached TTS API routes
  app.use(apiRouter);

  // Serve static files and handle routing in production vs dev
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TTS Standalone DB Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("FATAL: Failed to start the Express and Vite server:", err);
});
