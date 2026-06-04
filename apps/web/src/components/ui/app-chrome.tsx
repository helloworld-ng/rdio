import {
  BookOpen,
  CalendarDays,
  ListMusic,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import type React from "react";
import { UserAccountMenu } from "@/components/UserAccountMenu";
import { useAuth, useAuthenticatedUser } from "@/providers/auth-provider";
import type { ViewName } from "@/types/navigation";

export function PageHeader({
  alignWithSidebar,
  isSidebarOpen,
  onToggleSidebar,
}: {
  alignWithSidebar: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const { logout } = useAuth();
  const user = useAuthenticatedUser();
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <header
      className={alignWithSidebar ? "page-header has-sidebar" : "page-header"}
    >
      <div className="page-header-lead">
        <button
          aria-expanded={isSidebarOpen}
          aria-label="Toggle sidebar"
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          type="button"
        >
          <SidebarIcon aria-hidden="true" size={14} strokeWidth={1.8} />
        </button>
      </div>
      <div className="page-header-main">
        <UserAccountMenu
          firstName={user.name.split(" ")[0] ?? user.name}
          onLogout={() => {
            logout().catch(() => undefined);
          }}
        />
      </div>
      <div className="brand-mark">rdio</div>
    </header>
  );
}

export function AppSidebar({
  activeView,
  isMobileOverlay,
  onChangeView,
}: {
  activeView: ViewName;
  isMobileOverlay: boolean;
  onChangeView: (view: ViewName) => void;
}) {
  const user = useAuthenticatedUser();

  return (
    <aside
      aria-label="Library"
      className={isMobileOverlay ? "sidebar is-mobile-overlay" : "sidebar"}
    >
      <nav aria-label="Station views" className="sidebar-nav">
        <SidebarButton
          active={activeView === "schedule"}
          icon={CalendarDays}
          label="Schedule"
          onClick={() => onChangeView("schedule")}
        />
        <SidebarButton
          active={activeView === "broadcast"}
          icon={Radio}
          label="Broadcast"
          onClick={() => onChangeView("broadcast")}
        />
        <SidebarButton
          active={activeView === "programs"}
          icon={BookOpen}
          label="Programs"
          onClick={() => onChangeView("programs")}
        />
        <SidebarButton
          active={activeView === "hosts"}
          icon={Users}
          label="Hosts"
          onClick={() => onChangeView("hosts")}
        />
        <SidebarButton
          active={activeView === "media"}
          icon={ListMusic}
          label="Media"
          onClick={() => onChangeView("media")}
        />
        {user.role?.split(",").includes("admin") ? (
          <SidebarButton
            active={activeView === "members"}
            icon={UserPlus}
            label="Members"
            onClick={() => onChangeView("members")}
          />
        ) : null}
        <SidebarButton
          active={activeView === "settings"}
          icon={Settings}
          label="Settings"
          onClick={() => onChangeView("settings")}
        />
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-studio-name">rdio</span>
        <span className="sidebar-copyright">© {new Date().getFullYear()}</span>
      </div>
    </aside>
  );
}

function SidebarButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<
    React.SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }
  >;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "is-active" : ""}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden={true} size={14} strokeWidth={1.8} />
      {label}
    </button>
  );
}
