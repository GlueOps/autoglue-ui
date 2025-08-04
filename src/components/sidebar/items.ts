import {
  BrainCogIcon,
  Building2Icon,
  BuildingIcon,
  HomeIcon,
  KeyIcon,
  ServerIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import { AiOutlineCluster } from "react-icons/ai";

export const items = [
  {
    label: "Dashboard",
    icon: HomeIcon,
    to: "/dashboard",
  },
  {
    label: "Core",
    icon: BrainCogIcon,
    items: [
      {
        label: "Cluster",
        to: "/core/cluster",
        icon: AiOutlineCluster,
      },
    ],
  },
  {
    label: "Settings",
    icon: SettingsIcon,
    items: [
      {
        label: "Credentials",
        to: "/settings/credentials",
        icon: KeyIcon,
      },
      {
        label: "Servers",
        to: "/settings/servers",
        icon: ServerIcon,
      },
      {
        label: "Organizations",
        icon: Building2Icon,
        items: [
          {
            label: "Organizations",
            to: "/settings/orgs",
            icon: BuildingIcon,
          },
          {
            label: "Members",
            to: "/settings/members",
            icon: UsersIcon,
          },
        ],
      },
    ],
  },
];
