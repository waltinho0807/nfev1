import {
  LayoutDashboard,
  Package,
  Building2,
  ShieldCheck,
  FileText,
  Plus,
  CreditCard,
  LogOut,
  User,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const fullMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Nova NF-e", url: "/invoices/new", icon: Plus },
  { title: "Notas Fiscais", url: "/invoices", icon: FileText },
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Emitente", url: "/emitter", icon: Building2 },
  { title: "Certificado A1", url: "/certificate", icon: ShieldCheck },
  { title: "Assinatura", url: "/checkout", icon: CreditCard },
];

const limitedMenuItems = [
  { title: "Assinatura", url: "/checkout", icon: CreditCard },
];

interface AppSidebarProps {
  subscriptionActive?: boolean;
}

export function AppSidebar({ subscriptionActive = true }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const menuItems = subscriptionActive ? fullMenuItems : limitedMenuItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-none">NF-e System</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Modelo 55</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        {user && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate">{user.name}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
