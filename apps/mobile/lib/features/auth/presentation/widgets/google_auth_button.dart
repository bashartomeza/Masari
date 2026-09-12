import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../data/google_sign_in_service.dart';
import 'google_render_button_stub.dart'
    if (dart.library.js_interop) 'google_render_button_web.dart';

/// "Continue with Google" affordance.
///
/// On web this is the official Google Identity Services button and the ID
/// token arrives asynchronously on the sign-in event stream. On mobile it is a
/// normal outlined button that runs the native flow and returns the token
/// inline. Either way [onIdToken] fires once with a Google ID token.
class GoogleAuthButton extends ConsumerStatefulWidget {
  const GoogleAuthButton({
    super.key,
    required this.onIdToken,
    required this.onError,
    this.enabled = true,
  });

  final ValueChanged<String> onIdToken;
  final ValueChanged<Object> onError;
  final bool enabled;

  @override
  ConsumerState<GoogleAuthButton> createState() => _GoogleAuthButtonState();
}

class _GoogleAuthButtonState extends ConsumerState<GoogleAuthButton> {
  StreamSubscription<GoogleSignInAuthenticationEvent>? _eventsSub;
  bool _busy = false;

  GoogleSignInService get _service => ref.read(googleSignInServiceProvider);

  @override
  void initState() {
    super.initState();
    if (!_service.isConfigured) return;
    _service.ensureInitialized().catchError((Object error) {
      if (mounted) widget.onError(error);
    });
    if (kIsWeb) {
      _eventsSub = _service.authenticationEvents.listen(
        _handleEvent,
        onError: (Object error) => widget.onError(error),
      );
    }
  }

  @override
  void dispose() {
    _eventsSub?.cancel();
    super.dispose();
  }

  void _handleEvent(GoogleSignInAuthenticationEvent event) {
    if (!mounted || !widget.enabled) return;
    if (event is GoogleSignInAuthenticationEventSignIn) {
      final idToken = event.user.authentication.idToken;
      if (idToken != null) widget.onIdToken(idToken);
    }
  }

  Future<void> _authenticateNative() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final idToken = await _service.authenticate();
      if (idToken != null) widget.onIdToken(idToken);
    } catch (error) {
      widget.onError(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (!_service.isConfigured) return const SizedBox.shrink();

    if (kIsWeb) {
      // The GIS button paints its own label; disable pointer events while the
      // form is busy so a second click can't race the first.
      return Align(
        alignment: AlignmentDirectional.centerStart,
        child: IgnorePointer(
          ignoring: !widget.enabled,
          child: Opacity(
            opacity: widget.enabled ? 1 : 0.5,
            child: googleRenderButton(),
          ),
        ),
      );
    }

    return OutlinedButton.icon(
      key: const ValueKey('googleSignInButton'),
      onPressed: widget.enabled && !_busy ? _authenticateNative : null,
      icon: _busy
          ? const SizedBox.square(
              dimension: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.g_mobiledata, size: 24),
      label: Text(l10n.continueWithGoogle),
    );
  }
}
