import '../../../core/config/app_config.dart';

class DemoAccount {
  const DemoAccount({
    required this.labelKey,
    required this.phone,
    required this.password,
  });

  final String labelKey;
  final String phone;
  final String password;
}

List<DemoAccount> demoAccountsFor(AppConfig config) {
  final credentials = config.demoCredentials;
  if (!config.demoFeaturesEnabled || credentials == null) return const [];
  return [
    DemoAccount(
      labelKey: 'passenger',
      phone: credentials.passengerPhone,
      password: credentials.passengerPassword,
    ),
    DemoAccount(
      labelKey: 'driver',
      phone: credentials.driverPhone,
      password: credentials.driverPassword,
    ),
    DemoAccount(
      labelKey: 'merchant',
      phone: credentials.merchantPhone,
      password: credentials.merchantPassword,
    ),
  ];
}
