import { useMemo } from "react";
import type { AdminUser, DriverProfile, MerchantOrder, PassengerRequest } from "../../api";
import { useLocale } from "../../i18n/LocaleContext";
import { BentoGrid, Card, CardHeader, DataTable, EmptyState, StatusBadge, TechnicalValue, type Column } from "../../ui";
import { matchesSearch } from "../search";

/**
 * The "Users" module.
 *
 * There is no `GET /admin/users` endpoint, so the directory is assembled from
 * the user records the existing admin endpoints already embed: drivers from
 * `/admin/drivers`, passengers from `/admin/requests`, merchants from
 * `/admin/orders`. That means it lists everyone who has *done* something rather
 * than every registered account, which the header states outright — an
 * incomplete list presented as complete would be worse than no list.
 */
export function UsersDirectory({
  drivers,
  requests,
  orders,
  search
}: {
  drivers: DriverProfile[];
  requests: PassengerRequest[];
  orders: MerchantOrder[];
  search: string;
}) {
  const { t, role, dateTime } = useLocale();

  const users = useMemo(() => {
    const byId = new Map<string, AdminUser>();
    const add = (user?: AdminUser) => {
      if (user && !byId.has(user.id)) byId.set(user.id, user);
    };
    drivers.forEach((driver) => add(driver.user));
    requests.forEach((request) => add(request.passenger as AdminUser | undefined));
    orders.forEach((order) => add(order.merchant as AdminUser | undefined));
    return [...byId.values()].sort((left, right) => left.role.localeCompare(right.role));
  }, [drivers, requests, orders]);

  const visible = useMemo(
    () => users.filter((user) => matchesSearch([user.id, user.name, user.phone, user.role, user.account_status], search)),
    [users, search]
  );

  const columns: Column<AdminUser>[] = [
    {
      key: "user",
      header: t("columnPassenger"),
      cell: (user) => (
        <div>
          <p className="cell-stack__title">{user.name}</p>
          <p className="cell-stack__sub technical">{user.phone}</p>
        </div>
      )
    },
    { key: "role", header: t("columnRole"), cell: (user) => role(user.role) },
    {
      key: "status",
      header: t("columnAccountStatus"),
      cell: (user) => (
        <StatusBadge tone={user.account_status === "active" ? "success" : "danger"}>
          {t(`accountStatus_${user.account_status}`)}
        </StatusBadge>
      )
    },
    {
      key: "lastLogin",
      header: t("columnLastLogin"),
      cell: (user) => (user.last_login_at ? dateTime(user.last_login_at) : t("noData"))
    },
    { key: "id", header: t("columnTrip"), align: "end", cell: (user) => <TechnicalValue>{user.id}</TechnicalValue> }
  ];

  return (
    <BentoGrid>
      <Card span={12} padded={false}>
        <CardHeader title={t("userDirectory")} badge={<StatusBadge tone="info">{visible.length}</StatusBadge>} />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(user) => user.id}
          empty={<EmptyState compact icon="account_circle" title={search ? t("searchNoResults") : t("noData")} />}
        />
      </Card>
    </BentoGrid>
  );
}
