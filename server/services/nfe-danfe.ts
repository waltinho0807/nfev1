import PDFDocument from "pdfkit";
import type { Invoice, InvoiceItem, Emitter } from "@shared/schema";
import { formatAccessKey } from "./nfe-access-key";

function dec2(value: string | null | undefined): string {
  const num = parseFloat(value || "0");
  return num.toFixed(2);
}

function formatCurrency(value: string | null | undefined): string {
  const num = parseFloat(value || "0");
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCnpj(cnpj: string): string {
  const c = cnpj.replace(/\D/g, "");
  if (c.length === 14) {
    return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
  }
  return cnpj;
}

function formatCpfCnpj(doc: string): string {
  const c = doc.replace(/\D/g, "");
  if (c.length === 11) {
    return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
  }
  if (c.length === 14) {
    return formatCnpj(c);
  }
  return doc;
}

export function generateDanfePdf(
  invoice: Invoice,
  items: InvoiceItem[],
  emitter: Emitter
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 30 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 60;
      const leftX = 30;
      let y = 30;

      doc.rect(leftX, y, pageWidth, 85).stroke();
      doc.fontSize(14).font("Helvetica-Bold");
      doc.text("DANFE", leftX + 10, y + 8, { width: pageWidth - 20, align: "center" });
      doc.fontSize(8).font("Helvetica");
      doc.text("Documento Auxiliar da Nota Fiscal Eletrônica", leftX + 10, y + 25, { width: pageWidth - 20, align: "center" });

      doc.fontSize(7).font("Helvetica");
      const statusLabel = invoice.status === "autorizada" ? "AUTORIZADA" :
                          invoice.status === "rejeitada" ? "REJEITADA" :
                          invoice.status === "processando" ? "PROCESSANDO" : "RASCUNHO";
      const ambLabel = invoice.ambiente === "1" ? "PRODUÇÃO" : "HOMOLOGAÇÃO";
      doc.text(`${statusLabel} | Ambiente: ${ambLabel}`, leftX + 10, y + 38, { width: pageWidth - 20, align: "center" });

      doc.fontSize(7);
      doc.text(`Entrada/Saída: ${invoice.tipoSaida === "1" ? "SAÍDA" : "ENTRADA"}`, leftX + 10, y + 50);
      doc.text(`N°: ${invoice.numero || "---"}`, leftX + 10, y + 60);
      doc.text(`Série: ${invoice.serie}`, leftX + 120, y + 60);
      doc.text(`Emissão: ${invoice.dataEmissao} ${invoice.horaEmissao}`, leftX + 250, y + 60);

      if (invoice.chaveAcesso) {
        doc.text(`Chave de Acesso: ${formatAccessKey(invoice.chaveAcesso)}`, leftX + 10, y + 72, { width: pageWidth - 20 });
      }

      y += 90;

      if (invoice.protocolo) {
        doc.rect(leftX, y, pageWidth, 18).stroke();
        doc.fontSize(7).font("Helvetica-Bold");
        doc.text(`Protocolo de Autorização: ${invoice.protocolo}`, leftX + 10, y + 5);
        if (invoice.dhRecebimento) {
          doc.font("Helvetica").text(`Data/Hora: ${invoice.dhRecebimento}`, leftX + 350, y + 5);
        }
        y += 22;
      }

      doc.rect(leftX, y, pageWidth, 55).stroke();
      doc.fontSize(8).font("Helvetica-Bold");
      doc.text("EMITENTE", leftX + 10, y + 5);
      doc.fontSize(7).font("Helvetica");
      doc.text(`Razão Social: ${emitter.razaoSocial}`, leftX + 10, y + 16);
      doc.text(`CNPJ: ${formatCnpj(emitter.cnpj)}`, leftX + 10, y + 26);
      if (emitter.inscricaoEstadual) {
        doc.text(`IE: ${emitter.inscricaoEstadual}`, leftX + 250, y + 26);
      }
      doc.text(`End.: ${emitter.logradouro}, ${emitter.numero} - ${emitter.bairro}`, leftX + 10, y + 36);
      doc.text(`${emitter.municipio}/${emitter.uf} - CEP: ${emitter.cep}`, leftX + 10, y + 46);

      y += 60;

      doc.rect(leftX, y, pageWidth, 55).stroke();
      doc.fontSize(8).font("Helvetica-Bold");
      doc.text("DESTINATÁRIO / REMETENTE", leftX + 10, y + 5);
      doc.fontSize(7).font("Helvetica");
      doc.text(`Nome: ${invoice.destNome}`, leftX + 10, y + 16);
      doc.text(`CPF/CNPJ: ${formatCpfCnpj(invoice.destCpfCnpj)}`, leftX + 10, y + 26);
      if (invoice.destLogradouro) {
        doc.text(`End.: ${invoice.destLogradouro}, ${invoice.destNumero || "S/N"} - ${invoice.destBairro || ""}`, leftX + 10, y + 36);
      }
      if (invoice.destMunicipio) {
        doc.text(`${invoice.destMunicipio}/${invoice.destUf || ""} - CEP: ${invoice.destCep || ""}`, leftX + 10, y + 46);
      }

      y += 60;

      doc.rect(leftX, y, pageWidth, 15).fillAndStroke("#f0f0f0", "#000");
      doc.fillColor("#000");
      doc.fontSize(6).font("Helvetica-Bold");
      const cols = [
        { label: "CÓDIGO", x: leftX + 5, w: 50 },
        { label: "DESCRIÇÃO", x: leftX + 55, w: 170 },
        { label: "NCM", x: leftX + 225, w: 50 },
        { label: "CFOP", x: leftX + 275, w: 35 },
        { label: "UN", x: leftX + 310, w: 25 },
        { label: "QTD", x: leftX + 335, w: 40 },
        { label: "VL UNIT", x: leftX + 375, w: 55 },
        { label: "VL TOTAL", x: leftX + 430, w: 55 },
      ];
      cols.forEach((col) => {
        doc.text(col.label, col.x, y + 4, { width: col.w, align: "left" });
      });

      y += 15;

      doc.font("Helvetica").fontSize(6);
      items.forEach((item, idx) => {
        if (y > 720) {
          doc.addPage();
          y = 30;
        }

        const rowH = 14;
        if (idx % 2 === 0) {
          doc.rect(leftX, y, pageWidth, rowH).fill("#fafafa").stroke("#eee");
          doc.fillColor("#000");
        } else {
          doc.rect(leftX, y, pageWidth, rowH).stroke("#eee");
        }

        doc.text(item.codigo, cols[0].x, y + 4, { width: cols[0].w });
        doc.text(item.descricao.slice(0, 45), cols[1].x, y + 4, { width: cols[1].w });
        doc.text(item.ncm, cols[2].x, y + 4, { width: cols[2].w });
        doc.text(item.cfop, cols[3].x, y + 4, { width: cols[3].w });
        doc.text(item.unidade, cols[4].x, y + 4, { width: cols[4].w });
        doc.text(dec2(item.quantidade), cols[5].x, y + 4, { width: cols[5].w });
        doc.text(formatCurrency(item.valorUnitario), cols[6].x, y + 4, { width: cols[6].w });
        doc.text(formatCurrency(item.valorTotal), cols[7].x, y + 4, { width: cols[7].w });

        y += rowH;
      });

      y += 5;

      doc.rect(leftX, y, pageWidth, 60).stroke();
      doc.fontSize(8).font("Helvetica-Bold");
      doc.text("TOTAIS", leftX + 10, y + 5);
      doc.fontSize(7).font("Helvetica");

      const totY = y + 18;
      doc.text(`Total Produtos: R$ ${formatCurrency(invoice.totalProdutos)}`, leftX + 10, totY);
      doc.text(`Frete: R$ ${formatCurrency(invoice.valorFrete)}`, leftX + 180, totY);
      doc.text(`Seguro: R$ ${formatCurrency(invoice.valorSeguro)}`, leftX + 310, totY);
      doc.text(`Desconto: R$ ${formatCurrency(invoice.desconto)}`, leftX + 10, totY + 12);
      doc.text(`Outras Despesas: R$ ${formatCurrency(invoice.outrasDespesas)}`, leftX + 180, totY + 12);
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text(`TOTAL DA NOTA: R$ ${formatCurrency(invoice.totalNota)}`, leftX + 10, totY + 28, { width: pageWidth - 20, align: "right" });

      y += 65;

      if (invoice.informacoesComplementares) {
        if (y > 700) {
          doc.addPage();
          y = 30;
        }
        doc.rect(leftX, y, pageWidth, 50).stroke();
        doc.fontSize(7).font("Helvetica-Bold");
        doc.text("INFORMAÇÕES COMPLEMENTARES", leftX + 10, y + 5);
        doc.font("Helvetica").fontSize(6);
        doc.text(invoice.informacoesComplementares, leftX + 10, y + 16, { width: pageWidth - 20 });
        y += 55;
      }

      doc.fontSize(6).font("Helvetica");
      doc.text("Documento gerado pelo NF-e System", leftX, doc.page.height - 40, { width: pageWidth, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
