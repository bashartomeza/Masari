import 'dart:convert';

/// Native (Dart VM / Android) FNV-1a fingerprint.
///
/// Kept byte-for-byte identical to the original implementation so the Android
/// build is unchanged. See [operation_fingerprint_web.dart] for the web variant,
/// which cannot use 64-bit integer literals.
String operationFingerprint(String value) {
  var hash = 0xcbf29ce484222325;
  for (final unit in utf8.encode(value)) {
    hash ^= unit;
    hash = (hash * 0x100000001b3) & 0x7fffffffffffffff;
  }
  return hash.toRadixString(16).padLeft(16, '0');
}
