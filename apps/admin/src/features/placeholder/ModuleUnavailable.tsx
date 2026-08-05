import { useLocale } from "../../i18n/LocaleContext";
import { Card, EmptyState, type IconName } from "../../ui";

/**
 * Rendered for the sidebar tabs the Stitch design defines but no endpoint
 * backs yet (driver verification, AI review, reports), and for demo-only
 * modules in a non-demo build. Deliberately shows no sample data.
 */
export function ModuleUnavailable({ icon, reason }: { icon: IconName; reason: "no-api" | "demo-only" }) {
  const { t } = useLocale();
  return (
    <Card>
      <EmptyState
        icon={icon}
        title={reason === "demo-only" ? t("demoUnavailableTitle") : t("moduleUnavailableTitle")}
        description={reason === "demo-only" ? t("demoUnavailableDescription") : t("moduleUnavailableDescription")}
      />
    </Card>
  );
}
