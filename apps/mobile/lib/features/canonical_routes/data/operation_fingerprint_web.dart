import 'dart:convert';

/// Web FNV-1a fingerprint.
///
/// JavaScript numbers cannot represent the 64-bit literals the native
/// implementation relies on, so the same arithmetic is done with [BigInt].
///
/// Output is identical to [operation_fingerprint_io.dart]: masking with
/// 0x7fffffffffffffff on every iteration keeps only the low 63 bits, and the
/// low 63 bits of a product never depend on higher bits, so wrapping at 2^64
/// (native) and masking a BigInt (here) yield the same value.
final BigInt _offsetBasis = BigInt.parse('cbf29ce484222325', radix: 16);
final BigInt _prime = BigInt.from(0x100000001b3);
final BigInt _mask = BigInt.parse('7fffffffffffffff', radix: 16);

String operationFingerprint(String value) {
  final bytes = utf8.encode(value);
  if (bytes.isEmpty) {
    // With no bytes the native loop never applies the mask, so the offset basis
    // survives as a *signed* 64-bit value (negative). Mirror that exactly.
    return (_offsetBasis - (BigInt.one << 64))
        .toRadixString(16)
        .padLeft(16, '0');
  }
  var hash = _offsetBasis;
  for (final unit in bytes) {
    hash = (hash ^ BigInt.from(unit)) * _prime & _mask;
  }
  return hash.toRadixString(16).padLeft(16, '0');
}
