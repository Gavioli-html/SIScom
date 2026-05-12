import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth.js";
import { chamadoRoutes } from "./routes/chamados.js";
import { templateRoutes } from "./routes/templates.js";
import { mensagemRoutes } from "./routes/mensagens.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { usuarioRoutes } from "./routes/usuarios.js";
import { perfilRoutes } from "./routes/perfil.js";
import { analyticsRoutes } from "./routes/analytics.js"
import { tagRoutes } from "./routes/tags.js";
import { ativoRoutes } from "./routes/ativos.js";
import { eventoRoutes } from "./routes/eventos.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: (origin, cb) => {
    // Libera qualquer origem HTTP — sistema interno sem exposição pública
    if (!origin || origin.startsWith('http://')) return cb(null, true)
    cb(new Error('Not allowed'), false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

await app.register(cookie, {
  secret: process.env.JWT_SECRET ?? "dev-secret",
});

app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

await app.register(authRoutes);
await app.register(chamadoRoutes);
await app.register(templateRoutes);
await app.register(mensagemRoutes);
await app.register(dashboardRoutes);
await app.register(usuarioRoutes);
await app.register(perfilRoutes);
await app.register(analyticsRoutes)
await app.register(tagRoutes);
await app.register(ativoRoutes);
await app.register(eventoRoutes);

const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`API rodando em http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
