import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  users, type User, type InsertUser,
  certificates, type Certificate, type InsertCertificate,
  emitters, type Emitter, type InsertEmitter,
  products, type Product, type InsertProduct,
  invoices, type Invoice, type InsertInvoice,
  invoiceItems, type InvoiceItem, type InsertInvoiceItem,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByCnpj(cnpj: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;

  getCertificates(userId: number): Promise<Certificate[]>;
  getCertificate(id: number, userId: number): Promise<Certificate | undefined>;
  createCertificate(cert: InsertCertificate): Promise<Certificate>;
  deleteCertificate(id: number, userId: number): Promise<void>;
  deleteCertificatesByUser(userId: number): Promise<void>;

  getEmitter(userId: number): Promise<Emitter | undefined>;
  createEmitter(emitter: InsertEmitter): Promise<Emitter>;
  updateEmitter(id: number, userId: number, emitter: Partial<InsertEmitter>): Promise<Emitter>;

  getProducts(userId: number): Promise<Product[]>;
  getProduct(id: number, userId: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, userId: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number, userId: number): Promise<void>;

  getInvoices(userId: number): Promise<Invoice[]>;
  getInvoice(id: number, userId: number): Promise<Invoice | undefined>;
  getInvoiceById(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number, userId: number): Promise<void>;

  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItems(invoiceId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByCnpj(cnpj: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.cnpj, cnpj));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getCertificates(userId: number): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.userId, userId));
  }

  async getCertificate(id: number, userId: number): Promise<Certificate | undefined> {
    const [cert] = await db.select().from(certificates).where(and(eq(certificates.id, id), eq(certificates.userId, userId)));
    return cert;
  }

  async createCertificate(cert: InsertCertificate): Promise<Certificate> {
    const [created] = await db.insert(certificates).values(cert).returning();
    return created;
  }

  async deleteCertificate(id: number, userId: number): Promise<void> {
    await db.delete(certificates).where(and(eq(certificates.id, id), eq(certificates.userId, userId)));
  }

  async deleteCertificatesByUser(userId: number): Promise<void> {
    await db.delete(certificates).where(eq(certificates.userId, userId));
  }

  async getEmitter(userId: number): Promise<Emitter | undefined> {
    const [emitter] = await db.select().from(emitters).where(eq(emitters.userId, userId)).limit(1);
    return emitter;
  }

  async createEmitter(emitter: InsertEmitter): Promise<Emitter> {
    const [created] = await db.insert(emitters).values(emitter).returning();
    return created;
  }

  async updateEmitter(id: number, userId: number, data: Partial<InsertEmitter>): Promise<Emitter> {
    const [updated] = await db.update(emitters).set(data).where(and(eq(emitters.id, id), eq(emitters.userId, userId))).returning();
    return updated;
  }

  async getProducts(userId: number): Promise<Product[]> {
    return db.select().from(products).where(eq(products.userId, userId));
  }

  async getProduct(id: number, userId: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(and(eq(products.id, id), eq(products.userId, userId)));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: number, userId: number, data: Partial<InsertProduct>): Promise<Product> {
    const [updated] = await db.update(products).set(data).where(and(eq(products.id, id), eq(products.userId, userId))).returning();
    return updated;
  }

  async deleteProduct(id: number, userId: number): Promise<void> {
    await db.delete(products).where(and(eq(products.id, id), eq(products.userId, userId)));
  }

  async getInvoices(userId: number): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.id));
  }

  async getInvoice(id: number, userId: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    return invoice;
  }

  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice> {
    const [updated] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async deleteInvoice(id: number, userId: number): Promise<void> {
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    if (!invoice) return;
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [created] = await db.insert(invoiceItems).values(item).returning();
    return created;
  }

  async deleteInvoiceItems(invoiceId: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }
}

export const storage = new DatabaseStorage();
