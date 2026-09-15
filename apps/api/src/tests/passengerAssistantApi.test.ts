import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConfig } from "../config.js";

const prismaMock = vi.hoisted(() => ({
  authSession: { findUnique: vi.fn(), update: vi.fn() },
  passengerRequest: { findMany: vi.fn() }
}));
vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));
const { createApp } = await import("../app.js");

const environment = {
  APP_ENV: "local",
  DATABASE_URL: "mysql://test:test@localhost:3306/masari_test",
  JWT_SECRET: "test-only-jwt-secret-with-at-least-thirty-two-characters",
  CORS_ORIGINS: "http://localhost:5173",
  LOG_LEVEL: "silent"
};
const appConfig = createConfig(environment);

function auth(id: string, role: "passenger" | "driver") {
  const token = jwt.sign({ role, sid: `session_${id}`, ver: 1 }, environment.JWT_SECRET, {
    subject: id,
    expiresIn: "1h"
  });
  return { Authorization: `Bearer ${token}` };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.authSession.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
    const id = where.id.replace("session_", "");
    const role = id.startsWith("driver") ? "driver" : "passenger";
    return {
      id: where.id,
      user_id: id,
      user: { email_verified_at: new Date(), id, role, account_status: "active", security_version: 1 },
      security_version_at_issue: 1,
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null
    };
  });
  prismaMock.authSession.update.mockResolvedValue({});
});

describe("passenger assistant API", () => {
  it("returns extracted trip data for passenger review", async () => {
    const service = {
      answer: vi.fn().mockResolvedValue({
        status: "request_review",
        message: "راجع المعلومات ثم أكّد لبدء البحث.",
        suggestions: [],
        request: {
          pickupKey: "bab_al_zawiya",
          pickupLabel: "Bab Al-Zawiya",
          destinationKey: "bethlehem",
          destinationLabel: "Bethlehem Center",
          preferredTime: "2026-09-10T15:00:00+03:00",
          passengerCount: 1
        }
      })
    };
    const app = createApp(appConfig, { passengerAssistantService: service });

    const response = await request(app)
      .post("/api/v1/passenger/assistant/messages")
      .set(auth("passenger_1", "passenger"))
      .send({
        message: "ابحث لي من باب الزاوية إلى بيت لحم الساعة 3 لشخص",
        locale: "ar",
        history: []
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      status: "request_review",
      message: "راجع المعلومات ثم أكّد لبدء البحث.",
      extracted: {
        pickup_key: "bab_al_zawiya",
        pickup_label: "Bab Al-Zawiya",
        destination_key: "bethlehem",
        destination_label: "Bethlehem Center",
        preferred_time: "2026-09-10T15:00:00+03:00",
        passenger_count: 1
      },
      suggestions: []
    }));
    expect(response.body).not.toHaveProperty("answer");
    expect(response.body).not.toHaveProperty("match");
  });

  it("returns a real service clarification and preserves the conversation id", async () => {
    const service = {
      answer: vi.fn().mockResolvedValue({
        status: "clarification",
        message: "أي يوم تقصد؟",
        suggestions: ["اليوم", "غداً"]
      })
    };
    const app = createApp(appConfig, { passengerAssistantService: service });

    const response = await request(app)
      .post("/api/v1/passenger/assistant/messages")
      .set(auth("passenger_1", "passenger"))
      .send({
        message: "متى رحلتي؟",
        locale: "ar",
        conversation_id: "conversation_1",
        history: [{ role: "assistant", text: "كيف أساعدك؟" }]
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "clarification",
      question: "أي يوم تقصد؟",
      suggestions: ["اليوم", "غداً"],
      conversation_id: "conversation_1"
    });
    expect(service.answer).toHaveBeenCalledWith({
      passengerId: "passenger_1",
      message: "متى رحلتي؟",
      locale: "ar",
      history: [{ role: "assistant", text: "كيف أساعدك؟" }]
    });
  });

  it("is passenger-only", async () => {
    const service = { answer: vi.fn() };
    const app = createApp(appConfig, { passengerAssistantService: service });

    await request(app)
      .post("/api/v1/passenger/assistant/messages")
      .set(auth("driver_1", "driver"))
      .send({ message: "هل توجد رحلة؟", locale: "ar", history: [] })
      .expect(403);
    expect(service.answer).not.toHaveBeenCalled();
  });

  it("returns an honest unavailable error when xAI is not configured", async () => {
    const app = createApp(appConfig);

    const response = await request(app)
      .post("/api/v1/passenger/assistant/messages")
      .set(auth("passenger_1", "passenger"))
      .send({ message: "هل توجد رحلة؟", locale: "ar", history: [] });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe("assistant_unavailable");
    expect(response.body).not.toHaveProperty("answer");
    expect(prismaMock.passengerRequest.findMany).not.toHaveBeenCalled();
  });
});
