import type { Express } from "express";
import { createServer, type Server } from "http";
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── Products ────────────────────────────────────────────
  app.get("/api/products", async (_req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const parsed = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(parsed);
      res.json(product);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.updateProduct(id, req.body);
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Emitter ─────────────────────────────────────────────
  app.get("/api/emitter", async (_req, res) => {
    try {
      const emitter = await storage.getEmitter();
      res.json(emitter || null);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/emitter", async (req, res) => {
    try {
      const parsed = insertEmitterSchema.parse(req.body);
      const emitter = await storage.createEmitter(parsed);
      res.json(emitter);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/emitter", async (req, res) => {
    try {
      const existing = await storage.getEmitter();
      if (!existing) {
        const parsed = insertEmitterSchema.parse(req.body);
        const emitter = await storage.createEmitter(parsed);
        return res.json(emitter);
      }
      const emitter = await storage.updateEmitter(existing.id, req.body);
      res.json(emitter);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Certificates ───────────────────────────────────────
  app.get("/api/certificates", async (_req, res) => {
    try {
      const certs = await storage.getCertificates();
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

  app.post("/api/certificates", async (req, res) => {
    try {
      const parsed = insertCertificateSchema.parse(req.body);
      const existing = await storage.getCertificates();
      for (const old of existing) {
        await storage.deleteCertificate(old.id);
      }
      const cert = await storage.createCertificate(parsed);
      res.json({ ...cert, certificateBase64: "***", password: "***" });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/certificates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCertificate(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Invoices ────────────────────────────────────────────
  app.get("/api/invoices", async (_req, res) => {
    try {
      const invs = await storage.getInvoices();
      res.json(invs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      if (!invoice) return res.status(404).json({ message: "Nota não encontrada" });
      const items = await storage.getInvoiceItems(id);
      res.json({ invoice, items });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const { invoice: invoiceData, items } = req.body;

      if (!invoiceData || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Dados da nota e itens são obrigatórios" });
      }

      const allInvoices = await storage.getInvoices();
      const nextNum = String(allInvoices.length + 1).padStart(6, "0");
      invoiceData.numero = nextNum;

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

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteInvoice(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── NF-e Emissão ─────────────────────────────────────────
  app.post("/api/invoices/:id/emitir", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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

  app.get("/api/invoices/:id/xml", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
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

  app.get("/api/invoices/:id/danfe", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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
