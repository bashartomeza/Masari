const localOnlyKeys = ["ONBOARDING_TEST_LEGAL_FIXTURES_ENABLED"];

export function withoutLocalOnlyEnvironment(environment) {
  const sanitized = { ...environment };
  for (const key of localOnlyKeys) delete sanitized[key];
  return sanitized;
}
