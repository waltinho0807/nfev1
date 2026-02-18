import https from "https";
import { XMLParser } from "fast-xml-parser";
import type { CertificateData } from "./nfe-signer";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

const SVRS_HOM: Record<string, string> = {
  NFeAutorizacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
  NFeRetAutorizacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
  NFeConsultaProtocolo: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsultaProtocolo/NfeConsultaProtocolo4.asmx",
};

const SVRS_PROD: Record<string, string> = {
  NFeAutorizacao: "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
  NFeRetAutorizacao: "https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
  NFeConsultaProtocolo: "https://nfe.svrs.rs.gov.br/ws/NfeConsultaProtocolo/NfeConsultaProtocolo4.asmx",
};

const SEFAZ_URLS_BY_UF: Record<string, Record<string, Record<string, string>>> = {
  AM: {
    "2": {
      NFeAutorizacao: "https://homnfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4",
      NFeRetAutorizacao: "https://homnfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4",
    },
    "1": {
      NFeAutorizacao: "https://nfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4",
      NFeRetAutorizacao: "https://nfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4",
    },
  },
  BA: {
    "2": {
      NFeAutorizacao: "https://hnfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://hnfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    },
    "1": {
      NFeAutorizacao: "https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    },
  },
  GO: {
    "2": {
      NFeAutorizacao: "https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://homolog.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4?wsdl",
    },
    "1": {
      NFeAutorizacao: "https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://nfe.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4?wsdl",
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
  MS: {
    "2": {
      NFeAutorizacao: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4",
      NFeRetAutorizacao: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeRetAutorizacao4",
    },
    "1": {
      NFeAutorizacao: "https://nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4",
      NFeRetAutorizacao: "https://nfe.sefaz.ms.gov.br/ws/NFeRetAutorizacao4",
    },
  },
  MT: {
    "2": {
      NFeAutorizacao: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4?wsdl",
    },
    "1": {
      NFeAutorizacao: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4?wsdl",
    },
  },
  PE: {
    "2": {
      NFeAutorizacao: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4",
      NFeRetAutorizacao: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4",
    },
    "1": {
      NFeAutorizacao: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4",
      NFeRetAutorizacao: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4",
    },
  },
  PR: {
    "2": {
      NFeAutorizacao: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4?wsdl",
    },
    "1": {
      NFeAutorizacao: "https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4?wsdl",
    },
  },
  RS: {
    "2": {
      NFeAutorizacao: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    },
    "1": {
      NFeAutorizacao: "https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    },
  },
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
};

const SVRS_STATES = [
  "AC", "AL", "AP", "CE", "DF", "ES", "MA", "PA", "PB", "PI",
  "RJ", "RN", "RO", "RR", "SC", "SE", "TO",
];

function getSefazUrl(uf: string, ambiente: string, service: string): string {
  const ufUrls = SEFAZ_URLS_BY_UF[uf];
  if (ufUrls && ufUrls[ambiente] && ufUrls[ambiente][service]) {
    return ufUrls[ambiente][service];
  }
  if (SVRS_STATES.includes(uf) || !ufUrls) {
    return ambiente === "1" ? SVRS_PROD[service] : SVRS_HOM[service];
  }
  return ambiente === "1" ? SVRS_PROD[service] : SVRS_HOM[service];
}

function buildSoapEnvelope(xmlContent: string, service: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/${service}">
  <soap12:Body>
    <nfe:nfeDadosMsg>
      ${xmlContent}
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

    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
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
      res.on("end", () => {
        console.log(`[SEFAZ] Response status: ${res.statusCode}`);
        console.log(`[SEFAZ] Response headers: ${JSON.stringify(res.headers).substring(0, 500)}`);
        console.log(`[SEFAZ] Response body (first 2000 chars): ${data.substring(0, 2000)}`);
        resolve(data);
      });
    });

    req.on("error", (err) => {
      console.error(`[SEFAZ] Request error: ${err.message}`);
      reject(err);
    });

    req.setTimeout(30000, () => {
      console.error("[SEFAZ] Request timeout after 30s");
      req.destroy(new Error("Request timeout after 30 seconds"));
    });

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

    console.log(`[SEFAZ] Enviando NF-e para ${url} (UF: ${uf}, ambiente ${ambiente === "1" ? "Produção" : "Homologação"})`);

    const response = await soapRequest(url, soapEnvelope, certData);

    if (!response || response.trim().length === 0) {
      return {
        success: false,
        cStat: "999",
        xMotivo: "SEFAZ retornou resposta vazia",
      };
    }

    let parsed: any;
    try {
      parsed = parser.parse(response);
    } catch (parseErr: any) {
      console.error(`[SEFAZ] Erro ao parsear XML de resposta: ${parseErr.message}`);
      console.error(`[SEFAZ] Resposta raw: ${response.substring(0, 3000)}`);
      return {
        success: false,
        cStat: "999",
        xMotivo: `Erro ao interpretar resposta SEFAZ: ${parseErr.message}`,
      };
    }

    console.log(`[SEFAZ] Parsed response keys: ${JSON.stringify(Object.keys(parsed))}`);

    const retEnviNFe = extractDeep(parsed, "retEnviNFe");

    if (!retEnviNFe) {
      console.error(`[SEFAZ] retEnviNFe não encontrado na resposta`);
      console.error(`[SEFAZ] Parsed response: ${JSON.stringify(parsed).substring(0, 3000)}`);

      const fault = extractDeep(parsed, "Fault") || extractDeep(parsed, "fault");
      if (fault) {
        const faultString = fault.faultstring || fault.Reason?.Text || fault.Code?.Value || JSON.stringify(fault);
        return {
          success: false,
          cStat: "999",
          xMotivo: `Erro SEFAZ (SOAP Fault): ${typeof faultString === 'string' ? faultString : JSON.stringify(faultString)}`,
        };
      }

      return {
        success: false,
        cStat: "999",
        xMotivo: "Não foi possível interpretar a resposta da SEFAZ. Verifique os dados do emitente e do certificado.",
      };
    }

    const cStat = String(retEnviNFe.cStat || "");
    const xMotivo = String(retEnviNFe.xMotivo || "");

    console.log(`[SEFAZ] retEnviNFe cStat=${cStat}, xMotivo=${xMotivo}`);

    if (cStat === "104" || cStat === "100") {
      const protNFe = retEnviNFe.protNFe;
      if (protNFe) {
        const infProt = protNFe.infProt;
        const protCstat = String(infProt?.cStat || cStat);
        const protMotivo = String(infProt?.xMotivo || xMotivo);
        console.log(`[SEFAZ] protNFe cStat=${protCstat}, xMotivo=${protMotivo}`);
        return {
          success: protCstat === "100",
          cStat: protCstat,
          xMotivo: protMotivo,
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
    console.error("[SEFAZ] Erro geral:", err.message, err.stack);
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

    console.log(`[SEFAZ] Consultando recibo ${recibo} em ${url}`);

    const response = await soapRequest(url, soapEnvelope, certData);

    let parsed: any;
    try {
      parsed = parser.parse(response);
    } catch (parseErr: any) {
      return {
        success: false,
        cStat: "999",
        xMotivo: `Erro ao interpretar resposta da consulta: ${parseErr.message}`,
      };
    }

    const retConsReciNFe = extractDeep(parsed, "retConsReciNFe");

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

function extractDeep(obj: any, targetKey: string): any {
  if (!obj || typeof obj !== "object") return null;
  for (const key of Object.keys(obj)) {
    const cleanKey = key.replace(/^.*:/, "");
    if (cleanKey === targetKey) return obj[key];
    const found = extractDeep(obj[key], targetKey);
    if (found) return found;
  }
  return null;
}
