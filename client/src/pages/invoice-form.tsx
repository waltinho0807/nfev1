import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, X, Plus, Trash2, FileText } from "lucide-react";
import { maskCnpj, maskCpf, maskCep, maskPhone } from "@/lib/masks";
import type { Product, Emitter, InsertInvoice, InsertInvoiceItem } from "@shared/schema";

const ufOptions = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const naturezaOptions = [
  "Venda",
  "Venda de mercadoria",
  "Bonificação",
  "Devolução",
  "Remessa para conserto",
  "Transferência",
];

interface InvoiceItemForm {
  productId: number | null;
  descricao: string;
  codigo: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: string;
  valorUnitario: string;
  valorTotal: string;
  ean: string;
  origem: string;
  csosn: string;
  cstPis: string;
  cstCofins: string;
}

function getNow() {
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR");
  const time = now.toLocaleTimeString("pt-BR");
  return { date, time };
}

export default function InvoiceForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { date: nowDate, time: nowTime } = getNow();

  const { data: emitter } = useQuery<Emitter | null>({
    queryKey: ["/api/emitter"],
  });
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const [form, setForm] = useState<Partial<InsertInvoice>>({
    serie: "1",
    naturezaOperacao: "Venda",
    tipoSaida: "1",
    finalidade: "1",
    indicadorPresenca: "0",
    dataEmissao: nowDate,
    horaEmissao: nowTime,
    dataSaida: nowDate,
    horaSaida: nowTime,
    destNome: "",
    destTipoPessoa: "F",
    destCpfCnpj: "",
    destCep: "",
    destUf: "",
    destMunicipio: "",
    destCodigoMunicipio: "",
    destBairro: "",
    destLogradouro: "",
    destNumero: "",
    destComplemento: "",
    destTelefone: "",
    destEmail: "",
    consumidorFinal: true,
    valorFrete: "0",
    valorSeguro: "0",
    outrasDespesas: "0",
    desconto: "0",
    modalidadeFrete: "9",
    informacoesComplementares: "",
    status: "rascunho",
  });

  const [items, setItems] = useState<InvoiceItemForm[]>([]);

  const totals = useMemo(() => {
    const totalProdutos = items.reduce((sum, item) => {
      return sum + (parseFloat(item.valorTotal) || 0);
    }, 0);
    const frete = parseFloat(form.valorFrete || "0") || 0;
    const seguro = parseFloat(form.valorSeguro || "0") || 0;
    const despesas = parseFloat(form.outrasDespesas || "0") || 0;
    const desconto = parseFloat(form.desconto || "0") || 0;
    const totalNota = totalProdutos + frete + seguro + despesas - desconto;
    return { totalProdutos, totalNota };
  }, [items, form.valorFrete, form.valorSeguro, form.outrasDespesas, form.desconto]);

  function addItem() {
    setItems([
      ...items,
      {
        productId: null,
        descricao: "",
        codigo: "",
        ncm: "",
        cfop: "5102",
        unidade: "UN",
        quantidade: "1",
        valorUnitario: "",
        valorTotal: "0",
        ean: "SEM GTIN",
        origem: "0",
        csosn: "102",
        cstPis: "49",
        cstCofins: "49",
      },
    ]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: string) {
    const updated = [...items];
    (updated[index] as any)[field] = value;

    if (field === "quantidade" || field === "valorUnitario") {
      const qty = parseFloat(updated[index].quantidade) || 0;
      const price = parseFloat(updated[index].valorUnitario) || 0;
      updated[index].valorTotal = (qty * price).toFixed(2);
    }

    setItems(updated);
  }

  function selectProduct(index: number, productId: string) {
    const product = products?.find((p) => p.id === parseInt(productId));
    if (!product) return;
    const updated = [...items];
    updated[index] = {
      productId: product.id,
      descricao: product.descricao,
      codigo: product.codigo,
      ncm: product.ncm,
      cfop: product.cfop,
      unidade: product.unidade,
      quantidade: updated[index].quantidade || "1",
      valorUnitario: product.valorUnitario,
      valorTotal: (parseFloat(updated[index].quantidade || "1") * parseFloat(product.valorUnitario)).toFixed(2),
      ean: product.ean || "SEM GTIN",
      origem: product.origem,
      csosn: product.csosn || "102",
      cstPis: product.cstPis || "49",
      cstCofins: product.cstCofins || "49",
    };
    setItems(updated);
  }

  const saveMutation = useMutation({
    mutationFn: async (data: { invoice: Partial<InsertInvoice>; items: InvoiceItemForm[] }) => {
      const res = await apiRequest("POST", "/api/invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Nota fiscal salva com sucesso" });
      navigate("/invoices");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar nota", description: err.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.destNome || !form.destCpfCnpj || !form.naturezaOperacao) {
      toast({ title: "Preencha os dados do destinatário", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Adicione pelo menos um item", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      invoice: {
        ...form,
        totalProdutos: totals.totalProdutos.toFixed(2),
        totalNota: totals.totalNota.toFixed(2),
      },
      items,
    });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-invoice-form-title">Nova Nota Fiscal</h1>
          <p className="text-muted-foreground text-sm mt-1">NF-e Modelo 55</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/invoices")} data-testid="button-cancel-invoice">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saveMutation.isPending} data-testid="button-save-invoice">
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Dados da Nota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Saída</Label>
                <Select value={form.tipoSaida || "1"} onValueChange={(v) => setForm({ ...form, tipoSaida: v })}>
                  <SelectTrigger data-testid="select-tipo-saida">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Emissão Própria</SelectItem>
                    <SelectItem value="0">Entrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Série</Label>
                <Input value={form.serie || ""} onChange={(e) => setForm({ ...form, serie: e.target.value })} data-testid="input-serie" />
              </div>
              <div className="space-y-2">
                <Label>Natureza de Operação</Label>
                <Select value={form.naturezaOperacao || ""} onValueChange={(v) => setForm({ ...form, naturezaOperacao: v })}>
                  <SelectTrigger data-testid="select-natureza">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {naturezaOptions.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Finalidade</Label>
                <Select value={form.finalidade || "1"} onValueChange={(v) => setForm({ ...form, finalidade: v })}>
                  <SelectTrigger data-testid="select-finalidade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">NF-e Normal</SelectItem>
                    <SelectItem value="2">NF-e Complementar</SelectItem>
                    <SelectItem value="3">NF-e de Ajuste</SelectItem>
                    <SelectItem value="4">Devolução</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Data de Emissão</Label>
                <Input value={form.dataEmissao || ""} onChange={(e) => setForm({ ...form, dataEmissao: e.target.value })} data-testid="input-data-emissao" />
              </div>
              <div className="space-y-2">
                <Label>Hora de Emissão</Label>
                <Input value={form.horaEmissao || ""} onChange={(e) => setForm({ ...form, horaEmissao: e.target.value })} data-testid="input-hora-emissao" />
              </div>
              <div className="space-y-2">
                <Label>Data Saída</Label>
                <Input value={form.dataSaida || ""} onChange={(e) => setForm({ ...form, dataSaida: e.target.value })} data-testid="input-data-saida" />
              </div>
              <div className="space-y-2">
                <Label>Hora Saída</Label>
                <Input value={form.horaSaida || ""} onChange={(e) => setForm({ ...form, horaSaida: e.target.value })} data-testid="input-hora-saida" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Indicador de Presença</Label>
                <Select value={form.indicadorPresenca || "0"} onValueChange={(v) => setForm({ ...form, indicadorPresenca: v })}>
                  <SelectTrigger data-testid="select-presenca">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 - Não se aplica</SelectItem>
                    <SelectItem value="1">1 - Presencial</SelectItem>
                    <SelectItem value="2">2 - Internet</SelectItem>
                    <SelectItem value="3">3 - Teleatendimento</SelectItem>
                    <SelectItem value="4">4 - Entrega a domicílio</SelectItem>
                    <SelectItem value="9">9 - Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Consumidor Final</Label>
                <Select
                  value={form.consumidorFinal ? "true" : "false"}
                  onValueChange={(v) => setForm({ ...form, consumidorFinal: v === "true" })}
                >
                  <SelectTrigger data-testid="select-consumidor-final">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {emitter && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Emitente (pré-preenchido)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Razão Social</p>
                  <p className="text-sm font-medium" data-testid="text-emitter-razao">{emitter.razaoSocial}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CNPJ</p>
                  <p className="text-sm font-medium">{emitter.cnpj}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IE</p>
                  <p className="text-sm font-medium">{emitter.inscricaoEstadual || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Endereço</p>
                  <p className="text-sm font-medium">
                    {emitter.logradouro}, {emitter.numero} - {emitter.bairro}, {emitter.municipio}/{emitter.uf}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Regime Tributário</p>
                  <p className="text-sm font-medium">
                    {emitter.regimeTributario === "1" ? "Simples Nacional" : emitter.regimeTributario === "3" ? "Regime Normal" : "SN - Excesso"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Destinatário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                <Label>Nome do Contato *</Label>
                <Input value={form.destNome || ""} onChange={(e) => setForm({ ...form, destNome: e.target.value })} placeholder="Nome completo" data-testid="input-dest-nome" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Pessoa</Label>
                <Select value={form.destTipoPessoa || "F"} onValueChange={(v) => setForm({ ...form, destTipoPessoa: v })}>
                  <SelectTrigger data-testid="select-dest-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F">Física</SelectItem>
                    <SelectItem value="J">Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.destTipoPessoa === "J" ? "CNPJ *" : "CPF *"}</Label>
                <Input
                  value={form.destCpfCnpj || ""}
                  onChange={(e) => setForm({ ...form, destCpfCnpj: form.destTipoPessoa === "J" ? maskCnpj(e.target.value) : maskCpf(e.target.value) })}
                  placeholder={form.destTipoPessoa === "J" ? "00.000.000/0000-00" : "000.000.000-00"}
                  maxLength={form.destTipoPessoa === "J" ? 18 : 14}
                  data-testid="input-dest-cpf-cnpj"
                />
              </div>
              {form.destTipoPessoa === "J" && (
                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input value={form.destInscricaoEstadual || ""} onChange={(e) => setForm({ ...form, destInscricaoEstadual: e.target.value })} placeholder="IE" data-testid="input-dest-ie" />
                </div>
              )}
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input value={form.destCep || ""} onChange={(e) => setForm({ ...form, destCep: maskCep(e.target.value) })} placeholder="00000-000" maxLength={9} data-testid="input-dest-cep" />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={form.destUf || ""} onValueChange={(v) => setForm({ ...form, destUf: v })}>
                  <SelectTrigger data-testid="select-dest-uf">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ufOptions.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Município</Label>
                <Input value={form.destMunicipio || ""} onChange={(e) => setForm({ ...form, destMunicipio: e.target.value })} placeholder="Município" data-testid="input-dest-municipio" />
              </div>
              <div className="space-y-2">
                <Label>Cód. IBGE Município</Label>
                <Input value={form.destCodigoMunicipio || ""} onChange={(e) => setForm({ ...form, destCodigoMunicipio: e.target.value.replace(/\D/g, "").slice(0, 7) })} placeholder="0000000" maxLength={7} data-testid="input-dest-codigo-municipio" />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={form.destBairro || ""} onChange={(e) => setForm({ ...form, destBairro: e.target.value })} placeholder="Bairro" data-testid="input-dest-bairro" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Endereço</Label>
                <Input value={form.destLogradouro || ""} onChange={(e) => setForm({ ...form, destLogradouro: e.target.value })} placeholder="Logradouro" data-testid="input-dest-logradouro" />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={form.destNumero || ""} onChange={(e) => setForm({ ...form, destNumero: e.target.value })} placeholder="Nº" data-testid="input-dest-numero" />
              </div>
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input value={form.destComplemento || ""} onChange={(e) => setForm({ ...form, destComplemento: e.target.value })} placeholder="Complemento" data-testid="input-dest-complemento" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.destTelefone || ""} onChange={(e) => setForm({ ...form, destTelefone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" maxLength={15} data-testid="input-dest-telefone" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={form.destEmail || ""} onChange={(e) => setForm({ ...form, destEmail: e.target.value })} placeholder="email@exemplo.com" data-testid="input-dest-email" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Itens da Nota Fiscal</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addItem} data-testid="button-add-item">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum item adicionado</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addItem} data-testid="button-add-first-item">
                  Adicionar primeiro item
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="p-4 rounded-md border bg-muted/20 space-y-3" data-testid={`invoice-item-${index}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(index)} data-testid={`button-remove-item-${index}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Produto</Label>
                        <Select onValueChange={(v) => selectProduct(index, v)} value={item.productId?.toString() || ""}>
                          <SelectTrigger data-testid={`select-product-${index}`}>
                            <SelectValue placeholder="Selecione um produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {(products || []).map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.codigo} - {p.descricao}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Código</Label>
                        <Input value={item.codigo} onChange={(e) => updateItem(index, "codigo", e.target.value)} className="text-sm" data-testid={`input-item-codigo-${index}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">NCM</Label>
                        <Input value={item.ncm} onChange={(e) => updateItem(index, "ncm", e.target.value)} className="text-sm" data-testid={`input-item-ncm-${index}`} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Input value={item.descricao} onChange={(e) => updateItem(index, "descricao", e.target.value)} className="text-sm" data-testid={`input-item-descricao-${index}`} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">UN</Label>
                        <Input value={item.unidade} onChange={(e) => updateItem(index, "unidade", e.target.value)} className="text-sm" data-testid={`input-item-unidade-${index}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">CFOP</Label>
                        <Input value={item.cfop} onChange={(e) => updateItem(index, "cfop", e.target.value)} className="text-sm" data-testid={`input-item-cfop-${index}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qtde</Label>
                        <Input value={item.quantidade} onChange={(e) => updateItem(index, "quantidade", e.target.value)} className="text-sm" data-testid={`input-item-qtd-${index}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Preço Un (R$)</Label>
                        <Input value={item.valorUnitario} onChange={(e) => updateItem(index, "valorUnitario", e.target.value)} className="text-sm" data-testid={`input-item-preco-${index}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Total (R$)</Label>
                        <Input value={item.valorTotal} readOnly className="text-sm bg-muted/50 font-medium" data-testid={`input-item-total-${index}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Cálculo de Impostos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Total Produtos</Label>
                <Input value={totals.totalProdutos.toFixed(2)} readOnly className="bg-muted/50 font-mono font-medium" data-testid="input-total-produtos" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Frete (R$)</Label>
                <Input value={form.valorFrete || "0"} onChange={(e) => setForm({ ...form, valorFrete: e.target.value })} className="font-mono" data-testid="input-frete" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Seguro (R$)</Label>
                <Input value={form.valorSeguro || "0"} onChange={(e) => setForm({ ...form, valorSeguro: e.target.value })} className="font-mono" data-testid="input-seguro" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Outras Desp. (R$)</Label>
                <Input value={form.outrasDespesas || "0"} onChange={(e) => setForm({ ...form, outrasDespesas: e.target.value })} className="font-mono" data-testid="input-outras-despesas" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desconto (R$)</Label>
                <Input value={form.desconto || "0"} onChange={(e) => setForm({ ...form, desconto: e.target.value })} className="font-mono" data-testid="input-desconto" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Total da Nota</Label>
                <Input value={totals.totalNota.toFixed(2)} readOnly className="bg-primary/10 font-mono font-bold text-primary" data-testid="input-total-nota" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Transporte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Modalidade de Frete</Label>
              <Select value={form.modalidadeFrete || "9"} onValueChange={(v) => setForm({ ...form, modalidadeFrete: v })}>
                <SelectTrigger data-testid="select-frete">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 - CIF (Remetente)</SelectItem>
                  <SelectItem value="1">1 - FOB (Destinatário)</SelectItem>
                  <SelectItem value="2">2 - Terceiros</SelectItem>
                  <SelectItem value="3">3 - Próprio (Remetente)</SelectItem>
                  <SelectItem value="4">4 - Próprio (Destinatário)</SelectItem>
                  <SelectItem value="9">9 - Sem transporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Informações Complementares</Label>
              <Textarea
                value={form.informacoesComplementares || ""}
                onChange={(e) => setForm({ ...form, informacoesComplementares: e.target.value })}
                placeholder="Informações complementares da nota fiscal..."
                rows={3}
                data-testid="input-info-complementares"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate("/invoices")} data-testid="button-cancel-bottom">
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-bottom">
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Nota Fiscal"}
          </Button>
        </div>
      </form>
    </div>
  );
}
