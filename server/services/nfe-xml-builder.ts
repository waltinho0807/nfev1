import { XMLBuilder } from "fast-xml-parser";
import type { Invoice, InvoiceItem, Emitter } from "@shared/schema";
import { generateAccessKey, generateCodigoNumerico, getUfCode, parseDate } from "./nfe-access-key";

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  suppressEmptyNode: false,
});

function cleanCpfCnpj(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(digits[10]) === check;
}

function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const weights1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const weights2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(digits[12]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(digits[13]) === check;
}

function cleanNCM(value: string): string {
  return value.replace(/\D/g, "");
}

function cleanCep(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.padStart(8, "0").slice(0, 8);
}

function formatDateTime(date: string, hora: string): string {
  const { year, month, day } = parseDate(date);
  return `${year}-${month}-${day}T${hora}-03:00`;
}

function dec2(value: string | null | undefined): string {
  const num = parseFloat(value || "0");
  return num.toFixed(2);
}

function dec4(value: string | null | undefined): string {
  const num = parseFloat(value || "0");
  return num.toFixed(4);
}

export interface NfeXmlResult {
  xml: string;
  chaveAcesso: string;
  codigoNumerico: string;
}

export function buildNfeXml(
  invoice: Invoice,
  items: InvoiceItem[],
  emitter: Emitter,
  ambiente: string = "2"
): NfeXmlResult {
  const cnpjClean = cleanCpfCnpj(emitter.cnpj);
  const codigoNumerico = generateCodigoNumerico();

  const chaveAcesso = generateAccessKey({
    uf: emitter.uf,
    dataEmissao: invoice.dataEmissao,
    cnpj: cnpjClean,
    modelo: "55",
    serie: invoice.serie,
    numero: invoice.numero || "000001",
    tipoEmissao: "1",
    codigoNumerico,
  });

  const dhEmi = formatDateTime(invoice.dataEmissao, invoice.horaEmissao);
  const dhSaiEnt = invoice.dataSaida && invoice.horaSaida
    ? formatDateTime(invoice.dataSaida, invoice.horaSaida)
    : dhEmi;

  const destCpfCnpj = cleanCpfCnpj(invoice.destCpfCnpj);
  const isDestPJ = destCpfCnpj.length > 11;

  if (isDestPJ) {
    if (!isValidCnpj(destCpfCnpj)) {
      throw new Error(`CNPJ do destinatário inválido: ${invoice.destCpfCnpj}. Verifique os dígitos verificadores.`);
    }
  } else {
    if (!isValidCpf(destCpfCnpj)) {
      throw new Error(`CPF do destinatário inválido: ${invoice.destCpfCnpj}. Verifique os dígitos verificadores.`);
    }
  }

  const cMunEmit = emitter.codigoMunicipio ? emitter.codigoMunicipio.replace(/\D/g, "") : "";
  if (!cMunEmit) {
    console.warn("[NF-e XML] AVISO: Código do município do emitente não configurado. Configure no cadastro do emitente.");
  }

  const ieValue = emitter.inscricaoEstadual || "";
  const ieUpper = ieValue.toUpperCase().trim();
  const isIeIsento = ieUpper === "ISENTO" || ieUpper === "";
  const ieClean = ieValue.replace(/\D/g, "");

  const detItems = items.map((item, index) => {
    const vProd = dec2(item.valorTotal);
    return {
      "@_nItem": String(index + 1),
      prod: {
        cProd: item.codigo,
        cEAN: item.ean || "SEM GTIN",
        xProd: ambiente === "2" ? "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : item.descricao,
        NCM: cleanNCM(item.ncm),
        CFOP: item.cfop,
        uCom: item.unidade,
        qCom: dec4(item.quantidade),
        vUnCom: dec4(item.valorUnitario),
        vProd: vProd,
        cEANTrib: item.ean || "SEM GTIN",
        uTrib: item.unidade,
        qTrib: dec4(item.quantidade),
        vUnTrib: dec4(item.valorUnitario),
        indTot: "1",
      },
      imposto: {
        ICMS: {
          ICMSSN102: {
            orig: item.origem || "0",
            CSOSN: item.csosn || "102",
          },
        },
        PIS: {
          PISOutr: {
            CST: item.cstPis || "49",
            vBC: "0.00",
            pPIS: "0.00",
            vPIS: "0.00",
          },
        },
        COFINS: {
          COFINSOutr: {
            CST: item.cstCofins || "49",
            vBC: "0.00",
            pCOFINS: "0.00",
            vCOFINS: "0.00",
          },
        },
      },
    };
  });

  const totalProd = dec2(invoice.totalProdutos);
  const totalNota = dec2(invoice.totalNota);

  const emitObj: Record<string, any> = {
    CNPJ: cnpjClean,
    xNome: emitter.razaoSocial,
  };
  if (emitter.nomeFantasia) {
    emitObj.xFant = emitter.nomeFantasia;
  }
  emitObj.enderEmit = {
    xLgr: emitter.logradouro,
    nro: emitter.numero,
    ...(emitter.complemento ? { xCpl: emitter.complemento } : {}),
    xBairro: emitter.bairro,
    cMun: cMunEmit || "0000000",
    xMun: emitter.municipio,
    UF: emitter.uf,
    CEP: cleanCep(emitter.cep),
    cPais: "1058",
    xPais: "BRASIL",
    ...(emitter.telefone ? { fone: emitter.telefone.replace(/\D/g, "") } : {}),
  };

  if (isIeIsento) {
    emitObj.IE = "ISENTO";
  } else {
    emitObj.IE = ieClean;
  }
  emitObj.CRT = emitter.regimeTributario || "1";

  const destObj: Record<string, any> = {};
  if (isDestPJ) {
    destObj.CNPJ = destCpfCnpj;
  } else {
    destObj.CPF = destCpfCnpj;
  }
  destObj.xNome = ambiente === "2" ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : invoice.destNome;
  const cMunDest = invoice.destCodigoMunicipio ? invoice.destCodigoMunicipio.replace(/\D/g, "") : cMunEmit;
  if (!cMunDest) {
    console.warn("[NF-e XML] AVISO: Código do município do destinatário não configurado.");
  }
  destObj.enderDest = {
    xLgr: invoice.destLogradouro || "RUA NAO INFORMADA",
    nro: invoice.destNumero || "S/N",
    ...(invoice.destComplemento ? { xCpl: invoice.destComplemento } : {}),
    xBairro: invoice.destBairro || "NAO INFORMADO",
    cMun: cMunDest || "0000000",
    xMun: invoice.destMunicipio || "",
    UF: invoice.destUf || emitter.uf,
    CEP: cleanCep(invoice.destCep || "00000000"),
    cPais: "1058",
    xPais: "BRASIL",
    ...(invoice.destTelefone ? { fone: invoice.destTelefone.replace(/\D/g, "") } : {}),
  };
  destObj.indIEDest = "9";
  if (invoice.destEmail) {
    destObj.email = invoice.destEmail;
  }

  const nfeData = {
    NFe: {
      "@_xmlns": "http://www.portalfiscal.inf.br/nfe",
      infNFe: {
        "@_versao": "4.00",
        "@_Id": `NFe${chaveAcesso}`,
        ide: {
          cUF: getUfCode(emitter.uf),
          cNF: codigoNumerico,
          natOp: invoice.naturezaOperacao,
          mod: "55",
          serie: invoice.serie,
          nNF: String(parseInt(invoice.numero || "1", 10)),
          dhEmi: dhEmi,
          dhSaiEnt: dhSaiEnt,
          tpNF: invoice.tipoSaida,
          idDest: "1",
          cMunFG: cMunEmit || "0000000",
          tpImp: "1",
          tpEmis: "1",
          cDV: chaveAcesso.slice(-1),
          tpAmb: ambiente,
          finNFe: invoice.finalidade,
          indFinal: invoice.consumidorFinal ? "1" : "0",
          indPres: invoice.indicadorPresenca,
          procEmi: "0",
          verProc: "NFe-System-1.0",
        },
        emit: emitObj,
        dest: destObj,
        det: detItems,
        total: {
          ICMSTot: {
            vBC: "0.00",
            vICMS: "0.00",
            vICMSDeson: "0.00",
            vFCPUFDest: "0.00",
            vICMSUFDest: "0.00",
            vICMSUFRemet: "0.00",
            vFCP: "0.00",
            vBCST: "0.00",
            vST: "0.00",
            vFCPST: "0.00",
            vFCPSTRet: "0.00",
            vProd: totalProd,
            vFrete: dec2(invoice.valorFrete),
            vSeg: dec2(invoice.valorSeguro),
            vDesc: dec2(invoice.desconto),
            vII: "0.00",
            vIPI: "0.00",
            vIPIDevol: "0.00",
            vPIS: "0.00",
            vCOFINS: "0.00",
            vOutro: dec2(invoice.outrasDespesas),
            vNF: totalNota,
          },
        },
        transp: {
          modFrete: invoice.modalidadeFrete || "9",
        },
        pag: {
          detPag: {
            tPag: "01",
            vPag: totalNota,
          },
        },
        ...(invoice.informacoesComplementares ? {
          infAdic: {
            infCpl: invoice.informacoesComplementares,
          },
        } : {}),
      },
    },
  };

  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const xmlBody = builder.build(nfeData);
  const xml = xmlHeader + "\n" + xmlBody;

  return { xml, chaveAcesso, codigoNumerico };
}
