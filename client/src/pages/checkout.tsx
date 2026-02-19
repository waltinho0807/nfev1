import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, CheckCircle, Clock, Crown, Loader2, ExternalLink, RefreshCw } from "lucide-react";

export default function CheckoutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checkingPayment, setCheckingPayment] = useState(false);

  const createBillingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/create-billing");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast({
          title: "Link de pagamento gerado",
          description: "Uma nova aba foi aberta com o pagamento PIX. Após pagar, clique em 'Verificar Pagamento'.",
        });
      }
    },
    onError: (err: any) => {
      const msg = err.message?.includes(":") ? err.message.split(":").slice(1).join(":").trim() : err.message;
      toast({ title: "Erro", description: msg, variant: "destructive" });
    },
  });

  const checkPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/check-payment");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.active) {
        toast({ title: "Pagamento confirmado", description: "Sua assinatura foi ativada com sucesso!" });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      } else {
        toast({ title: "Aguardando pagamento", description: "O pagamento ainda não foi confirmado. Tente novamente em alguns instantes.", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "completed") {
      setCheckingPayment(true);
      setTimeout(() => {
        checkPaymentMutation.mutate();
        setCheckingPayment(false);
      }, 2000);
    }
  }, []);

  const isActive = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "vitalicio";
  const isLifetime = user?.subscriptionStatus === "vitalicio";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-checkout-title">Plano de Assinatura</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie sua assinatura do NF-e System
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-lg">Status da Assinatura</CardTitle>
          {isLifetime && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              <Crown className="w-3 h-3 mr-1" />
              Vitalício
            </Badge>
          )}
          {user?.subscriptionStatus === "active" && !isLifetime && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ativo
            </Badge>
          )}
          {(user?.subscriptionStatus === "inactive" || user?.subscriptionStatus === "expired") && (
            <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              <Clock className="w-3 h-3 mr-1" />
              {user?.subscriptionStatus === "expired" ? "Expirado" : "Inativo"}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLifetime && (
            <p className="text-sm text-muted-foreground">
              Você possui acesso vitalício ao sistema. Nenhum pagamento necessário.
            </p>
          )}

          {user?.subscriptionStatus === "active" && !isLifetime && user.subscriptionExpiresAt && (
            <div className="space-y-2">
              <p className="text-sm">
                Sua assinatura está ativa até{" "}
                <span className="font-medium">
                  {new Date(user.subscriptionExpiresAt).toLocaleDateString("pt-BR")}
                </span>
              </p>
            </div>
          )}

          {(user?.subscriptionStatus === "inactive" || user?.subscriptionStatus === "expired") && (
            <div className="space-y-4">
              <div className="border rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="font-semibold">Plano Mensal</h3>
                    <p className="text-sm text-muted-foreground">Acesso completo por 31 dias</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold">R$ 9,90</span>
                    <p className="text-xs text-muted-foreground">/mês</p>
                  </div>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Emissão ilimitada de NF-e</li>
                  <li>Certificado digital A1</li>
                  <li>DANFE em PDF</li>
                  <li>Comunicação com SEFAZ</li>
                  <li>Cadastro de produtos e emitente</li>
                </ul>
              </div>

              <Button
                className="w-full"
                onClick={() => createBillingMutation.mutate()}
                disabled={createBillingMutation.isPending}
                data-testid="button-create-billing"
              >
                {createBillingMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando pagamento...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pagar com PIX - R$ 9,90
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => checkPaymentMutation.mutate()}
                disabled={checkPaymentMutation.isPending || checkingPayment}
                data-testid="button-check-payment"
              >
                {checkPaymentMutation.isPending || checkingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verificar Pagamento
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
