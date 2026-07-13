import { z } from "zod";

function normalizeExistingNumericInput(value: unknown) {
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
}

export const latitudeSchema = z.preprocess(
  normalizeExistingNumericInput,
  z.number().finite().min(-90).max(90)
);

export const longitudeSchema = z.preprocess(
  normalizeExistingNumericInput,
  z.number().finite().min(-180).max(180)
);

export const coordinateSchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema
});
