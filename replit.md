# NF-e System - Nota Fiscal Eletrônica Modelo 55

## Overview
Sistema multi-tenant de emissão de Nota Fiscal Eletrônica (NF-e) modelo 55 com autenticação de usuários, assinatura via AbacatePay (R$9,90/mês PIX), cadastro completo de produtos, emitente, certificado digital A1, formulário de criação de notas fiscais, e integração SEFAZ para autorização com geração de XML, assinatura digital e DANFE PDF.

## Architecture
- **Backend**: Express.js + TypeScript
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Database**: PostgreSQL (Replit built-in, Drizzle ORM)
- **Router**: Wouter (frontend)
- **Auth**: express-session + bcryptjs + connect-pg-simple
- **Payments**: AbacatePay API (PIX, R$9,90/mês)

## Multi-Tenant Architecture
- All data entities (products, emitters, invoices, certificates) are scoped by `userId`
- User authentication via session cookies (express-session with PostgreSQL store)
- Subscription gating: only users with `active` or `vitalicio` status can access protected routes
- Special CNPJ `64989480000148` receives lifetime (`vitalicio`) access on registration
- Regular users must pay R$9,90 via AbacatePay PIX to activate 31-day subscription

## Project Structure
- `shared/schema.ts` - Database schemas (users with subscription fields, certificates, emitters, products, invoices, invoice_items)
- `server/routes.ts` - API routes with auth middleware, subscription gating, AbacatePay integration
- `server/storage.ts` - Database storage layer (user-scoped queries)
- `server/db.ts` - Database connection
- `server/seed.ts` - Seed data (empty, products are user-scoped)
- `server/services/` - NF-e services
  - `nfe-access-key.ts` - Access key generation (mod 11 checksum, 44 digits)
  - `nfe-xml-builder.ts` - XML generation (NF-e layout 4.00)
  - `nfe-signer.ts` - Certificate extraction (PFX/A1) and XML digital signing
  - `nfe-sefaz.ts` - SOAP client for SEFAZ communication (homologação/produção)
  - `nfe-danfe.ts` - DANFE PDF generation using PDFKit
  - `nfe-service.ts` - Orchestration service (emitir, gerar DANFE, preview XML)
- `client/src/lib/auth.tsx` - Auth context provider with login/register/logout mutations
- `client/src/pages/` - All page components
  - `auth.tsx` - Login/Register page
  - `checkout.tsx` - Subscription checkout with AbacatePay PIX
  - `dashboard.tsx` - Main dashboard with stats
  - `products.tsx` - Product CRUD
  - `emitter.tsx` - Emitter company form
  - `certificate.tsx` - A1 certificate upload
  - `invoice-form.tsx` - Invoice creation form
  - `invoices.tsx` - Invoice list with emission actions
  - `invoice-detail.tsx` - Invoice detail with emission workflow
- `client/src/components/` - Reusable components
  - `app-sidebar.tsx` - Navigation sidebar (adapts based on subscription status)
  - `theme-provider.tsx` / `theme-toggle.tsx` - Dark mode

## API Routes
### Auth (Public)
- `POST /api/auth/register` - Register user (auto-grants vitalicio for CNPJ 64989480000148)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Subscription (Auth required)
- `POST /api/subscription/create-billing` - Create AbacatePay billing (PIX)
- `POST /api/subscription/check-payment` - Check payment status and activate subscription

### Protected (Auth + Active Subscription required)
- `GET/POST /api/products` - List/Create products (user-scoped)
- `PUT/DELETE /api/products/:id` - Update/Delete product
- `GET/POST/PUT /api/emitter` - Get/Create/Update emitter (user-scoped)
- `GET/POST /api/certificates` - List/Create certificates (user-scoped)
- `DELETE /api/certificates/:id` - Delete certificate
- `GET/POST /api/invoices` - List/Create invoices (user-scoped)
- `GET /api/invoices/:id` - Get invoice with items
- `PUT /api/invoices/:id` - Edit rejected/draft invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/emitir` - Emit NF-e (send to SEFAZ)
- `GET /api/invoices/:id/xml` - Download NF-e XML
- `GET /api/invoices/:id/danfe` - Download DANFE PDF

## Key Features
- Multi-tenant user isolation
- User authentication (register/login/logout)
- Subscription management via AbacatePay (R$9,90/mês PIX)
- Lifetime access for CNPJ 64989480000148
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
- Editable rejected invoices
- Dark/Light mode

## NF-e Technical Notes
- Access key: 44 digits with mod 11 checksum
- Date format in DB: dd/mm/yyyy (Brazilian format), converted to ISO for XML
- Certificate stored as Base64 in database, extracted in memory for signing only
- SEFAZ URLs configured per UF (SP, RJ, MG) with SVRS fallback
- Dependencies: node-forge, xml-crypto, fast-xml-parser, pdfkit

## Environment Variables / Secrets
- `ABACATEPAY_API_KEY` - AbacatePay API key for billing
- `SESSION_SECRET` - Session encryption secret
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
