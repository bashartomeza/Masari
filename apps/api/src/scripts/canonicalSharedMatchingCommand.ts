import { config } from "../config.js";
import { canonicalSharedMatchingService } from "../services/canonicalSharedMatching.js";

if (!config.canonicalSharedTripsEnabled) {
  throw new Error("Canonical shared trips are disabled");
}

const command = process.argv[2] ?? "run";
const limit = Number(process.argv[3] ?? "25");
if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
  throw new Error("limit must be an integer from 1 through 100");
}
const result = command === "expire"
  ? await canonicalSharedMatchingService.expire({
      limit,
      requestId: "canonical-shared-cli"
    })
  : command === "run"
    ? await canonicalSharedMatchingService.run({
        limit,
        requestId: "canonical-shared-cli"
      })
    : (() => { throw new Error("command must be run or expire"); })();

console.log(JSON.stringify(result));

