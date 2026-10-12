import type { LocationEvent, Trip } from "../../api";
import { useLocale } from "../../i18n/LocaleContext";
import {
  BentoGrid,
  Button,
  Card,
  CardHeader,
  Column,
  DataTable,
  EmptyState,
  StatusBadge,
  StatusRail,
  TechnicalValue
} from "../../ui";
import { matchesSearch } from "../search";

export function railSteps(flow: string[], current: string) {
  const currentIndex = flow.indexOf(current);
  return flow.map((value, index) => ({
    id: value,
    value,
    state: index < currentIndex ? ("done" as const) : index === currentIndex ? ("current" as const) : ("pending" as const)
  }));
}

/**
 * Trip list plus the lifecycle rail and tracking panel. The list is served by
 * the production `/trips` endpoint; the advance/simulate controls are demo-only
 * and are hidden entirely when the demo API client is absent.
 */
export function TripsTracking({
  trips,
  activeTrip,
  tripFlow,
  nextTripStatus,
  latestLocation,
  locationTrail,
  search,
  canAct,
  demoEnabled,
  onSelectTrip,
  onRefreshTrips,
  onMoveTrip,
  onSimulateStep,
  onReadLatest,
  onResetSimulation
}: {
  trips: Trip[];
  activeTrip: Trip | null;
  tripFlow: string[];
  nextTripStatus: string | undefined;
  latestLocation: LocationEvent | null;
  locationTrail: LocationEvent[];
  search: string;
  canAct: boolean;
  demoEnabled: boolean;
  onSelectTrip: (trip: Trip) => void;
  onRefreshTrips: () => void;
  onMoveTrip: (status: string) => void;
  onSimulateStep: () => void;
  onReadLatest: () => void;
  onResetSimulation: () => void;
}) {
  const { t, status, number, dateTime } = useLocale();
  const visibleTrips = trips.filter((trip) => matchesSearch([trip.id, trip.status, trip.driver_route_id], search));

  const columns: Column<Trip>[] = [
    { key: "id", header: t("columnTrip"), cell: (trip) => <TechnicalValue>{trip.id}</TechnicalValue> },
    {
      key: "status",
      header: t("columnStatus"),
      cell: (trip) => <StatusBadge status={trip.status}>{status(trip.status)}</StatusBadge>
    },
    { key: "route", header: t("columnRoute"), cell: (trip) => <TechnicalValue>{trip.driver_route_id}</TechnicalValue> },
    {
      key: "select",
      header: t("columnActions"),
      align: "end",
      cell: (trip) => (
        <Button
          variant={activeTrip?.id === trip.id ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSelectTrip(trip)}
        >
          {t("selectTrip")}
        </Button>
      )
    }
  ];

  return (
    <BentoGrid>
      <Card span={7} padded={false}>
        <CardHeader
          title={t("trips")}
          badge={<StatusBadge tone="info">{number(visibleTrips.length)}</StatusBadge>}
          action={
            <Button variant="ghost" size="sm" icon="refresh" onClick={onRefreshTrips} disabled={!canAct}>
              {t("refreshTrips")}
            </Button>
          }
        />
        <DataTable
          columns={columns}
          rows={visibleTrips}
          rowKey={(trip) => trip.id}
          empty={<EmptyState compact icon="local_shipping" title={search ? t("searchNoResults") : t("acceptMatchEmpty")} />}
        />
      </Card>

      <Card span={5}>
        <CardHeader
          title={t("tripFlow")}
          badge={activeTrip ? <StatusBadge status={activeTrip.status}>{status(activeTrip.status)}</StatusBadge> : undefined}
        />
        {!activeTrip ? (
          <EmptyState compact icon="route" title={t("acceptMatchEmpty")} />
        ) : (
          <div className="stack">
            <TechnicalValue>{activeTrip.id}</TechnicalValue>
            <StatusRail steps={railSteps(tripFlow, activeTrip.status).map((step) => ({ ...step, label: status(step.value) }))} />
            {demoEnabled &&
              (nextTripStatus ? (
                <Button variant="action" icon="check" onClick={() => onMoveTrip(nextTripStatus)} disabled={!canAct}>
                  {t("moveTo", { status: status(nextTripStatus) })}
                </Button>
              ) : (
                <p className="muted">{t("tripLifecycleComplete")}</p>
              ))}
          </div>
        )}
      </Card>

      {demoEnabled && (
        <Card span={12}>
          <CardHeader
            title={t("trackingSimulation")}
            action={
              <div className="button-row">
                <Button variant="secondary" size="sm" icon="near_me" onClick={onSimulateStep} disabled={!canAct || !activeTrip}>
                  {t("simulateStep")}
                </Button>
                <Button variant="outline" size="sm" icon="refresh" onClick={onReadLatest} disabled={!canAct || !activeTrip}>
                  {t("readLatest")}
                </Button>
                <Button variant="destructive" size="sm" icon="close" onClick={onResetSimulation} disabled={!canAct || !activeTrip}>
                  {t("resetSimulation")}
                </Button>
              </div>
            }
          />
          {latestLocation ? (
            <div className="stack stack--tight">
              <div className="kv">
                <span className="kv__key">
                  {t("latitude")} / {t("longitude")}
                </span>
                <TechnicalValue>{`${latestLocation.lat}, ${latestLocation.lng}`}</TechnicalValue>
              </div>
              <div className="kv">
                <span className="kv__key">{t("sequence")}</span>
                <span>{number(latestLocation.sequence)}</span>
                <span className="kv__key">{t("recordedTime")}</span>
                <span>{dateTime(latestLocation.recorded_at)}</span>
              </div>
            </div>
          ) : (
            <EmptyState compact icon="location_on" title={t("simulateEmpty")} />
          )}
          {locationTrail.length > 0 && (
            <div>
              <p className="card__row-title">{t("trackingTrail")}</p>
              <div className="chip-row">
                {locationTrail.map((location) => (
                  <StatusBadge key={location.id} tone="neutral">
                    <span className="technical">{`#${location.sequence} ${location.lat},${location.lng}`}</span>
                  </StatusBadge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </BentoGrid>
  );
}
