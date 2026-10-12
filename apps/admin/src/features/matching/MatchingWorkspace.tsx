import type { MatchRunResponse, MerchantOrder, PassengerRequest } from "../../api";
import { useLocale } from "../../i18n/LocaleContext";
import {
  Avatar,
  BentoGrid,
  Button,
  Card,
  CardHeader,
  EmptyState,
  MeterBar,
  RouteChip,
  StatusBadge,
  TechnicalValue
} from "../../ui";

/** Scores arrive as 0–1 ratios except the deviation, which is a distance. */
export function scorePercent(key: string, value: number) {
  if (key === "estimatedDeviationKm") return null;
  return Math.max(0, Math.min(100, value * 100));
}

/**
 * Master/detail matching workspace: the seeded inputs on the start side, the
 * recommendation and its explainability breakdown on the end side.
 */
export function MatchingWorkspace({
  request,
  order,
  matchResult,
  canAct,
  busy,
  onRunMatch,
  onAccept,
  onReject,
  scoreLabel
}: {
  request: PassengerRequest | undefined;
  order: MerchantOrder | undefined;
  matchResult: MatchRunResponse | null;
  canAct: boolean;
  busy: boolean;
  onRunMatch: () => void;
  onAccept: () => void;
  onReject: () => void;
  scoreLabel: (key: string) => string;
}) {
  const { t, status, number } = useLocale();
  const breakdown = matchResult ? Object.entries(matchResult.scoringBreakdown) : [];

  return (
    <BentoGrid>
      <Card span={4} padded={false}>
        <CardHeader title={t("matchingQueue")} />
        <div className="card__list">
          {!request && !order && <EmptyState compact icon="person_pin_circle" title={t("noSeededInputs")} />}
          {request && (
            <div className="card__row">
              <div>
                <p className="card__row-title">{request.passenger?.name ?? t("request")}</p>
                <p className="card__row-detail">
                  <RouteChip from={request.pickup_label} to={request.destination_label} />
                </p>
              </div>
              <StatusBadge status={request.status}>{status(request.status)}</StatusBadge>
            </div>
          )}
          {order && (
            <div className="card__row">
              <div>
                <p className="card__row-title">{order.merchant?.name ?? t("order")}</p>
                <p className="card__row-detail">
                  {order.pickup_label} · {number(order.parcels?.length ?? 0)} {t("parcels")}
                </p>
              </div>
              <StatusBadge status={order.status}>{status(order.status)}</StatusBadge>
            </div>
          )}
        </div>
        <div className="card__row">
          <Button variant="action" icon="play" onClick={onRunMatch} disabled={!canAct}>
            {t("runMatch")}
          </Button>
        </div>
      </Card>

      <Card span={8}>
        <CardHeader
          title={t("recommendation")}
          badge={matchResult ? <StatusBadge status={matchResult.match.status}>{status(matchResult.match.status)}</StatusBadge> : undefined}
          action={
            matchResult ? (
              <div className="button-row">
                <Button variant="action" icon="check" onClick={onAccept} disabled={!canAct}>
                  {t("acceptMatch")}
                </Button>
                <Button variant="destructive" icon="close" onClick={onReject} disabled={!canAct}>
                  {t("rejectMatch")}
                </Button>
              </div>
            ) : undefined
          }
        />

        {!matchResult ? (
          <EmptyState icon="alt_route" title={t("runMatchingEmpty")} />
        ) : (
          <div className="stack">
            <div className="card__row-main">
              <Avatar name={matchResult.match.driver_route?.driver?.user?.name ?? "?"} />
              <div>
                <p className="card__row-title">
                  {matchResult.match.driver_route?.driver?.user?.name ?? t("driverRoute")}
                </p>
                <p className="card__row-detail">
                  {matchResult.match.driver_route ? (
                    <RouteChip
                      from={matchResult.match.driver_route.origin_label}
                      to={matchResult.match.driver_route.destination_label}
                    />
                  ) : (
                    <TechnicalValue>{matchResult.match.driver_route_id}</TechnicalValue>
                  )}
                </p>
              </div>
            </div>

            <div className="kv">
              <span className="kv__key">{t("finalScore")}</span>
              <strong>{number(matchResult.scoringBreakdown.finalScore ?? 0)}</strong>
              <span className="kv__key">{t("match")}</span>
              <TechnicalValue>{matchResult.match.id}</TechnicalValue>
            </div>

            <div>
              <p className="card__row-title">{t("whyThisDriver")}</p>
              <p className="muted">{t("matchDemoExplanation")}</p>
            </div>

            <div>
              {breakdown.map(([key, value]) => {
                const percent = scorePercent(key, value);
                return percent === null ? (
                  <div className="kv" key={key}>
                    <span className="kv__key">{scoreLabel(key)}</span>
                    <strong>{number(value)}</strong>
                  </div>
                ) : (
                  <MeterBar
                    key={key}
                    label={scoreLabel(key)}
                    value={percent}
                    display={number(value)}
                    tone={key === "finalScore" ? "success" : "info"}
                  />
                );
              })}
            </div>

            <div className="kv">
              <span className="kv__key">{t("routeInsights")}</span>
              <span>
                {number(matchResult.candidatesConsidered)} · {t("driverRoute")}
              </span>
            </div>
          </div>
        )}
        {busy && <p className="muted">{t("loading")}</p>}
      </Card>
    </BentoGrid>
  );
}
