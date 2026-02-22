import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { storage } from "./storage";
import {
  insertProductSchema,
  insertEmitterSchema,
  insertCertificateSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
} from "@shared/schema";
import { z } from "zod";
import { emitirNfe, gerarDanfe, gerarXmlPreview } from "./services/nfe-service";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const LIFETIME_CNPJ = "64989480000148";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  next();
}

async function requireSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Usuário não encontrado" });
  }
  if (user.subscriptionStatus === "vitalicio") {
    return next();
  }
  if (user.subscriptionStatus === "active" && user.subscriptionExpiresAt) {
    if (new Date(user.subscriptionExpiresAt) > new Date()) {
      return next();
    }
    await storage.updateUser(user.id, { subscriptionStatus: "expired" } as any);
  }
  return res.status(403).json({ message: "Assinatura expirada ou inativa. Acesse o plano para continuar." });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const PgSession = connectPgSimple(session);
  const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
      store: new PgSession({
        pool: sessionPool,
        tableName: "user_sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "nfe-system-secret-key-fallback",
      resave: false,
      saveUninitialized: false,
      proxy: process.env.NODE_ENV === "production",
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  // ─── Auth Routes ───────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, name, email, cnpj, phone } = req.body;

      if (!username || !password || !name) {
        return res.status(400).json({ message: "Nome de usuário, senha e nome são obrigatórios" });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }

      const cleanCnpj = (cnpj || "").replace(/\D/g, "");

      const hashedPassword = await bcrypt.hash(password, 10);
      const isLifetime = cleanCnpj === LIFETIME_CNPJ;

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        email: email || null,
        cnpj: cleanCnpj || null,
        phone: phone || null,
        subscriptionStatus: isLifetime ? "vitalicio" : "inactive",
        subscriptionExpiresAt: null,
        abacateCustomerId: null,
        abacateBillingId: null,
      });

      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        cnpj: user.cnpj,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Usuário e senha são obrigatórios" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      if (user.subscriptionStatus === "active" && user.subscriptionExpiresAt) {
        if (new Date(user.subscriptionExpiresAt) <= new Date()) {
          await storage.updateUser(user.id, { subscriptionStatus: "expired" } as any);
          user.subscriptionStatus = "expired";
        }
      }

      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        cnpj: user.cnpj,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    if (user.subscriptionStatus === "active" && user.subscriptionExpiresAt) {
      if (new Date(user.subscriptionExpiresAt) <= new Date()) {
        await storage.updateUser(user.id, { subscriptionStatus: "expired" } as any);
        user.subscriptionStatus = "expired";
      }
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      cnpj: user.cnpj,
      phone: user.phone,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    });
  });

  // ─── AbacatePay Subscription ──────────────────────────
  app.post("/api/subscription/create-billing", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Usuário não encontrado" });

      if (user.subscriptionStatus === "vitalicio") {
        return res.status(400).json({ message: "Você já possui acesso vitalício" });
      }

      if (user.subscriptionStatus === "active" && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date()) {
        return res.status(400).json({ message: "Você já possui uma assinatura ativa" });
      }

      const apiKey = process.env.ABACATEPAY_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Chave da API AbacatePay não configurada" });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const phoneDigits = (user.phone || "").replace(/\D/g, "");
      const cellphone = phoneDigits.length >= 10 ? `+55${phoneDigits}` : "+5500000000000";
      const taxIdClean = (user.cnpj || "").replace(/\D/g, "");

      const billingData: any = {
        frequency: "ONE_TIME",
        methods: ["PIX"],
        products: [
          {
            externalId: "nfe-plan-monthly",
            name: "NF-e System - Plano Mensal",
            description: "Acesso completo ao sistema de emissão de NF-e por 31 dias.",
            quantity: 1,
            price: 990,
          },
        ],
        returnUrl: `${baseUrl}/checkout`,
        completionUrl: `${baseUrl}/checkout?status=completed&userId=${user.id}`,
        customer: {
          name: user.name,
          email: user.email || `${user.username}@nfe.local`,
          cellphone: cellphone,
          taxId: taxIdClean || "00000000000",
        },
        metadata: {
          userId: String(user.id),
        },
      };

      const response = await fetch("https://api.abacatepay.com/v1/billing/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billingData),
      });

      const result = await response.json();

      if (result.error) {
        console.error("[AbacatePay] Error:", JSON.stringify(result));
        return res.status(400).json({ message: `Erro AbacatePay: ${JSON.stringify(result.error)}` });
      }

      await storage.updateUser(user.id, {
        abacateBillingId: result.data?.id || null,
        abacateCustomerId: result.data?.customer?.id || user.abacateCustomerId || null,
      } as any);

      res.json({
        billingId: result.data?.id,
        url: result.data?.url,
        status: result.data?.status,
      });
    } catch (err: any) {
      console.error("[AbacatePay] Error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/subscription/check-payment", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Usuário não encontrado" });

      if (user.subscriptionStatus === "vitalicio") {
        return res.json({ status: "vitalicio", active: true });
      }
      if (user.subscriptionStatus === "active" && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date()) {
        return res.json({ status: "active", active: true, expiresAt: user.subscriptionExpiresAt });
      }

      if (!user.abacateBillingId) {
        return res.json({ status: user.subscriptionStatus, active: false });
      }

      const apiKey = process.env.ABACATEPAY_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Chave da API não configurada" });
      }

      const response = await fetch("https://api.abacatepay.com/v1/billing/list", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      const result = await response.json();

      if (result.data && Array.isArray(result.data)) {
        const billing = result.data.find((b: any) => b.id === user.abacateBillingId);
        if (billing && billing.status === "PAID") {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 31);

          await storage.updateUser(user.id, {
            subscriptionStatus: "active",
            subscriptionExpiresAt: expiresAt,
          } as any);

          return res.json({ status: "active", active: true, expiresAt, justActivated: true });
        }
      }

      res.json({ status: user.subscriptionStatus, active: false });
    } catch (err: any) {
      console.error("[Subscription Check] Error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Products (Protected) ────────────────────────────────────────
  app.get("/api/products", requireSubscription, async (req, res) => {
    try {
      const products = await storage.getProducts(req.session.userId!);
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/products", requireSubscription, async (req, res) => {
    try {
      const parsed = insertProductSchema.parse({ ...req.body, userId: req.session.userId });
      const product = await storage.createProduct(parsed);
      res.json(product);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/products/:id", requireSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId!;
      const existing = await storage.getProduct(id, userId);
      if (!existing) return res.status(404).json({ message: "Produto não encontrado" });
      const product = await storage.updateProduct(id, userId, req.body);
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/products/:id", requireSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id, req.session.userId!);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Emitter (Protected) ─────────────────────────────────────────
  app.get("/api/emitter", requireSubscription, async (req, res) => {
    try {
      const emitter = await storage.getEmitter(req.session.userId!);
      res.json(emitter || null);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/emitter", requireSubscription, async (req, res) => {
    try {
      const parsed = insertEmitterSchema.parse({ ...req.body, userId: req.session.userId });
      const emitter = await storage.createEmitter(parsed);
      res.json(emitter);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/emitter", requireSubscription, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const existing = await storage.getEmitter(userId);
      if (!existing) {
        const parsed = insertEmitterSchema.parse({ ...req.body, userId });
        const emitter = await storage.createEmitter(parsed);
        return res.json(emitter);
      }
      const emitter = await storage.updateEmitter(existing.id, userId, req.body);
      res.json(emitter);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Certificates (Protected) ───────────────────────────────────
  app.get("/api/certificates", requireSubscription, async (req, res) => {
    try {
      const certs = await storage.getCertificates(req.session.userId!);
      const safeCerts = certs.map((c) => ({
        ...c,
        certificateBase64: "***",
        password: "***",
      }));
      res.json(safeCerts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/certificates", requireSubscription, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = insertCertificateSchema.parse({ ...req.body, userId });
      await storage.deleteCertificatesByUser(userId);
      const cert = await storage.createCertificate(parsed);
      res.json({ ...cert, certificateBase64: "***", password: "***" });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/certificates/:id", requireSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCertificate(id, req.session.userId!);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Invoices (Protected) ────────────────────────────────────────
  app.get("/api/invoices", requireSubscription, async (req, res) => {
    try {
      const invs = await storage.getInvoices(req.session.userId!);
      res.json(invs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/invoices/:id", requireSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id, req.session.userId!);
      if (!invoice) return res.status(404).json({ message: "Nota não encontrada" });
      const items = await storage.getInvoiceItems(id);
      res.json({ invoice, items });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/invoices", requireSubscription, async (req, res) => {
    try {
      const { invoice: invoiceData, items } = req.body;

      if (!invoiceData || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Dados da nota e itens são obrigatórios" });
      }

      const userId = req.session.userId!;
      const allInvoices = await storage.getInvoices(userId);
      const nextNum = String(allInvoices.length + 1).padStart(6, "0");
      invoiceData.numero = nextNum;
      invoiceData.userId = userId;

      const invoice = await storage.createInvoice(invoiceData);

      for (const item of items) {
        await storage.createInvoiceItem({
          ...item,
          invoiceId: invoice.id,
        });
      }

      res.json(invoice);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/invoices/:id", requireSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId!;
      const existing = await storage.getInvoice(id, userId);
      if (!existing) return res.status(404).json({ message: "Nota não encontrada" });
      if (existing.status === "autorizada" || existing.status === "processando") {
        return res.status(400).json({ message: "Nota autorizada ou em processamento não pode ser editada" });
      }

      const { invoice: invoiceData, items } = req.body;
      if (!invoiceData || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Dados da nota e itens são obrigatórios" });
      }

      const updated = await storage.updateInvoice(id, {
        ...invoiceData,
        numero: existing.numero,
        serie: invoiceData.serie || existing.serie,
        status: "rascunho",
        motivoRejeicao: null,
        codigoStatus: null,
        xmlContent: null,
        xmlSigned: null,
        xmlProtocolo: null,
        chaveAcesso: null,
        protocolo: null,
        recibo: null,
        dhRecebimento: null,
      });

      await storage.deleteInvoiceItems(id);
      for (const item of items) {
        await storage.createInvoiceItem({
          ...item,
          invoiceId: id,
        });
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/invoices/:id", requireSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteInvoice(id, req.session.userId!);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── NF-e Emissão (Protected) ─────────────────────────────────────
  app.post("/api/invoices/:id/emitir", requireSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id, req.session.userId!);
      if (!invoice) return res.status(404).json({ success: false, message: "Nota não encontrada" });
      const ambiente = req.body.ambiente || "2";
      const result = await emitirNfe(id, ambiente);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/invoices/:id/xml", requireSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id, req.session.userId!);
      if (!invoice) return res.status(404).json({ message: "Nota não encontrada" });

      const xml = invoice.xmlSigned || invoice.xmlContent;
      if (!xml) {
        const preview = await gerarXmlPreview(id, invoice.ambiente || "2");
        return res.type("application/xml").send(preview.xml);
      }
      res.type("application/xml").send(xml);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/invoices/:id/danfe", requireSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id, req.session.userId!);
      if (!invoice) return res.status(404).json({ message: "Nota não encontrada" });
      const pdf = await gerarDanfe(id);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename=danfe_${id}.pdf`);
      res.send(pdf);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
