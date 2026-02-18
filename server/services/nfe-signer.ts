import forge from "node-forge";
import { SignedXml } from "xml-crypto";

export interface CertificateData {
  privateKeyPem: string;
  certificatePem: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
}

export function extractCertificate(pfxBase64: string, password: string): CertificateData {
  const pfxBuffer = Buffer.from(pfxBase64, "base64");
  const pfxDer = pfxBuffer.toString("binary");
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

  let privateKey: forge.pki.PrivateKey | null = null;
  let certificate: forge.pki.Certificate | null = null;

  const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBags = bags[forge.pki.oids.certBag];
  if (certBags && certBags.length > 0) {
    certificate = certBags[0].cert || null;
  }

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const shroudedKeyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
  if (shroudedKeyBag && shroudedKeyBag.length > 0) {
    privateKey = shroudedKeyBag[0].key || null;
  }

  if (!privateKey) {
    const keyBags2 = p12.getBags({ bagType: forge.pki.oids.pkcs8KeyBag });
    const keyBag = keyBags2[forge.pki.oids.pkcs8KeyBag];
    if (keyBag && keyBag.length > 0) {
      privateKey = keyBag[0].key || null;
    }
  }

  if (!privateKey || !certificate) {
    throw new Error("Não foi possível extrair chave privada ou certificado do arquivo PFX");
  }

  const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
  const certificatePem = forge.pki.certificateToPem(certificate);

  return {
    privateKeyPem,
    certificatePem,
    subject: certificate.subject.getField("CN")?.value || "",
    validFrom: certificate.validity.notBefore,
    validTo: certificate.validity.notAfter,
  };
}

export function signNfeXml(xml: string, certData: CertificateData): string {
  const sig = new SignedXml({
    privateKey: certData.privateKeyPem,
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
  });

  const infNFeIdMatch = xml.match(/Id="(NFe\d+)"/);
  if (!infNFeIdMatch) {
    throw new Error("Não foi possível encontrar o Id da infNFe no XML");
  }
  const infNFeId = infNFeIdMatch[1];

  sig.addReference({
    xpath: `//*[@Id='${infNFeId}']`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  });

  const certClean = certData.certificatePem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s/g, "");

  sig.keyInfoProvider = {
    getKeyInfo: () => `<X509Data><X509Certificate>${certClean}</X509Certificate></X509Data>`,
    getKey: () => Buffer.from(certData.privateKeyPem),
  };

  sig.computeSignature(xml, {
    location: { reference: `//*[@Id='${infNFeId}']`, action: "after" },
  });

  return sig.getSignedXml();
}
