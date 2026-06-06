import { useQuery } from "@tanstack/react-query";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { PlayerBar } from "@/components/player/player-bar";
import { AppSidebar, PageHeader } from "@/components/ui/app-chrome";
import { StationLoading } from "@/components/ui/station-loading";
import { useResponsiveSidebar } from "@/hooks/use-responsive-sidebar";
import { MOBILE_SIDEBAR_QUERY } from "@/lib/constants";
import { stationQueryOptions } from "@/lib/queries/station";
import type { ViewName } from "@/types/navigation";

const viewPathPattern = /^\/([^/]+)\/?$/;

function readViewName(pathname: string): ViewName {
  const match = pathname.match(viewPathPattern);
  const view = match?.[1];

  return view === "programs" ||
    view === "hosts" ||
    view === "media" ||
    view === "broadcast" ||
    view === "members" ||
    view === "profile" ||
    view === "settings" ||
    view === "schedule"
    ? view
    : "schedule";
}

function pathForView(view: ViewName) {
  return `/${view}` as const;
}

export function AppLayout() {
  const stationQuery = useQuery(stationQueryOptions());
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const navigate = useNavigate();
  const activeView = readViewName(pathname);
  const { isMobileSidebar, isSidebarVisible, setIsSidebarVisible } =
    useResponsiveSidebar();

  const changeView = (nextView: ViewName) => {
    navigate({ to: pathForView(nextView) }).catch(() => undefined);

    if (window.matchMedia(MOBILE_SIDEBAR_QUERY).matches) {
      setIsSidebarVisible(false);
    }
  };
  const hasStation = Boolean(stationQuery.data);
  const hasDesktopSidebar = isSidebarVisible && hasStation && !isMobileSidebar;

  return (
    <main className="app-page">
      <section
        aria-label="Rdio scheduler"
        className={hasStation ? "app-shell" : "app-shell is-station-loading"}
      >
        <PageHeader
          alignWithSidebar={hasDesktopSidebar}
          isSidebarOpen={isSidebarVisible}
          onToggleSidebar={() => setIsSidebarVisible((current) => !current)}
        />
        <div
          className={hasDesktopSidebar ? "app-body has-sidebar" : "app-body"}
        >
          {hasStation && isSidebarVisible && isMobileSidebar ? (
            <button
              aria-label="Close menu"
              className="sidebar-backdrop"
              onClick={() => setIsSidebarVisible(false)}
              type="button"
            />
          ) : null}
          {hasStation && isSidebarVisible ? (
            <AppSidebar
              activeView={activeView}
              isMobileOverlay={isMobileSidebar}
              onChangeView={changeView}
            />
          ) : null}
          <div className={hasStation ? "shell station-shell" : "shell"}>
            {hasStation ? (
              <Outlet />
            ) : (
              <StationLoading failed={stationQuery.isError} />
            )}
          </div>
        </div>
        <PlayerBar />
      </section>
    </main>
  );
}
