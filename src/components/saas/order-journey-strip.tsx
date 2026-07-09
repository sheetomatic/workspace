import {
  ORDER_JOURNEY_STAGES,
  resolveOrderJourneyStage,
  type LeadSalesOrderData,
  type OrderJourneyStageKey,
} from "@/lib/leads/sales-order-types";

const STAGE_ORDER: OrderJourneyStageKey[] = ORDER_JOURNEY_STAGES.map(
  (stage) => stage.key,
);

function stageIndex(key: OrderJourneyStageKey) {
  return STAGE_ORDER.indexOf(key);
}

export function OrderJourneyStrip({
  order,
  activeKey,
  compact = false,
}: {
  order: Pick<
    LeadSalesOrderData,
    | "status"
    | "quotationId"
    | "advanceAmount"
    | "stockCheckFmsInstanceId"
    | "poFmsInstanceId"
    | "dispatchFmsInstanceId"
  > | null;
  activeKey?: OrderJourneyStageKey;
  compact?: boolean;
}) {
  const currentKey =
    activeKey ?? (order ? resolveOrderJourneyStage(order) : "lead");
  const currentIdx = stageIndex(currentKey);

  return (
    <ol
      className={`order-journey-strip${compact ? " order-journey-strip-compact" : ""}`}
      aria-label="Order journey"
    >
      {ORDER_JOURNEY_STAGES.map((stage, index) => {
        const done = index < currentIdx;
        const active = index === currentIdx;
        const upcoming = index > currentIdx;

        return (
          <li
            key={stage.key}
            className={[
              "order-journey-stage",
              done ? "is-done" : "",
              active ? "is-active" : "",
              upcoming ? "is-upcoming" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={active ? "step" : undefined}
          >
            <span className="order-journey-dot" aria-hidden />
            <span className="order-journey-label">{stage.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
