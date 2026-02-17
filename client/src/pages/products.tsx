import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Package, Search } from "lucide-react";
import type { Product, InsertProduct } from "@shared/schema";

const defaultProduct: Partial<InsertProduct> = {
  codigo: "",
  descricao: "",
  ncm: "",
  cfop: "5102",
  unidade: "UN",
  valorUnitario: "",
  ean: "SEM GTIN",
  origem: "0",
  csosn: "102",
  cstPis: "49",
  cstCofins: "49",
  aliqIcms: "0",
  aliqPis: "0",
  aliqCofins: "0",
};

const origemOptions = [
  { value: "0", label: "0 - Nacional" },
  { value: "1", label: "1 - Estrangeira (importação direta)" },
  { value: "2", label: "2 - Estrangeira (mercado interno)" },
  { value: "3", label: "3 - Nacional com conteúdo importado >40%" },
  { value: "5", label: "5 - Nacional com conteúdo importado <=40%" },
];

const csosnOptions = [
  { value: "101", label: "101 - Tributada com permissão de crédito" },
  { value: "102", label: "102 - Tributada sem permissão de crédito" },
  { value: "103", label: "103 - Isenção do ICMS para faixa de receita bruta" },
  { value: "201", label: "201 - Tributada com permissão de crédito e ST" },
  { value: "202", label: "202 - Tributada sem permissão de crédito e ST" },
  { value: "300", label: "300 - Imune" },
  { value: "400", label: "400 - Não tributada" },
  { value: "500", label: "500 - ICMS cobrado anteriormente por ST" },
  { value: "900", label: "900 - Outros" },
];

export default function Products() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<InsertProduct>>(defaultProduct);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<InsertProduct>) =>
      apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Produto criado com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar produto", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertProduct> }) =>
      apiRequest("PUT", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Produto atualizado com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Produto removido" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setForm(defaultProduct);
    setEditingProduct(null);
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      codigo: product.codigo,
      descricao: product.descricao,
      ncm: product.ncm,
      cfop: product.cfop,
      unidade: product.unidade,
      valorUnitario: product.valorUnitario,
      ean: product.ean || "SEM GTIN",
      origem: product.origem,
      csosn: product.csosn || "102",
      cstPis: product.cstPis || "49",
      cstCofins: product.cstCofins || "49",
      aliqIcms: product.aliqIcms || "0",
      aliqPis: product.aliqPis || "0",
      aliqCofins: product.aliqCofins || "0",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.codigo || !form.descricao || !form.ncm || !form.valorUnitario) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const filteredProducts = (products || []).filter(
    (p) =>
      p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-products-title">Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seus produtos com informações fiscais
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-product">
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={form.codigo || ""}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    placeholder="Ex: 0001"
                    data-testid="input-product-codigo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>EAN/GTIN</Label>
                  <Input
                    value={form.ean || ""}
                    onChange={(e) => setForm({ ...form, ean: e.target.value })}
                    placeholder="SEM GTIN"
                    data-testid="input-product-ean"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input
                  value={form.descricao || ""}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Nome do produto"
                  data-testid="input-product-descricao"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>NCM *</Label>
                  <Input
                    value={form.ncm || ""}
                    onChange={(e) => setForm({ ...form, ncm: e.target.value })}
                    placeholder="3303.00.10"
                    data-testid="input-product-ncm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CFOP</Label>
                  <Input
                    value={form.cfop || ""}
                    onChange={(e) => setForm({ ...form, cfop: e.target.value })}
                    placeholder="5102"
                    data-testid="input-product-cfop"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input
                    value={form.unidade || ""}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                    placeholder="UN"
                    data-testid="input-product-unidade"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Unitário (R$) *</Label>
                  <Input
                    value={form.valorUnitario || ""}
                    onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })}
                    placeholder="59.00"
                    data-testid="input-product-valor"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CEST</Label>
                  <Input
                    value={form.cest || ""}
                    onChange={(e) => setForm({ ...form, cest: e.target.value })}
                    placeholder="Opcional"
                    data-testid="input-product-cest"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Informações Fiscais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Origem</Label>
                    <Select
                      value={form.origem || "0"}
                      onValueChange={(v) => setForm({ ...form, origem: v })}
                    >
                      <SelectTrigger data-testid="select-product-origem">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {origemOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>CSOSN</Label>
                    <Select
                      value={form.csosn || "102"}
                      onValueChange={(v) => setForm({ ...form, csosn: v })}
                    >
                      <SelectTrigger data-testid="select-product-csosn">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {csosnOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>CST PIS</Label>
                    <Input
                      value={form.cstPis || ""}
                      onChange={(e) => setForm({ ...form, cstPis: e.target.value })}
                      placeholder="49"
                      data-testid="input-product-cst-pis"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CST COFINS</Label>
                    <Input
                      value={form.cstCofins || ""}
                      onChange={(e) => setForm({ ...form, cstCofins: e.target.value })}
                      placeholder="49"
                      data-testid="input-product-cst-cofins"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-product"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <CardTitle className="text-base">Lista de Produtos</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-products"
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
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead>UN</TableHead>
                    <TableHead>CFOP</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {product.codigo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {product.descricao}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{product.ncm}</TableCell>
                      <TableCell>{product.unidade}</TableCell>
                      <TableCell className="font-mono text-xs">{product.cfop}</TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(product.valorUnitario).toFixed(2).replace(".", ",")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(product)}
                            data-testid={`button-edit-product-${product.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(product.id)}
                            data-testid={`button-delete-product-${product.id}`}
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
