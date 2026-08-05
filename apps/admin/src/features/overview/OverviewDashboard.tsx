import { useMemo } from "react";
import type { DashboardResponse, DriverRoute, MerchantOrder, PassengerRequest, Trip } from "../../api";
import { useLocale } from "../../i18n/LocaleContext";
import {
  AlertItem,
  Avatar,
  BarChart,
  BentoGrid,
  Button,
  Card,
  CardHeader,
  Column,
  DataTable,
  EmptyState,
  IconButton,
  KpiCard,
  MeterBar,
  RouteChip,
  StatusBadge,
  TechnicalValue
} from "../../ui";
import { matchesSearch } from "../search";

const TERMINAL_TRIP_STATUSES = new Set(["completed", "cancelled"]);
const UNMATCHED_REQUEST_STATUSES = new Set(["pending", "submitted", "draft", "created"]);
const TRIP_FLOW = ["accepted", "pickup_started", "picked_up", "in_transit", "delivered", "completed"];

export type OverviewData = {
  dashboard: DashboardResponse | null;
  routes: DriverRoute[];
  requests: PassengerRequest[];
  orders: MerchantOrder[];
  trips: Trip[];
};

type OperationRow = { trip: Trip; route: DriverRoute | undefined };

/**
 * Alerts are derived from data actually returned by the API — never invented.
 * When nothing is wrong the rail shows an explicit all-clear state.
 */
export function deriveAlerts(data: OverviewData) {
  const unmatchedRequests = data.requests.filter((request) => UNMATCHED_REQUEST_STATUSES.has(request.status)).length;
  const unverifiedDriverRoutes = data.routes.filter(
    (route) => route.status === "active" && route.driver && route.driver.verified === false
  ).length;
  const unbatchedOrders = data.orders.filter((order) => order.status !== "batched").length;
  return { unmatchedRequests, unverifiedDriverRoutes, unbatchedOrders };
}

export function OverviewDashboard({
  data,
  search,
  busy,
  onRefresh
}: {
  data: OverviewData;
  search: string;
  busy: boolean;
  onRefresh: () => void;
}) {
  const { t, status, number } = useLocale();
  const alerts = useMemo(() => deriveAlerts(data), [data]);

  const activeRoutes = data.routes.filter((route) => route.status === "active");
  const activeTrips = data.trips.filter((trip) => !TERMINAL_TRIP_STATUSES.has(trip.status));

  const operations = useMemo<OperationRow[]>(() => {
    const byId = new Map(data.routes.map((route) => [route.id, route]));
    return data.trips
      .map((trip) => ({ trip, route: byId.get(trip.driver_route_id) }))
      .filter(({ trip, route }) =>
        matchesSearch(
          [
            trip.id,
            trip.status,
            route?.origin_label,
            route?.destination_label,
            route?.driver?.user?.name,
            route?.driver?.user?.phone
          ],
          search
        )
      );
  }, [data.routes, data.trips, search]);

  const tripsByStatus = useMemo(
    () =>
      TRIP_FLOW.map((flowStatus) => ({
        id: flowStatus,
        value: data.trips.filter((trip) => trip.status === flowStatus).length,
        title: `${status(flowStatus)}: ${data.trips.filter((trip) => trip.status === flowStatus).length}`
      })),
    [data.trips, status]
  );

  const seatCapacity = activeRoutes.reduce((total, route) => total + (route.seats_available ?? 0), 0);
  const parcelCapacity = activeRoutes.reduce((total, route) => total + (route.parcel_capacity_available ?? 0), 0);
  const totalCapacity = Math.max(1, seatCapacity + parcelCapacity);

  const columns: Column<OperationRow>[] = [
    {
      key: "driver",
      header: t("columnDriver"),
      cell: ({ route }) => (
        <div className="cell-stack">
          <Avatar name={route?.driver?.user?.name ?? "—"} />
          <div>
            <p className="cell-stack__title">{route?.driver?.user?.name ?? t("noData")}</p>
            <p className="cell-stack__sub technical">{route?.driver?.user?.phone ?? ""}</p>
          </div>
        </div>
      )
    },
    {
      key: "route",
      header: t("columnRoute"),
      cell: ({ route }) =>
        route ? <RouteChip from={route.origin_label} to={route.destination_label} /> : <span className="muted">{t("noData")}</span>
    },
    {
      key: "status",
      header: t("columnStatus"),
      cell: ({ trip }) => (
        <StatusBadge status={trip.status} icon={trip.status === "in_transit" ? "near_me" : undefined}>
          {status(trip.status)}
        </StatusBadge>
      )
    },
    {
      key: "trip",
      header: t("columnTrip"),
      cell: ({ trip }) => <TechnicalValue>{trip.id}</TechnicalValue>
    },
    {
      key: "actions",
      header: t("columnActions"),
      align: "end",
      cell: ({ trip }) => <IconButton icon="more_vert" label={`${t("rowActionsLabel")} ${trip.id}`} disabled />
    }
  ];

  return (
    <>
      <section className="kpi-row">
        <KpiCard
          icon="directions_car"
          tone="info"
          label={t("activeDrivers")}
          value={number(activeRoutes.length)}
        />
        <KpiCard
          icon="verified"
          tone="warning"
          label={t("pendingVerifications")}
          value={number(alerts.unmatchedRequests)}
          delta={alerts.unmatchedRequests > 0 ? { text: t("criticalAlerts"), tone: "danger" } : undefined}
        />
        <KpiCard icon="route" tone="neutral" label={t("activeTrips")} value={number(activeTrips.length)} />
        <KpiCard
          icon="inventory_2"
          tone="success"
          label={t("activeShipments")}
          value={data.dashboard ? number(data.dashboard.counts.parcels) : "—"}
        />
        <KpiCard
          icon="person"
          tone="info"
          label={t("seededUsers")}
          value={data.dashboard ? number(data.dashboard.counts.users) : "—"}
        />
      </section>

      <BentoGrid>
        <Card span={8} padded={false}>
          <CardHeader
            title={t("activeOperations")}
            action={
              <Button variant="ghost" size="sm" iconEnd="chevron" onClick={onRefresh} disabled={busy}>
                {t("refreshData")}
              </Button>
            }
          />
          <DataTable
            columns={columns}
            rows={operations}
            rowKey={({ trip }) => trip.id}
            empty={
              <EmptyState
                icon="local_shipping"
                compact
                title={search ? t("searchNoResults") : t("noOperations")}
              />
            }
          />
        </Card>

        <Card span={4}>
          <CardHeader title={t("criticalAlerts")} />
          <div className="stack stack--tight">
            {alerts.unmatchedRequests > 0 && (
              <AlertItem
                tone="danger"
                title={t("alertUnmatchedRequestsTitle")}
                description={t("alertUnmatchedRequestsDescription", { count: number(alerts.unmatchedRequests) })}
              />
            )}
            {alerts.unverifiedDriverRoutes > 0 && (
              <AlertItem
                tone="warning"
                icon="verified_user"
                title={t("alertUnverifiedDriversTitle")}
                description={t("alertUnverifiedDriversDescription", { count: number(alerts.unverifiedDriverRoutes) })}
              />
            )}
            {alerts.unbatchedOrders > 0 && (
              <AlertItem
                tone="info"
                icon="inventory_2"
                title={t("alertPendingOrdersTitle")}
                description={t("alertPendingOrdersDescription", { count: number(alerts.unbatchedOrders) })}
              />
            )}
            {alerts.unmatchedRequests === 0 && alerts.unverifiedDriverRoutes === 0 && alerts.unbatchedOrders === 0 && (
              <EmptyState icon="check" compact title={t("noAlertsTitle")} description={t("noAlertsDescription")} />
            )}
          </div>
        </Card>

        <Card span={6}>
          <CardHeader
            title={t("tripVolume")}
            action={
              <span className="legend">
                <span className="legend__swatch" />
                {t("trips")}
              </span>
            }
          />
          <BarChart bars={tripsByStatus} label={t("tripVolume")} />
        </Card>

        <Card span={6}>
          <CardHeader title={t("driverUtilizationChart")} />
          <div>
            <MeterBar
              label={t("capacitySeats")}
              value={(seatCapacity / totalCapacity) * 100}
              display={number(seatCapacity)}
              tone="info"
            />
            <MeterBar
              label={t("capacityParcels")}
              value={(parcelCapacity / totalCapacity) * 100}
              display={number(parcelCapacity)}
              tone="warning"
            />
          </div>
        </Card>

        <Card span={6} padded={false}>
          <CardHeader
            title={t("passengerRequests")}
            badge={<StatusBadge tone="warning">{number(data.requests.length)}</StatusBadge>}
          />
          <div className="card__list">
            {data.requests.length === 0 && <EmptyState compact icon="person_pin_circle" title={t("noData")} />}
            {data.requests.slice(0, 5).map((request) => (
              <div className="card__row" key={request.id}>
                <div>
                  <p className="card__row-title">{request.passenger?.name ?? t("noData")}</p>
                  <p className="card__row-detail">
                    <RouteChip from={request.pickup_label} to={request.destination_label} />
                  </p>
                </div>
                <StatusBadge status={request.status}>{status(request.status)}</StatusBadge>
              </div>
            ))}
          </div>
        </Card>

        <Card span={6} padded={false}>
          <CardHeader
            title={t("merchantOrders")}
            badge={<StatusBadge tone="info">{number(data.orders.length)}</StatusBadge>}
          />
          <div className="card__list">
            {data.orders.length === 0 && <EmptyState compact icon="inventory_2" title={t("noData")} />}
            {data.orders.slice(0, 5).map((order) => (
              <div className="card__row" key={order.id}>
                <div>
                  <p className="card__row-title">{order.merchant?.name ?? order.pickup_label}</p>
                  <p className="card__row-detail">
                    {order.pickup_label} · {number(order.parcels?.length ?? 0)} {t("parcels")}
                  </p>
                </div>
                <StatusBadge status={order.status}>{status(order.status)}</StatusBadge>
              </div>
            ))}
          </div>
        </Card>
      </BentoGrid>
    </>
  );
}
