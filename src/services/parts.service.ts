
export type Part = {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  stock: number;
  minimumStock: number;
  price: number;
};

const demoParts: Part[] = [
  {
    id: 'REP-001',
    name: 'Filtro de aceite',
    providerId: 'PROV-001',
    providerName: 'Repuestos del Sur',
    stock: 18,
    minimumStock: 5,
    price: 15000,
  },
  {
    id: 'REP-002',
    name: 'Aceite de motor 5W-30',
    providerId: 'PROV-002',
    providerName: 'Lubricantes Chile',
    stock: 3,
    minimumStock: 8,
    price: 8500,
  },
  {
    id: 'REP-003',
    name: 'Pastillas de freno',
    providerId: 'PROV-001',
    providerName: 'Repuestos del Sur',
    stock: 2,
    minimumStock: 4,
    price: 32000,
  },
  {
    id: 'REP-004',
    name: 'Bujías',
    providerId: 'PROV-003',
    providerName: 'AutoPartes Central',
    stock: 24,
    minimumStock: 6,
    price: 6500,
  },
  {
    id: 'REP-005',
    name: 'Filtro de aire',
    providerId: 'PROV-002',
    providerName: 'Lubricantes Chile',
    stock: 0,
    minimumStock: 5,
    price: 12000,
  },
];

export function getParts(): Part[] {
  return demoParts.map((part) => ({ ...part }));
}

export function getPartById(id: string): Part | undefined {
  const part = demoParts.find((item) => item.id === id);
  return part ? { ...part } : undefined;
}

export function getLowStockParts(): Part[] {
  return getParts().filter((part) => part.stock <= part.minimumStock);
}

export function getOutOfStockParts(): Part[] {
  return getParts().filter((part) => part.stock === 0);
}
