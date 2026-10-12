import type { BatchResponse, MerchantOrder } from "../../api";
import { useLocale } from "../../i18n/LocaleContext";
import {
  BentoGrid,
  Button,
  Card,
  CardHeader,
  Column,
  DataTable,
  EmptyState,
  KpiCard,
  StatusBadge,
  TechnicalValue,
  Timeline,
  type TimelineStep
} from "../../ui";

type Parcel = NonNullable<MerchantOrder["parcels"]>[number];

/**
 * The parcel timeline mirrors the Stitch "تسلسل التوصيل" rail: delivered stops
 * are complete, the first parcel still in flight is current, the rest pending.
 */
export function parcelSteps(parcels: Parcel[], statusText: (value: string) => string): TimelineStep[] {
  const firstOpen = parcels.findIndex((parcel) => parcel.status !== "delivered");
  return parcels.map((parcel, index) => ({
    id: parcel.id,
    title: parcel.destination_label,
    detail: `${statusText(parcel.status)} · ${parcel.size} · ${parcel.priority}`,
    state: parcel.status === "delivered" ? "done" : index === firstOpen ? "current" : "pending"
  }));
}

export function BatchingWorkspace({
  order,
  batchResult,
  canAct,
  onCreateBatch
}: {
  order: MerchantOrder | undefined;
  batchResult: BatchResponse | null;
  canAct: boolean;
  onCreateBatch: () => void;
}) {
  const { t, status, number } = useLocale();
  const parcels = order?.parcels ?? [];

  const columns: Column<Parcel>[] = [
    { key: "destination", header: t("columnDestination"), cell: (parcel) => parcel.destination_label },
    { key: "size", header: t("columnSize"), cell: (parcel) => parcel.size },
    { key: "priority", header: t("columnPriority"), cell: (parcel) => parcel.priority },
    {
      key: "status",
      header: t("columnStatus"),
      cell: (parcel) => <StatusBadge status={parcel.status}>{status(parcel.status)}</StatusBadge>
    },
    { key: "id", header: t("columnTrip"), align: "end", cell: (parcel) => <TechnicalValue>{parcel.id}</TechnicalValue> }
  ];

  return (
    <>
      <section className="kpi-row">
        <KpiCard
          icon="inventory_2"
          tone="info"
          label={t("numberOfParcels")}
          value={number(batchResult?.batch.merchant_order?.parcels?.length ?? parcels.length)}
        />
        <KpiCard
          icon="near_me"
          tone="success"
          label={t("estimatedDistanceSaved")}
          value={batchResult ? number(batchResult.batch.estimated_distance_saved) : "—"}
          unit="km"
        />
        <KpiCard
          icon="local_shipping"
          tone="warning"
          label={t("batch")}
          value={batchResult ? status(batchResult.batch.status) : "—"}
        />
      </section>

      <BentoGrid>
        <Card span={5}>
          <CardHeader
            title={t("deliverySequence")}
            badge={<StatusBadge tone="info">{number(parcels.length)}</StatusBadge>}
            action={
              <Button variant="action" icon="add" onClick={onCreateBatch} disabled={!canAct}>
                {t("createBatch")}
              </Button>
            }
          />
          {parcels.length === 0 ? (
            <EmptyState compact icon="inventory_2" title={t("createBatchEmpty")} />
          ) : (
            <Timeline steps={parcelSteps(parcels, status)} />
          )}
        </Card>

        <Card span={7} padded={false}>
          <CardHeader
            title={t("availableShipments")}
            badge={order ? <StatusBadge status={order.status}>{status(order.status)}</StatusBadge> : undefined}
          />
          <DataTable
            columns={columns}
            rows={parcels}
            rowKey={(parcel) => parcel.id}
            empty={<EmptyState compact icon="inventory_2" title={t("noMerchantOrder")} />}
          />
          {batchResult && (
            <div className="card__row">
              <p className="muted">{t("batchDemoExplanation")}</p>
            </div>
          )}
        </Card>
      </BentoGrid>
    </>
  );
}
