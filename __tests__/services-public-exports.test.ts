import * as services from '@/services';
import * as orders from '@/services/orders.service';
import * as parts from '@/services/parts.service';
import * as budgets from '@/services/budgets.service';
import * as evidence from '@/services/evidence.service';
import * as providers from '@/services/providers.service';
import * as errors from '@/services/service-error';

// También cubre los alias legacy y las reexportaciones de proveedores en parts.
it.each(Object.entries({ orders, parts, budgets, evidence, providers, errors }))(
  'el barrel conserva la API pública de %s y la identidad de sus exportaciones',
  (_name, exports) => {
    for (const [name, value] of Object.entries(exports)) {
      expect({ name, value: (services as Record<string, unknown>)[name] }).toEqual({ name, value });
    }
  },
);
