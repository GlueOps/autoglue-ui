import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar.tsx";
import {Button} from "@/components/ui/button.tsx";
import {SidebarThemeSwitcher} from "@/components/sidebar-theme-switcher.tsx";
import {Link, useLocation} from "react-router-dom";
import type {ComponentType, FC} from "react";
import {items} from "@/components/sidebar/items.ts";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible.tsx";
import {ChevronDown} from "lucide-react";
import {OrgSwitcher} from "@/components/sidebar/org-switcher.tsx";

interface MenuItemProps {
  label: string;
  icon: ComponentType<{className?: string}>;
  to?: string
  items?: MenuItemProps[]
}

const MenuItem: FC<{item: MenuItemProps}> = ({item}) => {
  const location = useLocation();
  const Icon = item.icon;

  if (item.to) {
    return (
      <Link
        to={item.to}
        className={`flex items-center space-x-2 text-sm py-2 px-4 rounded-md hover:bg-accent hover:text-accent-foreground ${location.pathname === item.to ? "bg-accent text-accent-foreground" : ""}`}
      >
        <Icon className='h-4 w-4 mr-4' />
        {item.label}
      </Link>

    )
  }

  if (item.items) {
    return (
      <Collapsible defaultOpen className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger>
              <Icon className='h-4 w-4 mr-4'/>
              {item.label}
              <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((subitem, index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuButton asChild>
                      <MenuItem item={subitem} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    )
  }
  return null
}

export const AppSidebar = () => {
  return (
    <Sidebar>
      <SidebarHeader className="flex items-center justify-between p-4">
        <h1 className="text-xl font-bold">AutoGlue</h1>
      </SidebarHeader>
      <SidebarContent>
        {items.map((item, index) => (
          <MenuItem item={item} key={index} />
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        <OrgSwitcher />
        <SidebarThemeSwitcher />
        <Button onClick={() => {
          localStorage.clear();
          window.location.reload();
        }} className="w-full">
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
