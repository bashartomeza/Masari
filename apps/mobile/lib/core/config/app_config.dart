import 'package:flutter_riverpod/flutter_riverpod.dart';

enum MasariAppEnvironment { local, test, demo, staging, production }

class DemoCredentialConfig {
  const DemoCredentialConfig({
    required this.passengerPhone,
    required this.passengerPassword,
    required this.driverPhone,
    required this.driverPassword,
    required this.merchantPhone,
    required this.merchantPassword,
  });

  final String passengerPhone;
  final String passengerPassword;
  final String driverPhone;
  final String driverPassword;
  final String merchantPhone;
  final String merchantPassword;
}

class AppConfig {
  const AppConfig({
    required this.appEnvironment,
    required this.apiBaseUrl,
    required this.demoFeaturesEnabled,
    this.demoCredentials,
  });

  factory AppConfig.fromEnvironment() {
    return AppConfig.fromValues(
      appEnvironment: const String.fromEnvironment('APP_ENV'),
      apiBaseUrl: const String.fromEnvironment('API_BASE_URL'),
      enableDemoFeatures: const bool.fromEnvironment('ENABLE_DEMO_FEATURES'),
      passengerPhone: const String.fromEnvironment('DEMO_PASSENGER_PHONE'),
      passengerPassword: const String.fromEnvironment(
        'DEMO_PASSENGER_PASSWORD',
      ),
      driverPhone: const String.fromEnvironment('DEMO_DRIVER_PHONE'),
      driverPassword: const String.fromEnvironment('DEMO_DRIVER_PASSWORD'),
      merchantPhone: const String.fromEnvironment('DEMO_MERCHANT_PHONE'),
      merchantPassword: const String.fromEnvironment('DEMO_MERCHANT_PASSWORD'),
    );
  }

  factory AppConfig.fromValues({
    required String appEnvironment,
    required String apiBaseUrl,
    required bool enableDemoFeatures,
    String passengerPhone = '',
    String passengerPassword = '',
    String driverPhone = '',
    String driverPassword = '',
    String merchantPhone = '',
    String merchantPassword = '',
  }) {
    final environment = MasariAppEnvironment.values
        .where((value) => value.name == appEnvironment)
        .firstOrNull;
    if (environment == null) {
      throw StateError('APP_ENV is missing or invalid');
    }
    if (apiBaseUrl.isEmpty) {
      throw StateError('API_BASE_URL is required');
    }
    final productionLike =
        environment == MasariAppEnvironment.staging ||
        environment == MasariAppEnvironment.production;
    if (productionLike && !apiBaseUrl.startsWith('https://')) {
      throw StateError('API_BASE_URL must use HTTPS in staging and production');
    }
    if (productionLike && enableDemoFeatures) {
      throw StateError(
        'ENABLE_DEMO_FEATURES cannot be enabled in staging or production',
      );
    }
    final demoAllowed =
        environment == MasariAppEnvironment.local ||
        environment == MasariAppEnvironment.test ||
        environment == MasariAppEnvironment.demo;
    final demoFeaturesEnabled = demoAllowed && enableDemoFeatures;
    final demoValues = [
      passengerPhone,
      passengerPassword,
      driverPhone,
      driverPassword,
      merchantPhone,
      merchantPassword,
    ];
    if (demoFeaturesEnabled && demoValues.any((value) => value.isEmpty)) {
      throw StateError(
        'Demo credentials are required when demo features are enabled',
      );
    }
    return AppConfig(
      appEnvironment: environment,
      apiBaseUrl: apiBaseUrl.replaceFirst(RegExp(r'/$'), ''),
      demoFeaturesEnabled: demoFeaturesEnabled,
      demoCredentials: demoFeaturesEnabled
          ? DemoCredentialConfig(
              passengerPhone: passengerPhone,
              passengerPassword: passengerPassword,
              driverPhone: driverPhone,
              driverPassword: driverPassword,
              merchantPhone: merchantPhone,
              merchantPassword: merchantPassword,
            )
          : null,
    );
  }

  final MasariAppEnvironment appEnvironment;
  final String apiBaseUrl;
  final bool demoFeaturesEnabled;
  final DemoCredentialConfig? demoCredentials;
}

final appConfigProvider = Provider<AppConfig>((ref) {
  return AppConfig.fromEnvironment();
});
