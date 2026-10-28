
export type Provider = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  parts: string[];
};

const demoProviders: Provider[] = [
  {
    id: 'PROV-001',
    name: 'Repuestos del Sur',
    contact: 'ventas@repuestosdelsur.cl',
    phone: '+56 9 5555 0101',
    parts: ['REP-001', 'REP-003'],
  },
  {
    id: 'PROV-002',
    name: 'Lubricantes Chile',
    contact: 'contacto@lubricantes.cl',
    phone: '+56 9 5555 0102',
    parts: ['REP-002', 'REP-005'],
  },
  {
    id: 'PROV-003',
    name: 'AutoPartes Central',
    contact: 'ventas@autopartes.cl',
    phone: '+56 9 5555 0103',
    parts: ['REP-004'],
  },
];

export function getProviders(): Provider[] {
  return demoProviders.map((provider) => ({
    ...provider,
    parts: [...provider.parts],
  }));
}

export function getProviderById(id: string): Provider | undefined {
  const provider = demoProviders.find((item) => item.id === id);

  return provider
    ? { ...provider, parts: [...provider.parts] }
    : undefined;
}
