import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Upload, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import type { Certificate, InsertCertificate } from "@shared/schema";

export default function CertificatePage() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<Partial<InsertCertificate>>({
    name: "",
    certificateBase64: "",
    password: "",
    userId: 1,
  });

  const { data: certificates, isLoading } = useQuery<Certificate[]>({
    queryKey: ["/api/certificates"],
  });

  const activeCert = certificates?.[0];

  const uploadMutation = useMutation({
    mutationFn: (data: Partial<InsertCertificate>) =>
      apiRequest("POST", "/api/certificates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      setForm({ name: "", certificateBase64: "", password: "", userId: 1 });
      toast({ title: activeCert ? "Certificado substituído com sucesso" : "Certificado salvo com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar certificado", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/certificates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      toast({ title: "Certificado removido" });
    },
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] || (reader.result as string);
      setForm({ ...form, certificateBase64: base64, name: form.name || file.name.replace(/\.(pfx|p12)$/i, "") });
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.certificateBase64 || !form.password || !form.name) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    uploadMutation.mutate(form);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-certificate-title">Certificado Digital A1</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie seu certificado digital para assinatura das NF-e. Apenas um certificado pode estar ativo.
        </p>
      </div>

      {activeCert && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              Certificado Ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex items-center justify-between gap-3 p-4 rounded-md bg-muted/30"
              data-testid={`cert-row-${activeCert.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-green-500/10">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{activeCert.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Ativo
                    </Badge>
                    {activeCert.expiresAt && (
                      <span className="text-xs text-muted-foreground">
                        Validade: {activeCert.expiresAt}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMutation.mutate(activeCert.id)}
                data-testid={`button-delete-cert-${activeCert.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {activeCert ? <RefreshCw className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            {activeCert ? "Substituir Certificado" : "Enviar Certificado"}
          </CardTitle>
          <CardDescription>
            {activeCert
              ? "Envie um novo certificado para substituir o atual. O anterior será removido automaticamente."
              : "Faça upload do arquivo .pfx ou cole o conteúdo em Base64"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Certificado *</Label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Certificado Empresa 2026"
                data-testid="input-cert-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Arquivo do Certificado (.pfx)</Label>
              <Input
                type="file"
                accept=".pfx,.p12"
                onChange={handleFileUpload}
                data-testid="input-cert-file"
              />
            </div>
            <div className="space-y-2">
              <Label>Ou cole o Base64 diretamente</Label>
              <Textarea
                value={form.certificateBase64 || ""}
                onChange={(e) => setForm({ ...form, certificateBase64: e.target.value })}
                placeholder="Cole o conteúdo em Base64 do certificado..."
                rows={4}
                className="font-mono text-xs"
                data-testid="input-cert-base64"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha do Certificado *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password || ""}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Senha do certificado .pfx"
                  data-testid="input-cert-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data de Validade</Label>
              <Input
                value={form.expiresAt || ""}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                placeholder="DD/MM/AAAA"
                data-testid="input-cert-expires"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={uploadMutation.isPending} data-testid="button-save-cert">
                {activeCert ? <RefreshCw className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                {uploadMutation.isPending
                  ? "Salvando..."
                  : activeCert
                    ? "Substituir Certificado"
                    : "Salvar Certificado"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
