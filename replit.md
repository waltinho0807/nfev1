# NF-e System - Nota Fiscal Eletrônica Modelo 55

## Overview
Sistema de emissão de Nota Fiscal Eletrônica (NF-e) modelo 55 com cadastro completo de produtos, emitente, certificado digital A1, e formulário de criação de notas fiscais.

## Architecture
- **Backend**: Express.js + TypeScript
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Database**: PostgreSQL (Replit built-in, Drizzle ORM)
- **Router**: Wouter (frontend)

## Project Structure
- `shared/schema.ts` - Database schemas (users, certificates, emitters, products, invoices, invoice_items)
- `server/routes.ts` - API routes (CRUD for all entities)
- `server/storage.ts` - Database storage layer
- `server/db.ts` - Database connection
- `server/seed.ts` - Seed data (5 sample products)
- `client/src/pages/` - All page components
  - `dashboard.tsx` - Main dashboard with stats
  - `products.tsx` - Product CRUD
  - `emitter.tsx` - Emitter company form
  - `certificate.tsx` - A1 certificate upload
  - `invoice-form.tsx` - Invoice creation form
  - `invoices.tsx` - Invoice list
  - `invoice-detail.tsx` - Invoice detail view
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

## Key Features
- Product catalog with fiscal data (NCM, CFOP, CSOSN, PIS, COFINS)
- Company emitter info pre-fills invoice form
- A1 certificate upload via file or base64
- Full invoice creation form matching ERP layout
- Automatic totals calculation
- Dark/Light mode
