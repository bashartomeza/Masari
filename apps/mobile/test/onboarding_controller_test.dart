import 'package:flutter_test/flutter_test.dart';
import 'package:masari_mobile/features/onboarding/application/onboarding_controller.dart';
import 'package:masari_mobile/features/onboarding/data/onboarding_repository.dart';

void main() {
  test('Arabic and Persian OTP digits normalize to ASCII', () {
    expect(normalizeOtpDigits('١٢٣٤٥٦'), '123456');
    expect(normalizeOtpDigits('۱۲۳۴۵۶'), '123456');
    expect(normalizeOtpDigits('1 2-٣٤x۵۶'), '123456');
  });

  test('idempotency keys are random-looking and operation scoped', () {
    final first = newIdempotencyKey();
    final second = newIdempotencyKey();

    expect(first, isNot(second));
    expect(first.length, 32);
    expect(RegExp(r'^[A-Za-z0-9._:-]+$').hasMatch(first), isTrue);
  });
}
