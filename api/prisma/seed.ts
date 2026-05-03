import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashSenha(senha: string) {
  return bcrypt.hash(senha, 10);
}

async function main() {
  // Áreas
  const ti = await prisma.area.upsert({
    where: { slug: "ti" },
    update: {},
    create: {
      nome: "Tecnologia da Informação",
      slug: "ti",
      tipo: "departamento",
      config_json: { cor: "#1e3f6b" },
    },
  });

  const secom = await prisma.area.upsert({
    where: { slug: "secom" },
    update: {},
    create: {
      nome: "Secretaria de Comunicação",
      slug: "secom",
      tipo: "secretaria",
      config_json: { cor: "#4a6741" },
    },
  });

  // Usuários
  await prisma.usuario.upsert({
    where: { email: "admin@jaguariaiva.pr.gov.br" },
    update: { senha: await hashSenha("admin123") },
    create: {
      nome: "Administrador",
      email: "admin@jaguariaiva.pr.gov.br",
      senha: await hashSenha("admin123"),
      role: "admin",
      area_id: ti.id,
    },
  });

  await prisma.usuario.upsert({
    where: { email: "tecnico.ti@jaguariaiva.pr.gov.br" },
    update: { senha: await hashSenha("senha123") },
    create: {
      nome: "João Silva",
      email: "tecnico.ti@jaguariaiva.pr.gov.br",
      senha: await hashSenha("senha123"),
      role: "tecnico",
      area_id: ti.id,
    },
  });

  await prisma.usuario.upsert({
    where: { email: "tecnico.secom@jaguariaiva.pr.gov.br" },
    update: { senha: await hashSenha("senha123") },
    create: {
      nome: "Maria Oliveira",
      email: "tecnico.secom@jaguariaiva.pr.gov.br",
      senha: await hashSenha("senha123"),
      role: "tecnico",
      area_id: secom.id,
    },
  });

  await prisma.usuario.upsert({
    where: { email: "solicitante@jaguariaiva.pr.gov.br" },
    update: { senha: await hashSenha("senha123") },
    create: {
      nome: "Carlos Souza",
      email: "solicitante@jaguariaiva.pr.gov.br",
      senha: await hashSenha("senha123"),
      role: "solicitante",
      area_id: ti.id,
    },
  });

  // Template TI
  await prisma.templateChamado.upsert({
    where: { id: 1 },
    update: {},
    create: {
      area_id: ti.id,
      nome: "Suporte TI",
      campos_json: [
        { chave: "patrimonio", label: "Nº Patrimônio", tipo: "text", obrigatorio: false },
        { chave: "ip", label: "Endereço IP", tipo: "text", obrigatorio: false },
        {
          chave: "categoria",
          label: "Categoria",
          tipo: "select",
          obrigatorio: true,
          opcoes: ["Hardware", "Software", "Rede", "Acesso", "Impressora", "Outro"],
        },
      ],
      sla_config_json: {
        critica: { resposta_min: 15, resolucao_min: 120 },
        alta: { resposta_min: 30, resolucao_min: 240 },
        media: { resposta_min: 120, resolucao_min: 480 },
        baixa: { resposta_min: 240, resolucao_min: 1440 },
      },
    },
  });

  // Template SECOM
  await prisma.templateChamado.upsert({
    where: { id: 2 },
    update: {},
    create: {
      area_id: secom.id,
      nome: "Demanda SECOM",
      campos_json: [
        { chave: "briefing", label: "Briefing", tipo: "textarea", obrigatorio: true },
        {
          chave: "formato",
          label: "Formato de Entrega",
          tipo: "select",
          obrigatorio: true,
          opcoes: ["Arte para redes sociais", "Cobertura de evento", "Redação de nota/release", "Impresso/banner"],
        },
        {
          chave: "canal",
          label: "Canal de Publicação",
          tipo: "select",
          obrigatorio: false,
          opcoes: ["Instagram", "Facebook", "Site", "WhatsApp", "Impresso", "TV", "Rádio"],
        },
      ],
      sla_config_json: {
        "Arte para redes sociais": { prazo_dias_uteis: 2 },
        "Cobertura de evento": { prazo_dias_uteis: 3 },
        "Redação de nota/release": { prazo_dias_uteis: 1 },
        "Impresso/banner": { prazo_dias_uteis: 5 },
      },
    },
  });

  console.log("✓ Seed concluído — 2 áreas, 4 usuários, 2 templates");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
