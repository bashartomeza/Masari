import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { HttpError } from "../middleware/error.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  createPassengerAssistantService,
  PassengerAssistantProviderError,
  type PassengerAssistantService
} from "../services/passengerAssistant.js";

const assistantMessageSchema = z.object({
  message: z.string().trim().min(1).max(1_000),
  locale: z.enum(["ar", "en"]).default("ar"),
  conversation_id: z.string().trim().min(1).max(128).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    text: z.string().trim().min(1).max(2_000)
  }).strict()).max(8).default([])
}).strict();

export function createPassengerAssistantRouter(
  appConfig: AppConfig,
  service: PassengerAssistantService = createPassengerAssistantService(appConfig)
) {
  const router = Router();
  router.use("/passenger/assistant", requireAuth, requireRole("passenger"));

  router.post("/passenger/assistant/messages", async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = assistantMessageSchema.parse(req.body);
      const reply = await service.answer({
        passengerId: req.user!.id,
        message: input.message,
        locale: input.locale,
        history: input.history
      });
      const conversationId = input.conversation_id ?? randomUUID();

      if (reply.status === "request_review") {
        res.json({
          status: "request_review",
          message: reply.message,
          extracted: {
            pickup_key: reply.request!.pickupKey,
            pickup_label: reply.request!.pickupLabel,
            destination_key: reply.request!.destinationKey,
            destination_label: reply.request!.destinationLabel,
            preferred_time: reply.request!.preferredTime,
            passenger_count: reply.request!.passengerCount
          },
          suggestions: [],
          conversation_id: conversationId
        });
        return;
      }

      if (reply.status === "clarification") {
        res.json({
          status: "clarification",
          question: reply.message,
          suggestions: reply.suggestions,
          conversation_id: conversationId
        });
        return;
      }

      res.json({
        status: "result",
        answer: reply.message,
        suggestions: [],
        conversation_id: conversationId
      });
    } catch (error) {
      if (error instanceof PassengerAssistantProviderError) {
        req.operationalLog?.warn(
          { event: "passenger_assistant_provider_failure", category: error.category },
          "Passenger assistant request failed"
        );
        const statusCode = error.category === "timeout" ? 504 : error.category === "upstream" ? 502 : 503;
        const errorCode = error.category === "timeout"
          ? "assistant_timeout"
          : error.category === "upstream"
            ? "assistant_provider_error"
            : "assistant_unavailable";
        next(new HttpError(statusCode, errorCode));
        return;
      }
      next(error);
    }
  });

  return router;
}
