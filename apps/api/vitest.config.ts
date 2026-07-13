import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**"],
    env: {
      APP_ENV: "test",
      DATABASE_URL: "mysql://test:test@localhost:3306/masari_test",
      JWT_SECRET: "test-only-jwt-secret-with-at-least-thirty-two-characters",
      CORS_ORIGINS: "http://localhost:5173,http://localhost:5174,http://localhost:5175",
      DEMO_RESET_KEY: "test-reset-key",
      DEMO_PASSENGER_PASSWORD: "test-passenger-password",
      DEMO_DRIVER_PASSWORD: "test-driver-password",
      DEMO_MERCHANT_PASSWORD: "test-merchant-password",
      DEMO_ADMIN_PASSWORD: "test-admin-password"
    }
  }
});
