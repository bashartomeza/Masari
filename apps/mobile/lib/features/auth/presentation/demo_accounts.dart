import '../../../core/config/app_config.dart';

class DemoAccount {
  const DemoAccount({
    required this.labelKey,
    required this.email,
    required this.password,
  });

  final String labelKey;
  final String email;
  final String password;
}

List<DemoAccount> demoAccountsFor(AppConfig config) {
  final credentials = config.demoCredentials;
  if (!config.demoFeaturesEnabled || credentials == null) return const [];
  return [
    DemoAccount(
      labelKey: 'passenger',
      email: credentials.passengerEmail,
      password: credentials.passengerPassword,
    ),
    DemoAccount(
      labelKey: 'driver',
      email: credentials.driverEmail,
      password: credentials.driverPassword,
    ),
    DemoAccount(
      labelKey: 'merchant',
      email: credentials.merchantEmail,
      password: credentials.merchantPassword,
    ),
  ];
}
