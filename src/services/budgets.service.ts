
export type BudgetItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export type Budget = {
  id: string;
  orderNumber: string;
  status: string;
  date: string;
  version: number;
  vehiclePlate: string;
  items: BudgetItem[];
};

const demoBudgets: Budget[] = [
  {
    id: 'PRES-001',
    orderNumber: 'OT-00124',
    status: 'Aprobado',
    date: '21/10/2026',
    version: 2,
    vehiclePlate: 'AB-CD-12',
    items: [
      {
        id: '1',
        name: 'Filtro de aceite',
        quantity: 1,
        price: 15000,
      },
      {
        id: '2',
        name: 'Aceite de motor',
        quantity: 4,
        price: 8500,
      },
      {
        id: '3',
        name: 'Mantención preventiva',
        quantity: 1,
        price: 45000,
      },
    ],
  },
];

export function getBudgets(): Budget[] {
  return demoBudgets.map((budget) => ({
    ...budget,
    items: budget.items.map((item) => ({ ...item })),
  }));
}

export function getBudgetById(id: string): Budget | undefined {
  const budget = demoBudgets.find(
    (item) => item.id === id || item.orderNumber === id,
  );

  if (!budget) {
    return undefined;
  }

  return {
    ...budget,
    items: budget.items.map((item) => ({ ...item })),
  };
}

export function calculateBudgetTotal(budget: Budget): number {
  return budget.items.reduce(
    (total, item) => total + item.quantity * item.price,
    0,
  );
}
