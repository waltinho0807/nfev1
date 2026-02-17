import { storage } from "../storage";
import { buildNfeXml } from "./nfe-xml-builder";
import { extractCertificate, signNfeXml, type CertificateData } from "./nfe-signer";
import { sendToSefaz, consultRecibo } from "./nfe-sefaz";
import { generateDanfePdf } from "./nfe-danfe";

export interface EmitirResult {
  success: boolean;
  message: string;
  chaveAcesso?: string;
  protocolo?: string;
  status?: string;
}

export async function emitirNfe(
  invoiceId: number,
  ambiente: string = "2"
): Promise<EmitirResult> {
  const invoice = await storage.getInvoice(invoiceId);
  if (!invoice) {
    return { success: false, message: "Nota fiscal não encontrada" };
  }

  if (invoice.status === "autorizada") {
    return { success: false, message: "Esta nota já foi autorizada" };
  }

  const emitter = await storage.getEmitter();
  if (!emitter) {
    return { success: false, message: "Dados do emitente não configurados" };
  }

  const items = await storage.getInvoiceItems(invoiceId);
  if (items.length === 0) {
    return { success: false, message: "A nota fiscal não possui itens" };
  }

  const certs = await storage.getCertificates();
  const activeCert = certs.find((c) => c.active);
  if (!activeCert) {
    return { success: false, message: "Nenhum certificado A1 ativo encontrado" };
  }

  let certData: CertificateData;
  try {
    certData = extractCertificate(activeCert.certificateBase64, activeCert.password);
  } catch (err: any) {
    return { success: false, message: `Erro ao ler certificado: ${err.message}` };
  }

  const now = new Date();
  if (certData.validTo < now) {
    return { success: false, message: "O certificado A1 está expirado" };
  }

  const { xml, chaveAcesso } = buildNfeXml(invoice, items, emitter, ambiente);

  await storage.updateInvoice(invoiceId, {
    xmlContent: xml,
    chaveAcesso,
    ambiente,
    status: "processando",
  });

  let xmlSigned: string;
  try {
    xmlSigned = signNfeXml(xml, certData);
  } catch (err: any) {
    await storage.updateInvoice(invoiceId, {
      status: "erro_assinatura",
      motivoRejeicao: `Erro na assinatura: ${err.message}`,
    });
    return { success: false, message: `Erro ao assinar XML: ${err.message}` };
  }

  await storage.updateInvoice(invoiceId, { xmlSigned });

  const sefazResponse = await sendToSefaz(xmlSigned, emitter.uf, ambiente, certData);

  if (sefazResponse.success) {
    await storage.updateInvoice(invoiceId, {
      status: "autorizada",
      protocolo: sefazResponse.protocolo,
      dhRecebimento: sefazResponse.dhRecbto,
      xmlProtocolo: sefazResponse.xmlProtocolo,
      codigoStatus: sefazResponse.cStat,
    });

    return {
      success: true,
      message: `NF-e autorizada! Protocolo: ${sefazResponse.protocolo}`,
      chaveAcesso,
      protocolo: sefazResponse.protocolo,
      status: "autorizada",
    };
  }

  if (sefazResponse.recibo) {
    await storage.updateInvoice(invoiceId, {
      status: "processando",
      recibo: sefazResponse.recibo,
      codigoStatus: sefazResponse.cStat,
    });

    await new Promise((r) => setTimeout(r, 3000));

    const consultaResponse = await consultRecibo(sefazResponse.recibo, emitter.uf, ambiente, certData);

    if (consultaResponse.success) {
      await storage.updateInvoice(invoiceId, {
        status: "autorizada",
        protocolo: consultaResponse.protocolo,
        dhRecebimento: consultaResponse.dhRecbto,
        xmlProtocolo: consultaResponse.xmlProtocolo,
        codigoStatus: consultaResponse.cStat,
      });

      return {
        success: true,
        message: `NF-e autorizada! Protocolo: ${consultaResponse.protocolo}`,
        chaveAcesso,
        protocolo: consultaResponse.protocolo,
        status: "autorizada",
      };
    }

    await storage.updateInvoice(invoiceId, {
      status: "rejeitada",
      motivoRejeicao: consultaResponse.xMotivo,
      codigoStatus: consultaResponse.cStat,
    });

    return {
      success: false,
      message: `NF-e rejeitada: ${consultaResponse.cStat} - ${consultaResponse.xMotivo}`,
      chaveAcesso,
      status: "rejeitada",
    };
  }

  await storage.updateInvoice(invoiceId, {
    status: "rejeitada",
    motivoRejeicao: sefazResponse.xMotivo,
    codigoStatus: sefazResponse.cStat,
  });

  return {
    success: false,
    message: `NF-e rejeitada: ${sefazResponse.cStat} - ${sefazResponse.xMotivo}`,
    chaveAcesso,
    status: "rejeitada",
  };
}

export async function gerarDanfe(invoiceId: number): Promise<Buffer> {
  const invoice = await storage.getInvoice(invoiceId);
  if (!invoice) throw new Error("Nota fiscal não encontrada");

  const emitter = await storage.getEmitter();
  if (!emitter) throw new Error("Dados do emitente não configurados");

  const items = await storage.getInvoiceItems(invoiceId);
  return generateDanfePdf(invoice, items, emitter);
}

export async function gerarXmlPreview(invoiceId: number, ambiente: string = "2"): Promise<{ xml: string; chaveAcesso: string }> {
  const invoice = await storage.getInvoice(invoiceId);
  if (!invoice) throw new Error("Nota fiscal não encontrada");

  const emitter = await storage.getEmitter();
  if (!emitter) throw new Error("Dados do emitente não configurados");

  const items = await storage.getInvoiceItems(invoiceId);
  const { xml, chaveAcesso } = buildNfeXml(invoice, items, emitter, ambiente);
  return { xml, chaveAcesso };
}
