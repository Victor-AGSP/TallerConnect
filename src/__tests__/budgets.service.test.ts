import {
  BudgetsService,
  MockBudgetAdapter,
  ServiceError,
  budgetsService,
} from '@/services/budgets.service';
import { apiClient } from '@/services/api/client';
import {
  budgetDetailPayloads,
  budgetPagePayload,
} from '@/mocks/payloads/budget.payload';
import type { BudgetOperationResultDto } from '@/dto/budget.dto';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('budgetsService (Capa de Servicios de Presupuestos — MS3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    budgetsService.useRealAdapter();
    budgetsService.resetMocks();
  });

  describe('getBudgets y getBudgetsPage (GET /presupuestos)', () => {
    it('obtiene y mapea la página de presupuestos desde la API Gateway (/presupuestos)', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: budgetPagePayload,
      } as never);

      const page = await budgetsService.getBudgetsPage();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/presupuestos');
      expect(page.total).toBe(5);
      expect(page.offset).toBe(0);
      expect(page.limit).toBe(50);
      expect(page.items).toHaveLength(5);
      expect(page.items[0]).toEqual({
        id: '1',
        orderId: String(budgetDetailPayloads.borrador.orden_id),
        createdAt: '2026-03-03T15:00:00Z',
        versionCount: 1,
        latestVersion: 1,
        latestVersionStatus: 'borrador',
        latestVersionTotal: 29000,
        currentVersion: null,
      });
    });

    it('envía parámetros de consulta tipados (orden_id, desde, limite) definidos por el contrato MS3', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: {
          total: 1,
          desde: 0,
          limite: 10,
          presupuestos: [budgetPagePayload.presupuestos[1]],
        },
      } as never);

      const items = await budgetsService.getBudgets({
        orden_id: 102,
        desde: 0,
        limite: 10,
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/presupuestos', {
        params: { orden_id: 102, desde: 0, limite: 10 },
      });
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('2');
      expect(items[0].latestVersionStatus).toBe('enviada');
    });
  });

  describe('Obtención de detalle: getBudgetById, getBudgetByOrderId y getBudgetVersion', () => {
    it('obtiene el detalle completo de un presupuesto con sus versiones (GET /presupuestos/{presupuesto_id})', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: budgetDetailPayloads.aprobadoConModificacion,
      } as never);

      const budget = await budgetsService.getBudgetById(3);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/presupuestos/3');
      expect(budget.id).toBe('3');
      expect(budget.versionCount).toBe(2);
      expect(budget.currentVersion).toBe(1);
      expect(budget.versions).toHaveLength(2);
      expect(budget.versions[0].status).toBe('aprobada');
      expect(budget.versions[0].decision?.decision).toBe('aprobado');
      expect(budget.versions[1].isModification).toBe(true);
      expect(budget.versions[1].total).toBe(104000);
    });

    it('obtiene el presupuesto completo de una orden mediante getBudgetByOrderId', async () => {
      const targetOrderId = budgetDetailPayloads.enviado.orden_id;
      mockedApiClient.get
        .mockResolvedValueOnce({
          data: {
            total: 1,
            desde: 0,
            limite: 50,
            presupuestos: [budgetPagePayload.presupuestos[1]],
          },
        } as never)
        .mockResolvedValueOnce({
          data: budgetDetailPayloads.enviado,
        } as never);

      const budget = await budgetsService.getBudgetByOrderId(targetOrderId);

      expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, '/presupuestos', {
        params: { orden_id: targetOrderId },
      });
      expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/presupuestos/2');
      expect(budget).not.toBeNull();
      expect(budget?.id).toBe('2');
      expect(budget?.latestVersionTotal).toBe(20500);
    });

    it('obtiene una versión específica de un presupuesto (GET /presupuestos/{id}/versiones/{numero})', async () => {
      const rawVersion = budgetDetailPayloads.rechazado.versiones[0];
      mockedApiClient.get.mockResolvedValueOnce({
        data: rawVersion,
      } as never);

      const version = await budgetsService.getBudgetVersion(5, 1);

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/presupuestos/5/versiones/1'
      );
      expect(version.number).toBe(1);
      expect(version.status).toBe('rechazada');
      expect(version.total).toBe(350000);
      expect(version.decision?.reason).toContain('supera el presupuesto');
    });
  });

  describe('Mutaciones del ciclo de vida del presupuesto (POST / PUT)', () => {
    it('crea un presupuesto con versión 1 en borrador (POST /presupuestos)', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: budgetDetailPayloads.borrador,
      } as never);

      const created = await budgetsService.createBudget({
        orden_id: 101,
        items: [
          {
            tipo: 'mano_de_obra',
            descripcion: 'Diagnóstico del sistema de encendido',
            cantidad: 1,
            precio_unitario: '15000.00',
          },
        ],
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith('/presupuestos', {
        orden_id: 101,
        items: [
          {
            tipo: 'mano_de_obra',
            descripcion: 'Diagnóstico del sistema de encendido',
            cantidad: 1,
            precio_unitario: '15000.00',
          },
        ],
      });
      expect(created.id).toBe('1');
      expect(created.latestVersionStatus).toBe('borrador');
    });

    it('reemplaza los ítems de una versión en borrador (PUT /presupuestos/{id}/versiones/{numero}/items)', async () => {
      const updatedVersionDto = budgetDetailPayloads.borrador.versiones[0];
      mockedApiClient.put.mockResolvedValueOnce({
        data: updatedVersionDto,
      } as never);

      const version = await budgetsService.updateBudgetVersionItems(1, 1, {
        items: [
          {
            tipo: 'mano_de_obra',
            descripcion: 'Diagnóstico del sistema de encendido',
            cantidad: '1',
            precio_unitario: '15000.00',
          },
        ],
      });

      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/presupuestos/1/versiones/1/items',
        {
          items: [
            {
              tipo: 'mano_de_obra',
              descripcion: 'Diagnóstico del sistema de encendido',
              cantidad: '1',
              precio_unitario: '15000.00',
            },
          ],
        }
      );
      expect(version.total).toBe(29000);
    });

    it('envía una versión al cliente y procesa ResultadoOperacion (POST /presupuestos/{id}/versiones/{numero}/envio)', async () => {
      const operationResult: BudgetOperationResultDto = {
        presupuesto: budgetDetailPayloads.enviado,
        efecto_en_orden: 'esperando_aprobacion',
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: operationResult,
      } as never);

      const sent = await budgetsService.sendBudgetVersion(2, 1);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/presupuestos/2/versiones/1/envio'
      );
      expect(sent.latestVersionStatus).toBe('enviada');
    });

    it('registra la decisión del cliente sobre una versión enviada (POST /presupuestos/{id}/versiones/{numero}/decision)', async () => {
      const operationResult: BudgetOperationResultDto = {
        presupuesto: budgetDetailPayloads.esperandoRepuestos,
        efecto_en_orden: 'esperando_repuestos',
        decision_id: 2,
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: operationResult,
      } as never);

      const decided = await budgetsService.submitBudgetDecision(4, 1, {
        decision: 'aprobado',
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/presupuestos/4/versiones/1/decision',
        { decision: 'aprobado' }
      );
      expect(decided.latestVersionStatus).toBe('aprobada');
      expect(decided.currentVersion).toBe(1);
    });
  });

  describe('Manejo de errores y Adaptador Simulado (MockBudgetAdapter)', () => {
    it('normaliza errores HTTP 409, 422 y 503 (coordinación con MS2) en ServiceError del dominio budgets', async () => {
      mockedApiClient.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 503,
          data: {
            detail: 'El envío se guardó, pero falta confirmar el efecto en MS2',
          },
        },
      });

      await expect(budgetsService.sendBudgetVersion(1, 1)).rejects.toMatchObject(
        {
          name: 'ServiceError',
          status: 503,
          code: 'BUDGET_COORDINATION_ERROR',
          domain: 'budgets',
          message: 'El envío se guardó, pero falta confirmar el efecto en MS2',
        }
      );
    });

    it('ejecuta el flujo completo en MockBudgetAdapter: crear → editar ítems → enviar → decidir → crear versión modificada', async () => {
      const mockService = new BudgetsService(new MockBudgetAdapter());

      // 1. Crear presupuesto para una orden nueva
      const created = await mockService.createBudget({
        orden_id: '999',
        items: [
          {
            tipo: 'mano_de_obra',
            descripcion: 'Alineación y balanceo',
            cantidad: 1,
            precio_unitario: 25000,
          },
        ],
      });
      expect(created.orderId).toBe('999');
      expect(created.latestVersionStatus).toBe('borrador');
      expect(created.latestVersionTotal).toBe(25000);

      // 2. Actualizar ítems en borrador
      const updatedVersion = await mockService.updateBudgetVersionItems(
        created.id,
        1,
        {
          items: [
            {
              tipo: 'mano_de_obra',
              descripcion: 'Alineación y balanceo',
              cantidad: 1,
              precio_unitario: 25000,
            },
            {
              tipo: 'repuesto',
              descripcion: 'Filtro de aceite',
              cantidad: 2,
              precio_unitario: 8500,
              repuesto_id: 10,
            },
          ],
        }
      );
      expect(updatedVersion.total).toBe(42000);

      // 3. Enviar versión 1 al cliente
      const sent = await mockService.sendBudgetVersion(created.id, 1);
      expect(sent.latestVersionStatus).toBe('enviada');

      // 4. Intentar rechazar sin motivo lanza 422 BUDGET_VALIDATION_ERROR
      await expect(
        mockService.submitBudgetDecision(created.id, 1, {
          decision: 'rechazado',
        })
      ).rejects.toMatchObject({
        name: 'ServiceError',
        status: 422,
        code: 'BUDGET_VALIDATION_ERROR',
        domain: 'budgets',
      });

      // 5. Aprobar versión 1
      const approved = await mockService.submitBudgetDecision(created.id, 1, {
        decision: 'aprobado',
      });
      expect(approved.latestVersionStatus).toBe('aprobada');
      expect(approved.currentVersion).toBe(1);

      // 6. Crear versión 2 (modificación tras aprobación) copiando la versión 1
      const withV2 = await mockService.createBudgetVersion(created.id, {
        copiar_de: 1,
      });
      expect(withV2.versionCount).toBe(2);
      expect(withV2.versions[1].isModification).toBe(true);
      expect(withV2.versions[1].status).toBe('borrador');
    });
  });
});

