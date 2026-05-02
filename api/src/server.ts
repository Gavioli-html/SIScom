import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: "http://localhost:5173",
  credentials: true,
});

await app.register(cookie, {
  secret: process.env.JWT_SECRET ?? "dev-secret",
});

app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`API rodando em http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
