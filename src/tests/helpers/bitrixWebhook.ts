import type { Bx24Api, Bx24CallResult } from '../../env.d';

type WebhookResponse = {
  result?: unknown;
  total?: number;
  next?: number;
  error?: string;
  error_description?: string;
};

function getWebhookBaseUrl(): string {
  const raw = (process.env.BITRIX_WEBHOOK_URL ?? '').trim();
  if (!raw) {
    throw new Error('BITRIX_WEBHOOK_URL не задан в .env');
  }
  return raw.replace(/\/$/, '');
}

export function getTestContactId(): string {
  return String(process.env.BITRIX_TEST_CONTACT_ID ?? '32610').trim();
}

export async function callBitrixWebhook(
  method: string,
  params: Record<string, unknown> = {},
): Promise<WebhookResponse> {
  const response = await fetch(`${getWebhookBaseUrl()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Webhook HTTP ${response.status} для ${method}`);
  }

  return response.json() as Promise<WebhookResponse>;
}

function createCallResult(
  json: WebhookResponse,
  method: string,
  params: Record<string, unknown>,
  callback: (result: Bx24CallResult) => void,
): Bx24CallResult {
  const result: Bx24CallResult = {
    error: () => {
      if (!json.error) {
        return false;
      }
      return json.error_description || json.error;
    },
    data: () => json.result,
    total: () => Number(json.total ?? 0),
    more: () => json.next != null,
    next: () => {
      void callBitrixWebhook(method, { ...params, start: json.next }).then((nextJson) => {
        callback(createCallResult(nextJson, method, params, callback));
      }).catch((error) => {
        callback({
          error: () => String(error),
          data: () => null,
          total: () => 0,
          more: () => false,
        });
      });
    },
  };

  return result;
}

/** Подменяет BX24.callMethod / callBatch на REST webhook из .env. */
export function installBitrixWebhookMock(): () => void {
  const previous = (globalThis as { BX24?: Bx24Api }).BX24
    ?? (typeof window !== 'undefined' ? window.BX24 : undefined);

  const bx24: Bx24Api = {
    callMethod(method, params, callback) {
      void callBitrixWebhook(method, (params ?? {}) as Record<string, unknown>)
        .then((json) => {
          callback(createCallResult(
            json,
            method,
            (params ?? {}) as Record<string, unknown>,
            callback,
          ));
        })
        .catch((error) => {
          callback({
            error: () => String(error),
            data: () => null,
            total: () => 0,
            more: () => false,
          });
        });
    },
    callBatch(commands, callback) {
      void (async () => {
        const entries = Object.entries(commands as Record<string, { method: string; params?: Record<string, unknown> }>);
        const results: Record<string, Bx24CallResult> = {};

        for (const [key, command] of entries) {
          try {
            const json = await callBitrixWebhook(command.method, command.params ?? {});
            results[key] = createCallResult(
              json,
              command.method,
              command.params ?? {},
              () => undefined,
            );
          } catch (error) {
            results[key] = {
              error: () => String(error),
              data: () => null,
              total: () => 0,
              more: () => false,
            };
          }
        }

        callback(results);
      })();
    },
  };

  (globalThis as { BX24?: Bx24Api }).BX24 = bx24;
  if (typeof window !== 'undefined') {
    window.BX24 = bx24;
  }

  return () => {
    (globalThis as { BX24?: Bx24Api }).BX24 = previous;
    if (typeof window !== 'undefined') {
      window.BX24 = previous;
    }
  };
}
