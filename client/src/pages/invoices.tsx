import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText, Trash2, Eye, Search } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { Invoice } from "@shared/schema";

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

export default function Invoices() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Nota fiscal removida" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    },
  });

  const filteredInvoices = (invoices || []).filter(
    (inv) =>
      inv.destNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.numero || "").includes(searchTerm) ||
      inv.naturezaOperacao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-invoices-title">Notas Fiscais</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie suas notas fiscais eletrônicas
          </p>
        </div>
        <Link href="/invoices/new">
          <Button data-testid="button-new-invoice">
            <Plus className="w-4 h-4 mr-2" />
            Nova NF-e
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <CardTitle className="text-base">Lista de Notas</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-invoices"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Nenhuma nota encontrada" : "Nenhuma nota fiscal emitida"}
              </p>
              {!searchTerm && (
                <Link href="/invoices/new">
                  <Button variant="outline" size="sm" className="mt-3" data-testid="button-create-first">
                    Emitir primeira nota
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Natureza</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total (R$)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} data-testid={`invoice-row-${inv.id}`}>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {inv.numero || "---"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{inv.dataEmissao}</TableCell>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">{inv.destNome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.naturezaOperacao}</TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {parseFloat(inv.totalNota).toFixed(2).replace(".", ",")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/invoices/${inv.id}`}>
                            <Button size="icon" variant="ghost" data-testid={`button-view-invoice-${inv.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(inv.id)}
                            data-testid={`button-delete-invoice-${inv.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
