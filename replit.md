# NF-e System - Nota Fiscal Eletrônica Modelo 55

## Overview
Sistema de emissão de Nota Fiscal Eletrônica (NF-e) modelo 55 com cadastro completo de produtos, emitente, certificado digital A1, formulário de criação de notas fiscais, e integração SEFAZ para autorização com geração de XML, assinatura digital e DANFE PDF.

## Architecture
- **Backend**: Express.js + TypeScript
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Database**: PostgreSQL (Replit built-in, Drizzle ORM)
- **Router**: Wouter (frontend)

## Project Structure
- `shared/schema.ts` - Database schemas (users, certificates, emitters, products, invoices, invoice_items)
- `server/routes.ts` - API routes (CRUD for all entities + NF-e emission)
- `server/storage.ts` - Database storage layer
- `server/db.ts` - Database connection
- `server/seed.ts` - Seed data (5 sample products)
- `server/services/` - NF-e services
  - `nfe-access-key.ts` - Access key generation (mod 11 checksum, 44 digits)
  - `nfe-xml-builder.ts` - XML generation (NF-e layout 4.00)
  - `nfe-signer.ts` - Certificate extraction (PFX/A1) and XML digital signing
  - `nfe-sefaz.ts` - SOAP client for SEFAZ communication (homologação/produção)
  - `nfe-danfe.ts` - DANFE PDF generation using PDFKit
  - `nfe-service.ts` - Orchestration service (emitir, gerar DANFE, preview XML)
- `client/src/pages/` - All page components
  - `dashboard.tsx` - Main dashboard with stats
  - `products.tsx` - Product CRUD
  - `emitter.tsx` - Emitter company form
  - `certificate.tsx` - A1 certificate upload
  - `invoice-form.tsx` - Invoice creation form
  - `invoices.tsx` - Invoice list with emission actions
  - `invoice-detail.tsx` - Invoice detail with emission workflow
- `client/src/components/` - Reusable components
  - `app-sidebar.tsx` - Navigation sidebar
  - `theme-provider.tsx` / `theme-toggle.tsx` - Dark mode

## API Routes
- `GET/POST /api/products` - List/Create products
- `PUT/DELETE /api/products/:id` - Update/Delete product
- `GET/POST/PUT /api/emitter` - Get/Create/Update emitter
- `GET/POST /api/certificates` - List/Create certificates
- `DELETE /api/certificates/:id` - Delete certificate
- `GET/POST /api/invoices` - List/Create invoices
- `GET /api/invoices/:id` - Get invoice with items
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/emitir` - Emit NF-e (send to SEFAZ)
- `GET /api/invoices/:id/xml` - Download NF-e XML
- `GET /api/invoices/:id/danfe` - Download DANFE PDF

## Key Features
- Product catalog with fiscal data (NCM, CFOP, CSOSN, PIS, COFINS)
- Company emitter info pre-fills invoice form
- A1 certificate upload via file or base64
- Full invoice creation form matching ERP layout
- Automatic totals calculation
- NF-e XML generation (layout 4.00)
- Digital signature with A1 certificate (PFX)
- SEFAZ SOAP communication (homologação/produção)
- DANFE PDF generation
- Invoice status lifecycle: rascunho → processando → autorizada/rejeitada
- Dark/Light mode

## NF-e Technical Notes
- Access key: 44 digits with mod 11 checksum
- Date format in DB: dd/mm/yyyy (Brazilian format), converted to ISO for XML
- Certificate stored as Base64 in database, extracted in memory for signing only
- SEFAZ URLs configured per UF (SP, RJ, MG) with SVRS fallback
- Dependencies: node-forge, xml-crypto, fast-xml-parser, pdfkit
