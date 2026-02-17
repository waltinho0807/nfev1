import { XMLBuilder } from "fast-xml-parser";
import type { Invoice, InvoiceItem, Emitter } from "@shared/schema";
import { generateAccessKey, generateCodigoNumerico, getUfCode, parseDate } from "./nfe-access-key";

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  suppressEmptyNode: true,
});

function cleanCpfCnpj(value: string): string {
  return value.replace(/\D/g, "");
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

  const detItems = items.map((item, index) => {
    const vProd = dec2(item.valorTotal);
    return {
      "@_nItem": String(index + 1),
      prod: {
        cProd: item.codigo,
        cEAN: item.ean || "SEM GTIN",
        xProd: item.descricao,
        NCM: item.ncm,
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
          nNF: invoice.numero || "000001",
          dhEmi: dhEmi,
          dhSaiEnt: dhSaiEnt,
          tpNF: invoice.tipoSaida,
          idDest: "1",
          cMunFG: emitter.codigoMunicipio || "3304557",
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
        emit: {
          CNPJ: cnpjClean,
          xNome: emitter.razaoSocial,
          ...(emitter.nomeFantasia ? { xFant: emitter.nomeFantasia } : {}),
          enderEmit: {
            xLgr: emitter.logradouro,
            nro: emitter.numero,
            ...(emitter.complemento ? { xCpl: emitter.complemento } : {}),
            xBairro: emitter.bairro,
            cMun: emitter.codigoMunicipio || "3304557",
            xMun: emitter.municipio,
            UF: emitter.uf,
            CEP: emitter.cep.replace(/\D/g, ""),
            cPais: "1058",
            xPais: "BRASIL",
            ...(emitter.telefone ? { fone: emitter.telefone.replace(/\D/g, "") } : {}),
          },
          ...(emitter.inscricaoEstadual ? { IE: emitter.inscricaoEstadual.replace(/\D/g, "") } : {}),
          CRT: emitter.regimeTributario || "1",
        },
        dest: {
          ...(isDestPJ ? { CNPJ: destCpfCnpj } : { CPF: destCpfCnpj }),
          xNome: invoice.destNome,
          enderDest: {
            xLgr: invoice.destLogradouro || "",
            nro: invoice.destNumero || "S/N",
            ...(invoice.destComplemento ? { xCpl: invoice.destComplemento } : {}),
            xBairro: invoice.destBairro || "",
            cMun: "3304557",
            xMun: invoice.destMunicipio || "",
            UF: invoice.destUf || emitter.uf,
            CEP: (invoice.destCep || "").replace(/\D/g, ""),
            cPais: "1058",
            xPais: "BRASIL",
            ...(invoice.destTelefone ? { fone: invoice.destTelefone.replace(/\D/g, "") } : {}),
          },
          indIEDest: "9",
          ...(invoice.destEmail ? { email: invoice.destEmail } : {}),
        },
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
