import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./Button";
import { NAV_GROUPS, type ModuleId, type NavItem } from "../navigation";

export function initialOf(name: string | undefined) {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed[0] : "؟";
}

/**
 * Fixed 256px rail, anchored to the inline-start edge so it sits on the right
 * in Arabic and the left in English without a second stylesheet.
 */
export function SideNav({
  items,
  active,
  onSelect,
  labels,
  footer
}: {
  items: NavItem[];
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
  labels: {
    brand: string;
    subtitle: string;
    navigation: string;
    label: (item: NavItem) => string;
    groupLabel: (labelKey: (typeof NAV_GROUPS)[number]["labelKey"]) => string;
  };
  footer: ReactNode;
}) {
  return (
    <aside className="sidenav">
      <div className="sidenav__brand">
        <span className="sidenav__logo">
          <Icon name="local_shipping" size={22} />
        </span>
        <div>
          <p className="sidenav__brand-name">{labels.brand}</p>
          <p className="sidenav__brand-subtitle">{labels.subtitle}</p>
        </div>
      </div>

      <nav className="sidenav__nav" aria-label={labels.navigation}>
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.group === group.id);
          if (groupItems.length === 0) return null;
          return (
            <section className="sidenav__group" key={group.id} aria-labelledby={`nav-group-${group.id}`}>
              <h2 className="sidenav__group-label" id={`nav-group-${group.id}`}>
                {labels.groupLabel(group.labelKey)}
              </h2>
              <ul>
                {groupItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={item.id === active ? "sidenav__item is-active" : "sidenav__item"}
                      aria-current={item.id === active ? "page" : undefined}
                      onClick={() => onSelect(item.id)}
                    >
                      <Icon name={item.icon} size={20} />
                      <span>{labels.label(item)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </nav>

      <div className="sidenav__footer">{footer}</div>
    </aside>
  );
}

export function TopBar({
  title,
  search,
  onSearch,
  searchPlaceholder,
  searchLabel,
  helpLabel,
  notificationsLabel,
  alertCount,
  user
}: {
  title: string;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  searchLabel: string;
  helpLabel: string;
  notificationsLabel: string;
  alertCount: number;
  user: { name: string; detail: string };
}) {
  return (
    <header className="topbar">
      <div className="topbar__start">
        <h2 className="topbar__title">{title}</h2>
        <div className="topbar__search">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={search}
            aria-label={searchLabel}
            placeholder={searchPlaceholder}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="topbar__end">
        <IconButton icon="help" label={helpLabel} />
        <span className="topbar__bell">
          <IconButton icon="notifications" label={`${notificationsLabel} (${alertCount})`} />
          {alertCount > 0 && <span className="topbar__dot" aria-hidden="true" />}
        </span>
        <span className="topbar__divider" aria-hidden="true" />
        <div className="topbar__user">
          <div className="topbar__user-text">
            <p className="topbar__user-name">{user.name}</p>
            <p className="topbar__user-detail">{user.detail}</p>
          </div>
          <span className="avatar avatar--lg" aria-hidden="true">
            {initialOf(user.name)}
          </span>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ sidenav, topbar, children }: { sidenav: ReactNode; topbar: ReactNode; children: ReactNode }) {
  return (
    <div className="shell">
      {sidenav}
      <main className="shell__main">
        {topbar}
        <div className="shell__canvas">{children}</div>
      </main>
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {initialOf(name)}
    </span>
  );
}
