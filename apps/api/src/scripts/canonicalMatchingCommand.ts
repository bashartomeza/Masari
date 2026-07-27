import { canonicalMatchingService } from "../services/canonicalMatching.js";

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value = "true"] = argument.replace(/^--/, "").split("=", 2);
    return [key, value];
  })
);

const limit = args.has("limit") ? Number(args.get("limit")) : undefined;
if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
  throw new Error("limit_must_be_between_1_and_100");
}

const result = args.has("expire")
  ? await canonicalMatchingService.expire({ limit, requestId: "canonical-matching-cli" })
  : await canonicalMatchingService.run({
      routeVersionId: args.get("route-version"),
      demandType: args.get("demand-type") as "passenger" | "merchant_order" | undefined,
      limit,
      requestId: "canonical-matching-cli"
    });

process.stdout.write(`${JSON.stringify(result)}\n`);
