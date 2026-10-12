# Actor-private provider isolation

M7H1 treats the signed-in actor as part of the identity of every private Flutter provider. The driver trust score is keyed by actor ID and checks the current actor both before its request and immediately before publication. Authentication teardown clears that binding and invalidates only authenticated work; it does not delete the global unresolved secure-operation bundle.

The permanent regression uses deterministic completers. Driver A starts an `86` response, authenticated work terminates, Driver B authenticates and publishes `22`, and then A's delayed value or delayed error completes. Neither completion may replace B's state. The same boundary is exercised for normal logout/account switch and terminal session/logout-all behavior without sleeps or sentinel logging.

This is defense in depth around Riverpod invalidation. A provider instance that was created for one actor is never a valid publication channel for another actor, even if network completion races authentication teardown.
