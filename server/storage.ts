import { db } from "./db";
import { eq } from "drizzle-orm";
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
  createUser(user: InsertUser): Promise<User>;

  getCertificates(): Promise<Certificate[]>;
  createCertificate(cert: InsertCertificate): Promise<Certificate>;
  deleteCertificate(id: number): Promise<void>;

  getEmitter(): Promise<Emitter | undefined>;
  createEmitter(emitter: InsertEmitter): Promise<Emitter>;
  updateEmitter(id: number, emitter: Partial<InsertEmitter>): Promise<Emitter>;

  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;

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

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getCertificates(): Promise<Certificate[]> {
    return db.select().from(certificates);
  }

  async createCertificate(cert: InsertCertificate): Promise<Certificate> {
    const [created] = await db.insert(certificates).values(cert).returning();
    return created;
  }

  async deleteCertificate(id: number): Promise<void> {
    await db.delete(certificates).where(eq(certificates.id, id));
  }

  async getEmitter(): Promise<Emitter | undefined> {
    const [emitter] = await db.select().from(emitters).limit(1);
    return emitter;
  }

  async createEmitter(emitter: InsertEmitter): Promise<Emitter> {
    const [created] = await db.insert(emitters).values(emitter).returning();
    return created;
  }

  async updateEmitter(id: number, data: Partial<InsertEmitter>): Promise<Emitter> {
    const [updated] = await db.update(emitters).set(data).where(eq(emitters.id, id)).returning();
    return updated;
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(invoices.id);
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
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

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(invoices).where(eq(invoices.id, id));
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
