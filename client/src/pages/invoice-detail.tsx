import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, FileText, Send, Download, FileCode, AlertCircle, CheckCircle2, Clock, ShieldAlert, Pencil } from "lucide-react";
import { useState } from "react";
import type { Invoice, InvoiceItem } from "@shared/schema";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    rascunho: "",
    processando: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    autorizada: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    cancelada: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    rejeitada: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    erro_assinatura: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  const labels: Record<string, string> = {
    rascunho: "Rascunho",
    processando: "Processando",
    autorizada: "Autorizada",
    cancelada: "Cancelada",
    rejeitada: "Rejeitada",
    erro_assinatura: "Erro Assinatura",
  };
  return (
    <Badge variant="secondary" className={variants[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "autorizada") return <CheckCircle2 className="w-5 h-5 text-green-600" />;
  if (status === "rejeitada" || status === "erro_assinatura") return <AlertCircle className="w-5 h-5 text-red-600" />;
  if (status === "processando") return <Clock className="w-5 h-5 text-blue-600" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
}

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const id = params?.id;
  const { toast } = useToast();
  const [ambiente, setAmbiente] = useState("2");
  const [showConfirmProducao, setShowConfirmProducao] = useState(false);

  const { data, isLoading } = useQuery<{ invoice: Invoice; items: InvoiceItem[] }>({
    queryKey: ["/api/invoices", id],
    enabled: !!id,
  });

  const emitirMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/invoices/${id}/emitir`, { ambiente });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", id] });
      if (data.success) {
        toast({ title: "NF-e emitida!", description: data.message });
      } else {
        toast({ title: "Falha", description: data.message, variant: "destructive" });
      }
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", id] });
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
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
        <div className="flex items-center gap-2 flex-wrap">
          {(invoice.status === "rascunho" || invoice.status === "rejeitada" || invoice.status === "erro_assinatura") && (
            <Link href={`/invoices/${id}/edit`}>
              <Button variant="outline" data-testid="button-edit-invoice">
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            onClick={() => window.open(`/api/invoices/${id}/xml`, "_blank")}
            data-testid="button-download-xml"
          >
            <FileCode className="w-4 h-4 mr-2" />
            XML
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`/api/invoices/${id}/danfe`, "_blank")}
            data-testid="button-download-danfe"
          >
            <Download className="w-4 h-4 mr-2" />
            DANFE
          </Button>
          {(invoice.status === "rascunho" || invoice.status === "rejeitada" || invoice.status === "erro_assinatura") && (
            <>
              <Select value={ambiente} onValueChange={setAmbiente}>
                <SelectTrigger className="w-[180px]" data-testid="select-ambiente">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">Homologacao (Teste)</SelectItem>
                  <SelectItem value="1">Producao (Real)</SelectItem>
                </SelectContent>
              </Select>
              {ambiente === "1" && (
                <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 no-default-hover-elevate no-default-active-elevate">
                  <ShieldAlert className="w-3 h-3 mr-1" />
                  Producao
                </Badge>
              )}
              <Button
                onClick={() => {
                  if (ambiente === "1") {
                    setShowConfirmProducao(true);
                  } else {
                    emitirMutation.mutate();
                  }
                }}
                disabled={emitirMutation.isPending}
                data-testid="button-emitir"
              >
                <Send className="w-4 h-4 mr-2" />
                {emitirMutation.isPending ? "Emitindo..." : ambiente === "1" ? "Emitir em Producao" : "Emitir NF-e"}
              </Button>
            </>
          )}
        </div>
      </div>

      {(invoice.chaveAcesso || invoice.protocolo || invoice.motivoRejeicao) && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
            <StatusIcon status={invoice.status} />
            <CardTitle className="text-base">Informações da Emissão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoice.chaveAcesso && (
              <div>
                <p className="text-xs text-muted-foreground">Chave de Acesso</p>
                <p className="text-sm font-mono break-all" data-testid="text-chave-acesso">
                  {invoice.chaveAcesso.replace(/(\d{4})/g, "$1 ").trim()}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {invoice.protocolo && (
                <div>
                  <p className="text-xs text-muted-foreground">Protocolo</p>
                  <p className="text-sm font-mono font-medium" data-testid="text-protocolo">{invoice.protocolo}</p>
                </div>
              )}
              {invoice.dhRecebimento && (
                <div>
                  <p className="text-xs text-muted-foreground">Data/Hora Recebimento</p>
                  <p className="text-sm font-mono">{invoice.dhRecebimento}</p>
                </div>
              )}
              {invoice.codigoStatus && (
                <div>
                  <p className="text-xs text-muted-foreground">Código Status</p>
                  <p className="text-sm font-mono">{invoice.codigoStatus}</p>
                </div>
              )}
            </div>
            {invoice.motivoRejeicao && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">Motivo da Rejeição</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{invoice.motivoRejeicao}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Ambiente</p>
              <p className="text-sm">{invoice.ambiente === "1" ? "Produção" : "Homologação"}</p>
            </div>
          </CardContent>
        </Card>
      )}

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
              <p className="text-lg font-mono font-bold" data-testid="text-total-nota">
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

      <AlertDialog open={showConfirmProducao} onOpenChange={setShowConfirmProducao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Emitir em Producao
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Voce esta prestes a emitir esta NF-e no ambiente de <strong>Producao</strong>. Isso ira registrar a nota fiscal de forma oficial na SEFAZ.
              </span>
              <span className="block">
                Esta acao nao pode ser desfeita. Certifique-se de que todos os dados estao corretos antes de prosseguir.
              </span>
              <span className="block font-medium">
                NF-e: {invoice.numero} - {invoice.destNome}
              </span>
              <span className="block font-medium">
                Total: R$ {parseFloat(invoice.totalNota).toFixed(2).replace(".", ",")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-producao">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-producao"
              onClick={() => emitirMutation.mutate()}
            >
              <Send className="w-4 h-4 mr-2" />
              Confirmar Emissao em Producao
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
