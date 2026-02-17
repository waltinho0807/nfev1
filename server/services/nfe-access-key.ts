const UF_CODES: Record<string, string> = {
  AC: "12", AL: "27", AP: "16", AM: "13", BA: "29", CE: "23", DF: "53",
  ES: "32", GO: "52", MA: "21", MT: "51", MS: "50", MG: "31", PA: "15",
  PB: "25", PR: "41", PE: "26", PI: "22", RJ: "33", RN: "24", RS: "43",
  RO: "11", RR: "14", SC: "42", SP: "35", SE: "28", TO: "17",
};

function calcMod11(chave: string): string {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  const digits = chave.split("").reverse();
  for (let i = 0; i < digits.length; i++) {
    soma += parseInt(digits[i]) * pesos[i % pesos.length];
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return String(dv);
}

export interface AccessKeyParams {
  uf: string;
  dataEmissao: string;
  cnpj: string;
  modelo: string;
  serie: string;
  numero: string;
  tipoEmissao: string;
  codigoNumerico: string;
}

export function generateCodigoNumerico(): string {
  return String(Math.floor(Math.random() * 99999999)).padStart(8, "0");
}

export function parseDate(dateStr: string): { year: string; month: string; day: string } {
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    return { day: parts[0], month: parts[1], year: parts[2] };
  }
  const parts = dateStr.split("-");
  return { year: parts[0], month: parts[1], day: parts[2] };
}

export function generateAccessKey(params: AccessKeyParams): string {
  const ufCode = UF_CODES[params.uf] || "33";

  const cnpjClean = params.cnpj.replace(/\D/g, "");

  const { year, month } = parseDate(params.dataEmissao);
  const aamm = year.slice(2) + month;

  const serie = params.serie.padStart(3, "0");
  const numero = params.numero.padStart(9, "0");
  const modelo = params.modelo.padStart(2, "0");
  const codNum = params.codigoNumerico.padStart(8, "0");

  const chave43 =
    ufCode +
    aamm +
    cnpjClean.padStart(14, "0") +
    modelo +
    serie +
    numero +
    params.tipoEmissao +
    codNum;

  const dv = calcMod11(chave43);
  return chave43 + dv;
}

export function getUfCode(uf: string): string {
  return UF_CODES[uf] || "33";
}

export function formatAccessKey(key: string): string {
  return key.replace(/(\d{4})/g, "$1 ").trim();
}
