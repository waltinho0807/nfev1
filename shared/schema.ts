import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  certificateBase64: text("certificate_base64").notNull(),
  password: text("password").notNull(),
  expiresAt: text("expires_at"),
  active: boolean("active").default(true),
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({ id: true });
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;

export const emitters = pgTable("emitters", {
  id: serial("id").primaryKey(),
  razaoSocial: text("razao_social").notNull(),
  nomeFantasia: text("nome_fantasia"),
  cnpj: text("cnpj").notNull(),
  inscricaoEstadual: text("inscricao_estadual"),
  inscricaoMunicipal: text("inscricao_municipal"),
  regimeTributario: text("regime_tributario").notNull().default("1"),
  cep: text("cep").notNull(),
  uf: text("uf").notNull(),
  municipio: text("municipio").notNull(),
  bairro: text("bairro").notNull(),
  logradouro: text("logradouro").notNull(),
  numero: text("numero").notNull(),
  complemento: text("complemento"),
  telefone: text("telefone"),
  email: text("email"),
  codigoMunicipio: text("codigo_municipio"),
});

export const insertEmitterSchema = createInsertSchema(emitters).omit({ id: true });
export type InsertEmitter = z.infer<typeof insertEmitterSchema>;
export type Emitter = typeof emitters.$inferSelect;

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull(),
  descricao: text("descricao").notNull(),
  ncm: text("ncm").notNull(),
  cfop: text("cfop").notNull().default("5102"),
  unidade: text("unidade").notNull().default("UN"),
  valorUnitario: text("valor_unitario").notNull(),
  ean: text("ean").default("SEM GTIN"),
  cest: text("cest"),
  origem: text("origem").notNull().default("0"),
  csosn: text("csosn").default("102"),
  cstIcms: text("cst_icms"),
  cstPis: text("cst_pis").default("49"),
  cstCofins: text("cst_cofins").default("49"),
  aliqIcms: text("aliq_icms").default("0"),
  aliqPis: text("aliq_pis").default("0"),
  aliqCofins: text("aliq_cofins").default("0"),
  active: boolean("active").default(true),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  numero: text("numero"),
  serie: text("serie").notNull().default("1"),
  naturezaOperacao: text("natureza_operacao").notNull(),
  tipoSaida: text("tipo_saida").notNull().default("1"),
  finalidade: text("finalidade").notNull().default("1"),
  indicadorPresenca: text("indicador_presenca").notNull().default("0"),
  dataEmissao: text("data_emissao").notNull(),
  horaEmissao: text("hora_emissao").notNull(),
  dataSaida: text("data_saida"),
  horaSaida: text("hora_saida"),
  destNome: text("dest_nome").notNull(),
  destTipoPessoa: text("dest_tipo_pessoa").notNull().default("F"),
  destCpfCnpj: text("dest_cpf_cnpj").notNull(),
  destInscricaoEstadual: text("dest_inscricao_estadual"),
  destCep: text("dest_cep"),
  destUf: text("dest_uf"),
  destMunicipio: text("dest_municipio"),
  destBairro: text("dest_bairro"),
  destLogradouro: text("dest_logradouro"),
  destNumero: text("dest_numero"),
  destComplemento: text("dest_complemento"),
  destTelefone: text("dest_telefone"),
  destEmail: text("dest_email"),
  consumidorFinal: boolean("consumidor_final").default(true),
  totalProdutos: text("total_produtos").notNull().default("0"),
  valorFrete: text("valor_frete").default("0"),
  valorSeguro: text("valor_seguro").default("0"),
  outrasDespesas: text("outras_despesas").default("0"),
  desconto: text("desconto").default("0"),
  totalNota: text("total_nota").notNull().default("0"),
  modalidadeFrete: text("modalidade_frete").default("9"),
  informacoesComplementares: text("informacoes_complementares"),
  status: text("status").notNull().default("rascunho"),
  chaveAcesso: text("chave_acesso"),
  protocolo: text("protocolo"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  productId: integer("product_id"),
  descricao: text("descricao").notNull(),
  codigo: text("codigo").notNull(),
  ncm: text("ncm").notNull(),
  cfop: text("cfop").notNull(),
  unidade: text("unidade").notNull(),
  quantidade: text("quantidade").notNull(),
  valorUnitario: text("valor_unitario").notNull(),
  valorTotal: text("valor_total").notNull(),
  ean: text("ean").default("SEM GTIN"),
  origem: text("origem").default("0"),
  csosn: text("csosn").default("102"),
  cstPis: text("cst_pis").default("49"),
  cstCofins: text("cst_cofins").default("49"),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
