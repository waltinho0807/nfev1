import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Package, Building2, ShieldCheck, Plus, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Invoice, Product, Emitter, Certificate } from "@shared/schema";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
            {value}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    rascunho: "bg-muted text-muted-foreground",
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

export default function Dashboard() {
  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });
  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  const { data: emitter, isLoading: loadingEmitter } = useQuery<Emitter | null>({
    queryKey: ["/api/emitter"],
  });
  const { data: certificates, isLoading: loadingCerts } = useQuery<Certificate[]>({
    queryKey: ["/api/certificates"],
  });

  const recentInvoices = (invoices || []).slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral do sistema de emissão de NF-e
          </p>
        </div>
        <Link href="/invoices/new">
          <Button data-testid="button-new-invoice">
            <Plus className="w-4 h-4 mr-2" />
            Nova NF-e
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Notas Fiscais"
          value={invoices?.length || 0}
          icon={FileText}
          description="Total emitidas"
          loading={loadingInvoices}
        />
        <StatCard
          title="Produtos"
          value={products?.length || 0}
          icon={Package}
          description="Cadastrados"
          loading={loadingProducts}
        />
        <StatCard
          title="Emitente"
          value={emitter ? "Configurado" : "Pendente"}
          icon={Building2}
          description={emitter?.razaoSocial || "Configure os dados"}
          loading={loadingEmitter}
        />
        <StatCard
          title="Certificado A1"
          value={certificates?.length ? "Ativo" : "Pendente"}
          icon={ShieldCheck}
          description={certificates?.length ? `${certificates.length} certificado(s)` : "Faça upload"}
          loading={loadingCerts}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Notas Recentes</CardTitle>
            <Link href="/invoices">
              <Button variant="ghost" size="sm" data-testid="link-view-all-invoices">
                Ver todas
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentInvoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma nota fiscal emitida</p>
                <Link href="/invoices/new">
                  <Button variant="outline" size="sm" className="mt-3" data-testid="button-create-first-invoice">
                    Criar primeira nota
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/30"
                    data-testid={`invoice-row-${inv.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          NF-e {inv.numero || "---"}
                        </span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {inv.destNome} - {inv.naturezaOperacao}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        R$ {parseFloat(inv.totalNota).toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-xs text-muted-foreground">{inv.dataEmissao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/invoices/new">
              <div className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer" data-testid="quick-access-new-invoice">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Emitir NF-e</p>
                  <p className="text-xs text-muted-foreground">Criar nova nota fiscal</p>
                </div>
              </div>
            </Link>
            <Link href="/products">
              <div className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer" data-testid="quick-access-products">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Produtos</p>
                  <p className="text-xs text-muted-foreground">Gerenciar cadastro de produtos</p>
                </div>
              </div>
            </Link>
            <Link href="/emitter">
              <div className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer" data-testid="quick-access-emitter">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Emitente</p>
                  <p className="text-xs text-muted-foreground">Dados da empresa</p>
                </div>
              </div>
            </Link>
            <Link href="/certificate">
              <div className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer" data-testid="quick-access-certificate">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Certificado Digital</p>
                  <p className="text-xs text-muted-foreground">Gerenciar certificado A1</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
