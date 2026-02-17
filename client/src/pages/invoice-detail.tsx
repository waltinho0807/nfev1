import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import type { Invoice, InvoiceItem } from "@shared/schema";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    rascunho: "",
    autorizada: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    cancelada: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    rejeitada: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };
  const labels: Record<string, string> = {
    rascunho: "Rascunho",
    autorizada: "Autorizada",
    cancelada: "Cancelada",
    rejeitada: "Rejeitada",
  };
  return (
    <Badge variant="secondary" className={variants[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const id = params?.id;

  const { data, isLoading } = useQuery<{ invoice: Invoice; items: InvoiceItem[] }>({
    queryKey: ["/api/invoices", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Nota fiscal não encontrada</p>
        <Link href="/invoices">
          <Button variant="outline" className="mt-3">Voltar</Button>
        </Link>
      </div>
    );
  }

  const { invoice, items } = data;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold" data-testid="text-invoice-detail-title">
                NF-e {invoice.numero || "---"}
              </h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              Série {invoice.serie} - {invoice.naturezaOperacao}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()} data-testid="button-print">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da Nota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Data Emissão</p>
                <p className="text-sm font-medium">{invoice.dataEmissao}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hora</p>
                <p className="text-sm font-medium">{invoice.horaEmissao}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Finalidade</p>
                <p className="text-sm font-medium">
                  {invoice.finalidade === "1" ? "Normal" : invoice.finalidade === "2" ? "Complementar" : invoice.finalidade === "3" ? "Ajuste" : "Devolução"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mod. Frete</p>
                <p className="text-sm font-medium">
                  {invoice.modalidadeFrete === "9" ? "Sem transporte" : `Modalidade ${invoice.modalidadeFrete}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Destinatário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="text-sm font-medium" data-testid="text-dest-nome">{invoice.destNome}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{invoice.destTipoPessoa === "J" ? "CNPJ" : "CPF"}</p>
                <p className="text-sm font-medium">{invoice.destCpfCnpj}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">UF</p>
                <p className="text-sm font-medium">{invoice.destUf || "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Endereço</p>
              <p className="text-sm font-medium">
                {[invoice.destLogradouro, invoice.destNumero, invoice.destBairro, invoice.destMunicipio].filter(Boolean).join(", ") || "-"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens da Nota</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>UN</TableHead>
                  <TableHead className="text-right">Qtde</TableHead>
                  <TableHead className="text-right">Preço Un</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">{item.descricao}</TableCell>
                    <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                    <TableCell className="font-mono text-xs">{item.ncm}</TableCell>
                    <TableCell>{item.unidade}</TableCell>
                    <TableCell className="text-right font-mono">{item.quantidade}</TableCell>
                    <TableCell className="text-right font-mono">
                      {parseFloat(item.valorUnitario).toFixed(2).replace(".", ",")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {parseFloat(item.valorTotal).toFixed(2).replace(".", ",")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Totais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Produtos</p>
              <p className="text-sm font-mono font-medium">R$ {parseFloat(invoice.totalProdutos).toFixed(2).replace(".", ",")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Frete</p>
              <p className="text-sm font-mono">R$ {parseFloat(invoice.valorFrete || "0").toFixed(2).replace(".", ",")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Seguro</p>
              <p className="text-sm font-mono">R$ {parseFloat(invoice.valorSeguro || "0").toFixed(2).replace(".", ",")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outras Despesas</p>
              <p className="text-sm font-mono">R$ {parseFloat(invoice.outrasDespesas || "0").toFixed(2).replace(".", ",")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Desconto</p>
              <p className="text-sm font-mono">R$ {parseFloat(invoice.desconto || "0").toFixed(2).replace(".", ",")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Total da Nota</p>
              <p className="text-lg font-mono font-bold text-primary">
                R$ {parseFloat(invoice.totalNota).toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.informacoesComplementares && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações Complementares</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.informacoesComplementares}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
