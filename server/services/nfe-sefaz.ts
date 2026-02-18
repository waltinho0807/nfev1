import https from "https";
import { XMLParser } from "fast-xml-parser";
import type { CertificateData } from "./nfe-signer";
import forge from "node-forge";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

const SEFAZ_URLS: Record<string, Record<string, string>> = {
  "2": {
    NFeAutorizacao: "https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
    NFeRetAutorizacao: "https://hom.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    NFeConsultaProtocolo: "https://hom.sefazvirtual.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
  },
  "1": {
    NFeAutorizacao: "https://nfe.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
    NFeRetAutorizacao: "https://nfe.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    NFeConsultaProtocolo: "https://nfe.sefazvirtual.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
  },
};

const SEFAZ_URLS_BY_UF: Record<string, Record<string, Record<string, string>>> = {
  SP: {
    "2": {
      NFeAutorizacao: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
      NFeRetAutorizacao: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
    },
    "1": {
      NFeAutorizacao: "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
    },
  },
  RJ: {
    "2": {
      NFeAutorizacao: "https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://hom.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    },
    "1": {
      NFeAutorizacao: "https://nfe.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    },
  },
  MG: {
    "2": {
      NFeAutorizacao: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
      NFeRetAutorizacao: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
    },
    "1": {
      NFeAutorizacao: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
      NFeRetAutorizacao: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
    },
  },
};

function getSefazUrl(uf: string, ambiente: string, service: string): string {
  const ufUrls = SEFAZ_URLS_BY_UF[uf];
  if (ufUrls && ufUrls[ambiente] && ufUrls[ambiente][service]) {
    return ufUrls[ambiente][service];
  }
  return SEFAZ_URLS[ambiente]?.[service] || SEFAZ_URLS["2"][service];
}

function buildSoapEnvelope(xmlSigned: string, service: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/${service}">
  <soap12:Body>
    <nfe:nfeDadosMsg>
      ${xmlSigned}
    </nfe:nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

function buildEnviNFe(xmlSigned: string, idLote: string): string {
  return `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <idLote>${idLote}</idLote>
  <indSinc>1</indSinc>
  ${xmlSigned}
</enviNFe>`;
}

function buildConsReciNFe(recibo: string, ambiente: string): string {
  return `<consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>${ambiente}</tpAmb>
  <nRec>${recibo}</nRec>
</consReciNFe>`;
}

async function soapRequest(
  url: string,
  soapBody: string,
  certData: CertificateData
): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const pfxKey = forge.pki.privateKeyInfoToPem(
      forge.pki.wrapRsaPrivateKey(
        forge.pki.privateKeyToAsn1(forge.pki.privateKeyFromPem(certData.privateKeyPem))
      )
    );

    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        "Content-Length": Buffer.byteLength(soapBody, "utf-8"),
      },
      key: certData.privateKeyPem,
      cert: certData.certificatePem,
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(data));
    });

    req.on("error", (err) => reject(err));
    req.write(soapBody);
    req.end();
  });
}

export interface SefazResponse {
  success: boolean;
  cStat: string;
  xMotivo: string;
  protocolo?: string;
  dhRecbto?: string;
  xmlProtocolo?: string;
  recibo?: string;
}

export async function sendToSefaz(
  xmlSigned: string,
  uf: string,
  ambiente: string,
  certData: CertificateData
): Promise<SefazResponse> {
  try {
    const idLote = String(Date.now()).slice(-15);
    const enviNFe = buildEnviNFe(xmlSigned, idLote);
    const soapEnvelope = buildSoapEnvelope(enviNFe, "NFeAutorizacao4");
    const url = getSefazUrl(uf, ambiente, "NFeAutorizacao");

    console.log(`[SEFAZ] Enviando NF-e para ${url} (ambiente ${ambiente === "1" ? "Produção" : "Homologação"})`);

    const response = await soapRequest(url, soapEnvelope, certData);
    const parsed = parser.parse(response);

    const retEnviNFe = extractRetEnviNFe(parsed);

    if (!retEnviNFe) {
      return {
        success: false,
        cStat: "999",
        xMotivo: "Não foi possível interpretar a resposta da SEFAZ",
      };
    }

    const cStat = String(retEnviNFe.cStat || "");
    const xMotivo = String(retEnviNFe.xMotivo || "");

    if (cStat === "104" || cStat === "100") {
      const protNFe = retEnviNFe.protNFe;
      if (protNFe) {
        const infProt = protNFe.infProt;
        const protCstat = String(infProt?.cStat || cStat);
        return {
          success: protCstat === "100",
          cStat: protCstat,
          xMotivo: String(infProt?.xMotivo || xMotivo),
          protocolo: String(infProt?.nProt || ""),
          dhRecbto: String(infProt?.dhRecbto || ""),
          xmlProtocolo: response,
        };
      }
    }

    if (cStat === "103") {
      const nRec = String(retEnviNFe.infRec?.nRec || "");
      return {
        success: false,
        cStat,
        xMotivo,
        recibo: nRec,
      };
    }

    return { success: false, cStat, xMotivo };
  } catch (err: any) {
    console.error("[SEFAZ] Erro:", err.message);
    return {
      success: false,
      cStat: "999",
      xMotivo: `Erro de comunicação: ${err.message}`,
    };
  }
}

export async function consultRecibo(
  recibo: string,
  uf: string,
  ambiente: string,
  certData: CertificateData
): Promise<SefazResponse> {
  try {
    const consReciNFe = buildConsReciNFe(recibo, ambiente);
    const soapEnvelope = buildSoapEnvelope(consReciNFe, "NFeRetAutorizacao4");
    const url = getSefazUrl(uf, ambiente, "NFeRetAutorizacao");

    const response = await soapRequest(url, soapEnvelope, certData);
    const parsed = parser.parse(response);
    const retConsReciNFe = extractRetConsReciNFe(parsed);

    if (!retConsReciNFe) {
      return {
        success: false,
        cStat: "999",
        xMotivo: "Não foi possível interpretar a resposta da consulta",
      };
    }

    const cStat = String(retConsReciNFe.cStat || "");
    const protNFe = retConsReciNFe.protNFe;

    if (protNFe) {
      const infProt = protNFe.infProt;
      return {
        success: String(infProt?.cStat) === "100",
        cStat: String(infProt?.cStat || cStat),
        xMotivo: String(infProt?.xMotivo || ""),
        protocolo: String(infProt?.nProt || ""),
        dhRecbto: String(infProt?.dhRecbto || ""),
        xmlProtocolo: response,
      };
    }

    return { success: false, cStat, xMotivo: String(retConsReciNFe.xMotivo || "") };
  } catch (err: any) {
    return {
      success: false,
      cStat: "999",
      xMotivo: `Erro de comunicação: ${err.message}`,
    };
  }
}

function extractRetEnviNFe(parsed: any): any {
  if (!parsed) return null;
  const body = parsed?.["soap12:Envelope"]?.["soap12:Body"] ||
               parsed?.Envelope?.Body ||
               parsed?.["soapenv:Envelope"]?.["soapenv:Body"];
  if (!body) return findKey(parsed, "retEnviNFe");
  return findKey(body, "retEnviNFe");
}

function extractRetConsReciNFe(parsed: any): any {
  if (!parsed) return null;
  const body = parsed?.["soap12:Envelope"]?.["soap12:Body"] ||
               parsed?.Envelope?.Body;
  if (!body) return findKey(parsed, "retConsReciNFe");
  return findKey(body, "retConsReciNFe");
}

function findKey(obj: any, key: string): any {
  if (!obj || typeof obj !== "object") return null;
  if (obj[key]) return obj[key];
  for (const k of Object.keys(obj)) {
    if (k.endsWith(key) || k.includes(key)) return obj[k];
    const found = findKey(obj[k], key);
    if (found) return found;
  }
  return null;
}
