import { describe, expect, it, vi } from "vitest";
import { createConfig } from "../config.js";
import {
  createPassengerAssistantService,
  PassengerAssistantProviderError
} from "../services/passengerAssistant.js";

const environment = {
  APP_ENV: "local",
  DATABASE_URL: "mysql://test:test@localhost:3306/masari_test",
  JWT_SECRET: "test-only-jwt-secret-with-at-least-thirty-two-characters",
  CORS_ORIGINS: "http://localhost:5173",
  LOG_LEVEL: "silent",
  XAI_API_KEY: "xai-test-key-that-is-long-enough",
  XAI_MODEL: "grok-4.6",
  XAI_TIMEOUT_MS: "5000",
  ASSISTANT_PROVIDER: "xai"
};

describe("xAI passenger assistant service", () => {
  it("sends bounded authoritative context to Grok and parses structured output", async () => {
    let requestUrl: string | URL | Request | undefined;
    let requestInit: RequestInit | undefined;
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requestUrl = url;
      requestInit = init;
      return new Response(JSON.stringify({
        output: [{
          type: "message",
          content: [{
            type: "output_text",
            text: JSON.stringify({
              status: "result",
              message: "لا توجد رحلة مؤكدة غداً.",
              suggestions: []
            })
          }]
        }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const contextLoader = vi.fn().mockResolvedValue({
      passenger_requests: [{
        pickup: "باب الزاوية",
        destination: "بيت لحم",
        status: "pending"
      }]
    });
    const service = createPassengerAssistantService(createConfig(environment), {
      fetchImpl: fetchImpl as typeof fetch,
      contextLoader,
      now: () => new Date("2026-09-09T12:00:00.000Z")
    });

    const reply = await service.answer({
      passengerId: "passenger_1",
      message: "هل رحلتي غداً مؤكدة؟",
      locale: "ar",
      history: [{ role: "assistant", text: "أي يوم تقصد؟" }]
    });

    expect(reply).toEqual({
      status: "result",
      message: "لا توجد رحلة مؤكدة غداً.",
      suggestions: []
    });
    expect(contextLoader).toHaveBeenCalledWith("passenger_1");
    expect(requestUrl).toBe("https://api.x.ai/v1/responses");
    expect(requestInit?.headers).toEqual(expect.objectContaining({
      Authorization: `Bearer ${environment.XAI_API_KEY}`
    }));
    const body = JSON.parse(String(requestInit?.body));
    expect(body.model).toBe("grok-4.6");
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.strict).toBe(true);
    expect(body.input[1].content).toContain("بيت لحم");
    expect(body.input[1].content).not.toContain("passenger_1");
  });

  it("fails closed when no xAI API key is configured", async () => {
    const service = createPassengerAssistantService(createConfig({
      ...environment,
      XAI_API_KEY: undefined
    }), {
      fetchImpl: vi.fn() as unknown as typeof fetch,
      contextLoader: vi.fn()
    });

    await expect(service.answer({
      passengerId: "passenger_1",
      message: "متى رحلتي؟",
      locale: "ar",
      history: []
    })).rejects.toMatchObject({ category: "unavailable" } satisfies Partial<PassengerAssistantProviderError>);
  });

  it("stops repeating destination questions for an unsupported city", async () => {
    const fetchImpl = vi.fn();
    const contextLoader = vi.fn();
    const service = createPassengerAssistantService(createConfig(environment), {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      contextLoader
    });

    const reply = await service.answer({
      passengerId: "passenger_1",
      message: "نابلس",
      locale: "ar",
      history: [{ role: "assistant", text: "ما هي الوجهة المطلوبة؟" }]
    });

    expect(reply).toEqual({
      status: "clarification",
      message: "هذه الوجهة غير مدعومة حالياً. الوجهة المتاحة للبحث هي وسط بيت لحم.",
      suggestions: ["وسط بيت لحم"]
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(contextLoader).not.toHaveBeenCalled();
  });

  it("rejects malformed provider output instead of fabricating a result", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output_text: JSON.stringify({ status: "result", message: "جواب بلا بنية" })
    }), { status: 200 }));
    const service = createPassengerAssistantService(createConfig(environment), {
      fetchImpl: fetchImpl as typeof fetch,
      contextLoader: vi.fn().mockResolvedValue({ passenger_requests: [] })
    });

    await expect(service.answer({
      passengerId: "passenger_1",
      message: "هل توجد رحلة؟",
      locale: "ar",
      history: []
    })).rejects.toMatchObject({ category: "upstream" } satisfies Partial<PassengerAssistantProviderError>);
  });
});

describe("Gemini passenger assistant service", () => {
  it("uses Gemini structured output without exposing the key in the URL", async () => {
    let requestUrl: string | URL | Request | undefined;
    let requestInit: RequestInit | undefined;
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requestUrl = url;
      requestInit = init;
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify({
              status: "clarification",
              message: "أي يوم تقصد؟",
              suggestions: ["اليوم", "غداً"]
            }) }]
          }
        }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const service = createPassengerAssistantService(createConfig({
      ...environment,
      ASSISTANT_PROVIDER: "gemini",
      GEMINI_API_KEY: "gemini-test-key-that-is-long-enough",
      GEMINI_MODEL: "gemini-2.5-flash-lite"
    }), {
      fetchImpl: fetchImpl as typeof fetch,
      contextLoader: vi.fn().mockResolvedValue({ passenger_requests: [] })
    });

    const reply = await service.answer({
      passengerId: "passenger_1",
      message: "متى رحلتي؟",
      locale: "ar",
      history: []
    });

    expect(reply.status).toBe("clarification");
    expect(String(requestUrl)).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"
    );
    expect(String(requestUrl)).not.toContain("gemini-test-key");
    expect(requestInit?.headers).toEqual(expect.objectContaining({
      "x-goog-api-key": "gemini-test-key-that-is-long-enough"
    }));
    const body = JSON.parse(String(requestInit?.body));
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema.required).toEqual([
      "status", "message", "suggestions", "request"
    ]);
  });
});

describe("Groq passenger assistant service", () => {
  it("uses strict structured output with the free GPT-OSS model", async () => {
    let requestUrl: string | URL | Request | undefined;
    let requestInit: RequestInit | undefined;
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requestUrl = url;
      requestInit = init;
      return new Response(JSON.stringify({
        choices: [{
          message: {
            role: "assistant",
            content: JSON.stringify({
              status: "result",
              message: "لا توجد رحلة مؤكدة حالياً.",
              suggestions: []
            })
          }
        }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const service = createPassengerAssistantService(createConfig({
      ...environment,
      ASSISTANT_PROVIDER: "groq",
      GROQ_API_KEY: "gsk_test_key_that_is_long_enough",
      GROQ_MODEL: "openai/gpt-oss-20b"
    }), {
      fetchImpl: fetchImpl as typeof fetch,
      contextLoader: vi.fn().mockResolvedValue({ passenger_requests: [] })
    });

    const reply = await service.answer({
      passengerId: "passenger_1",
      message: "هل لدي رحلة؟",
      locale: "ar",
      history: []
    });

    expect(reply.status).toBe("result");
    expect(requestUrl).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(requestInit?.headers).toEqual(expect.objectContaining({
      Authorization: "Bearer gsk_test_key_that_is_long_enough"
    }));
    const body = JSON.parse(String(requestInit?.body));
    expect(body.model).toBe("openai/gpt-oss-20b");
    expect(body.response_format).toEqual(expect.objectContaining({
      type: "json_schema",
      json_schema: expect.objectContaining({ strict: true })
    }));
  });

  it("returns validated extracted data for review without claiming a match", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{
        message: {
          role: "assistant",
          content: JSON.stringify({
            status: "request_review",
            message: "راجع المعلومات ثم أكّد لبدء البحث.",
            suggestions: [],
            request: {
              pickup_key: "bab_al_zawiya",
              pickup_label: "Bab Al-Zawiya",
              destination_key: "bethlehem",
              destination_label: "Bethlehem Center",
              preferred_time: "2026-09-10T12:00:00+03:00",
              passenger_count: 1
            }
          })
        }
      }]
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const service = createPassengerAssistantService(createConfig({
      ...environment,
      ASSISTANT_PROVIDER: "groq",
      GROQ_API_KEY: "gsk_test_key_that_is_long_enough",
      GROQ_MODEL: "openai/gpt-oss-20b"
    }), {
      fetchImpl: fetchImpl as typeof fetch,
      contextLoader: vi.fn().mockResolvedValue({ passenger_requests: [] }),
      now: () => new Date("2026-09-10T08:00:00.000Z")
    });

    const reply = await service.answer({
      passengerId: "passenger_1",
      message: "ابحث لي من باب الزاوية إلى بيت لحم الساعة 3 مساءً لشخص",
      locale: "ar",
      history: []
    });

    expect(reply).toEqual({
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
    });
  });
});
