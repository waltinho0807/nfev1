import { db } from "./db";
import { products, emitters } from "@shared/schema";

export async function seedDatabase() {
  try {
    const existingProducts = await db.select().from(products);
    if (existingProducts.length > 0) return;

    await db.insert(products).values([
      {
        codigo: "0001",
        descricao: "Perfume Masculino Brand Collection 100ml",
        ncm: "3303.00.10",
        cfop: "5102",
        unidade: "UN",
        valorUnitario: "79.00",
        ean: "SEM GTIN",
        origem: "0",
        csosn: "102",
        cstPis: "49",
        cstCofins: "49",
      },
      {
        codigo: "0002",
        descricao: "BRAND Collection N 005",
        ncm: "3303.00.10",
        cfop: "5102",
        unidade: "UN",
        valorUnitario: "59.00",
        ean: "SEM GTIN",
        origem: "0",
        csosn: "102",
        cstPis: "49",
        cstCofins: "49",
      },
      {
        codigo: "0003",
        descricao: "Perfume Feminino Brand Collection 007 Eau de Parfum",
        ncm: "3303.00.10",
        cfop: "5102",
        unidade: "UN",
        valorUnitario: "59.00",
        ean: "SEM GTIN",
        origem: "0",
        csosn: "102",
        cstPis: "49",
        cstCofins: "49",
      },
      {
        codigo: "0004",
        descricao: "Kit Presente Perfumes Femininos 3x50ml",
        ncm: "3303.00.10",
        cfop: "5102",
        unidade: "UN",
        valorUnitario: "149.90",
        ean: "SEM GTIN",
        origem: "0",
        csosn: "102",
        cstPis: "49",
        cstCofins: "49",
      },
      {
        codigo: "0005",
        descricao: "Creme Hidratante Corporal 200ml",
        ncm: "3304.99.90",
        cfop: "5102",
        unidade: "UN",
        valorUnitario: "39.90",
        ean: "SEM GTIN",
        origem: "0",
        csosn: "102",
        cstPis: "49",
        cstCofins: "49",
      },
    ]);

    console.log("Seed: Products inserted");
  } catch (err) {
    console.error("Seed error:", err);
  }
}
