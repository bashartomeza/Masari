import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_error.dart';
import '../data/passenger_assistant_repository.dart';
import '../domain/passenger_assistant_models.dart';

final passengerAssistantControllerProvider =
    AsyncNotifierProvider<
      PassengerAssistantController,
      PassengerAssistantState
    >(PassengerAssistantController.new);

class PassengerAssistantController
    extends AsyncNotifier<PassengerAssistantState> {
  @override
  Future<PassengerAssistantState> build() async {
    // The asynchronous boundary gives the screen a deterministic initial
    // loading state without inventing conversation content.
    await Future<void>.value();
    return const PassengerAssistantState();
  }

  Future<void> submit(String query, {required String locale}) async {
    await _send(query, locale: locale, appendPassengerMessage: true);
  }

  Future<void> retry() async {
    final current = state.value;
    final query = current?.lastQuery;
    if (query == null || query.isEmpty) return;
    await _send(
      query,
      locale: current?.lastLocale ?? 'ar',
      appendPassengerMessage: false,
    );
  }

  Future<void> confirmAndSearch(PassengerAssistantTripDraft draft) async {
    final current = state.value;
    if (current == null ||
        current.phase != PassengerAssistantPhase.requestReview) {
      return;
    }
    state = AsyncData(
      PassengerAssistantState(
        phase: PassengerAssistantPhase.searching,
        messages: current.messages,
        suggestions: current.suggestions,
        conversationId: current.conversationId,
        lastQuery: current.lastQuery,
        lastLocale: current.lastLocale,
        draft: draft,
      ),
    );
    try {
      final results = await ref
          .read(passengerAssistantRepositoryProvider)
          .searchTrips(draft);
      state = AsyncData(
        PassengerAssistantState(
          phase: PassengerAssistantPhase.result,
          messages: current.messages,
          suggestions: current.suggestions,
          conversationId: current.conversationId,
          lastQuery: current.lastQuery,
          lastLocale: current.lastLocale,
          draft: draft,
          tripOptions: results,
        ),
      );
    } catch (error) {
      state = AsyncData(
        PassengerAssistantState(
          phase: PassengerAssistantPhase.requestReview,
          messages: current.messages,
          suggestions: current.suggestions,
          conversationId: current.conversationId,
          lastQuery: current.lastQuery,
          lastLocale: current.lastLocale,
          draft: draft,
          searchFailure: _failureFor(error),
        ),
      );
    }
  }

  Future<String?> selectTrip(PassengerAssistantTripOption option) async {
    final current = state.value;
    final draft = current?.draft;
    if (current == null ||
        draft == null ||
        current.phase != PassengerAssistantPhase.result ||
        current.selectingTripId != null ||
        !current.tripOptions.any((value) => value.id == option.id)) {
      return null;
    }

    state = AsyncData(
      PassengerAssistantState(
        phase: current.phase,
        messages: current.messages,
        suggestions: current.suggestions,
        conversationId: current.conversationId,
        lastQuery: current.lastQuery,
        lastLocale: current.lastLocale,
        draft: draft,
        tripOptions: current.tripOptions,
        selectingTripId: option.id,
      ),
    );

    try {
      return await ref
          .read(passengerAssistantRepositoryProvider)
          .selectTrip(draft: draft, option: option);
    } catch (error) {
      state = AsyncData(
        PassengerAssistantState(
          phase: current.phase,
          messages: current.messages,
          suggestions: current.suggestions,
          conversationId: current.conversationId,
          lastQuery: current.lastQuery,
          lastLocale: current.lastLocale,
          draft: draft,
          tripOptions: current.tripOptions,
          selectionFailure: _failureFor(error),
        ),
      );
      return null;
    }
  }

  void editSearch() {
    final current = state.value;
    if (current?.draft == null || current?.selectingTripId != null) return;
    state = AsyncData(
      PassengerAssistantState(
        phase: PassengerAssistantPhase.requestReview,
        messages: current!.messages,
        suggestions: current.suggestions,
        conversationId: current.conversationId,
        lastQuery: current.lastQuery,
        lastLocale: current.lastLocale,
        draft: current.draft,
      ),
    );
  }

  Future<void> _send(
    String query, {
    required String locale,
    required bool appendPassengerMessage,
  }) async {
    final normalized = query.trim();
    if (normalized.isEmpty) return;
    final current = state.value ?? const PassengerAssistantState();
    if (current.phase == PassengerAssistantPhase.processing ||
        current.phase == PassengerAssistantPhase.searching ||
        current.selectingTripId != null) {
      return;
    }

    final history = [...current.messages];
    if (!appendPassengerMessage &&
        history.isNotEmpty &&
        history.last.role == PassengerAssistantMessageRole.passenger &&
        history.last.text == normalized) {
      history.removeLast();
    }

    final messages = [
      ...current.messages,
      if (appendPassengerMessage)
        PassengerAssistantMessage.passenger(normalized),
    ];
    final processing = PassengerAssistantState(
      phase: PassengerAssistantPhase.processing,
      messages: messages,
      conversationId: current.conversationId,
      lastQuery: normalized,
      lastLocale: locale,
    );
    state = AsyncData(processing);

    try {
      final reply = await ref
          .read(passengerAssistantRepositoryProvider)
          .ask(
            message: normalized,
            locale: locale,
            history: history,
            conversationId: current.conversationId,
          );
      state = AsyncData(
        PassengerAssistantState(
          phase: switch (reply.type) {
            PassengerAssistantReplyType.clarification =>
              PassengerAssistantPhase.clarification,
            PassengerAssistantReplyType.requestReview =>
              PassengerAssistantPhase.requestReview,
            PassengerAssistantReplyType.result =>
              PassengerAssistantPhase.result,
          },
          messages: [
            ...messages,
            PassengerAssistantMessage.assistant(reply.message),
          ],
          suggestions: reply.suggestions,
          conversationId: reply.conversationId ?? current.conversationId,
          lastQuery: normalized,
          lastLocale: locale,
          draft: reply.draft,
        ),
      );
    } catch (error) {
      state = AsyncData(
        PassengerAssistantState(
          phase: PassengerAssistantPhase.error,
          messages: messages,
          conversationId: current.conversationId,
          lastQuery: normalized,
          lastLocale: locale,
          failure: _failureFor(error),
        ),
      );
    }
  }
}

PassengerAssistantFailure _failureFor(Object error) {
  if (error is ApiException) {
    if (error.statusCode == 404 || error.statusCode == 503) {
      return PassengerAssistantFailure.unavailable;
    }
    if (error.type == ApiErrorType.network ||
        error.type == ApiErrorType.timeout) {
      return PassengerAssistantFailure.network;
    }
  }
  return PassengerAssistantFailure.generic;
}
