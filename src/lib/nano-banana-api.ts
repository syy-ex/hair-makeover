type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type NanoRequestOptions = {
  method?: HttpMethod;
  body?: FormData | Record<string, unknown>;
  additionalHeaders?: Record<string, string>;
  baseUrl?: string;
};

/**
 * Utility function to make Nano-banana API requests with proper headers
 */
export async function nanoBananaRequest<T = any>(
  endpoint: string,
  apiKey: string,
  options: NanoRequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, additionalHeaders = {}, baseUrl } = options;

  if (!apiKey) {
    throw new Error('API key is required for Nano-banana API requests');
  }

  const resolvedBaseUrl = baseUrl || process.env.NANO_API_URL;
  if (!resolvedBaseUrl) {
    throw new Error('NANO_API_URL environment variable is not set');
  }
  const normalizedBaseUrl = resolvedBaseUrl.replace(/\/$/, '');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...additionalHeaders,
  };

  const requestOptions: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    if (body instanceof FormData) {
      requestOptions.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(body);
    }
  }

  const url = `${normalizedBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      try {
        errorData = { error: (await response.text()) || response.statusText };
      } catch (textError) {
        errorData = { error: response.statusText || 'Unknown error' };
      }
    }

    throw new Error(
      JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        details: errorData,
      })
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  try {
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error('Failed to parse response');
  }
}
