import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Save } from "lucide-react";
import { maskCnpj, maskCep, maskPhone } from "@/lib/masks";
import type { Emitter, InsertEmitter } from "@shared/schema";

const ufOptions = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const regimeOptions = [
  { value: "1", label: "1 - Simples Nacional" },
  { value: "2", label: "2 - Simples Nacional - Excesso de sublimite" },
  { value: "3", label: "3 - Regime Normal" },
];

export default function EmitterPage() {
  const { toast } = useToast();
  const { data: emitter, isLoading } = useQuery<Emitter | null>({
    queryKey: ["/api/emitter"],
  });

  const [form, setForm] = useState<Partial<InsertEmitter>>({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    inscricaoEstadual: "",
    inscricaoMunicipal: "",
    regimeTributario: "1",
    cep: "",
    uf: "",
    municipio: "",
    bairro: "",
    logradouro: "",
    numero: "",
    complemento: "",
    telefone: "",
    email: "",
    codigoMunicipio: "",
  });

  useEffect(() => {
    if (emitter) {
      setForm({
        razaoSocial: emitter.razaoSocial,
        nomeFantasia: emitter.nomeFantasia || "",
        cnpj: maskCnpj(emitter.cnpj),
        inscricaoEstadual: emitter.inscricaoEstadual || "",
        inscricaoMunicipal: emitter.inscricaoMunicipal || "",
        regimeTributario: emitter.regimeTributario,
        cep: maskCep(emitter.cep),
        uf: emitter.uf,
        municipio: emitter.municipio,
        bairro: emitter.bairro,
        logradouro: emitter.logradouro,
        numero: emitter.numero,
        complemento: emitter.complemento || "",
        telefone: maskPhone(emitter.telefone || ""),
        email: emitter.email || "",
        codigoMunicipio: emitter.codigoMunicipio || "",
      });
    }
  }, [emitter]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<InsertEmitter>) =>
      apiRequest(emitter ? "PUT" : "POST", "/api/emitter", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emitter"] });
      toast({ title: "Dados do emitente salvos com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.razaoSocial || !form.cnpj || !form.cep || !form.uf || !form.municipio || !form.bairro || !form.logradouro || !form.numero) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-emitter-title">Emitente</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Dados da empresa emitente da NF-e
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Dados da Empresa
            </CardTitle>
            <CardDescription>Informações que serão usadas no XML da NF-e</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Razão Social *</Label>
                <Input
                  value={form.razaoSocial || ""}
                  onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
                  placeholder="Razão social da empresa"
                  data-testid="input-emitter-razao-social"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input
                  value={form.nomeFantasia || ""}
                  onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
                  placeholder="Nome fantasia"
                  data-testid="input-emitter-nome-fantasia"
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ *</Label>
                <Input
                  value={form.cnpj || ""}
                  onChange={(e) => setForm({ ...form, cnpj: maskCnpj(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  data-testid="input-emitter-cnpj"
                />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Estadual</Label>
                <Input
                  value={form.inscricaoEstadual || ""}
                  onChange={(e) => setForm({ ...form, inscricaoEstadual: e.target.value })}
                  placeholder="Inscrição estadual"
                  data-testid="input-emitter-ie"
                />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Municipal</Label>
                <Input
                  value={form.inscricaoMunicipal || ""}
                  onChange={(e) => setForm({ ...form, inscricaoMunicipal: e.target.value })}
                  placeholder="Inscrição municipal"
                  data-testid="input-emitter-im"
                />
              </div>
              <div className="space-y-2">
                <Label>Regime Tributário *</Label>
                <Select
                  value={form.regimeTributario || "1"}
                  onValueChange={(v) => setForm({ ...form, regimeTributario: v })}
                >
                  <SelectTrigger data-testid="select-emitter-regime">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regimeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CEP *</Label>
                  <Input
                    value={form.cep || ""}
                    onChange={(e) => setForm({ ...form, cep: maskCep(e.target.value) })}
                    placeholder="00000-000"
                    maxLength={9}
                    data-testid="input-emitter-cep"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UF *</Label>
                  <Select
                    value={form.uf || ""}
                    onValueChange={(v) => setForm({ ...form, uf: v })}
                  >
                    <SelectTrigger data-testid="select-emitter-uf">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ufOptions.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Município *</Label>
                  <Input
                    value={form.municipio || ""}
                    onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                    placeholder="Nome do município"
                    data-testid="input-emitter-municipio"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código Município (IBGE)</Label>
                  <Input
                    value={form.codigoMunicipio || ""}
                    onChange={(e) => setForm({ ...form, codigoMunicipio: e.target.value })}
                    placeholder="Código IBGE"
                    data-testid="input-emitter-cod-municipio"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bairro *</Label>
                  <Input
                    value={form.bairro || ""}
                    onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                    placeholder="Nome do bairro"
                    data-testid="input-emitter-bairro"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Logradouro *</Label>
                  <Input
                    value={form.logradouro || ""}
                    onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
                    placeholder="Rua, Avenida..."
                    data-testid="input-emitter-logradouro"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número *</Label>
                  <Input
                    value={form.numero || ""}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                    placeholder="Nº"
                    data-testid="input-emitter-numero"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    value={form.complemento || ""}
                    onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                    placeholder="Sala, andar..."
                    data-testid="input-emitter-complemento"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Contato</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={form.telefone || ""}
                    onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    data-testid="input-emitter-telefone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@empresa.com"
                    data-testid="input-emitter-email"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-emitter">
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Salvando..." : "Salvar Emitente"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
