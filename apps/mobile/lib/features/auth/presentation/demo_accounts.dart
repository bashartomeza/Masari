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

const demoAccounts = [
  DemoAccount(
    labelKey: 'passenger',
    phone: '+970590000001',
    password: 'demo-passenger-123',
  ),
  DemoAccount(
    labelKey: 'driver',
    phone: '+970590000002',
    password: 'demo-driver-123',
  ),
  DemoAccount(
    labelKey: 'merchant',
    phone: '+970590000004',
    password: 'demo-merchant-123',
  ),
];
