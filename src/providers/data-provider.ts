import type {
  BaseRecord,
  CreateParams,
  CreateResponse,
  CrudFilters,
  CustomParams,
  CustomResponse,
  DataProvider,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  UpdateParams,
} from "@refinedev/core";

const API_BASE = "/api/v1";

type ListResponse<T> =
  | { items: T[]; total: number; page?: number; limit?: number }
  | T[];

const fetchJson = async (
  url: string,
  init?: RequestInit
): Promise<{ status: number; body: unknown }> => {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
};

const throwIfError = (status: number, body: unknown) => {
  if (status >= 400) {
    const errorObject =
      typeof body === "object" && body !== null ? body : { body };
    throw {
      message: "Request failed",
      statusCode: status,
      ...errorObject,
    };
  }
};

const extractData = <TData>(body: unknown): TData => {
  if (
    body &&
    typeof body === "object" &&
    "data" in (body as Record<string, unknown>)
  ) {
    const extracted = (body as { data?: unknown }).data;
    return (extracted ?? body) as TData;
  }

  return body as TData;
};

/**
 * Refine DataProvider
 * - REST 엔드포인트(`/api/v1`) 호출
 * - 인증은 쿠키 기반(NextAuth 세션)으로 위임
 */
export const dataProvider: DataProvider = {
  getApiUrl: () => API_BASE,

  getList: async <TData extends BaseRecord = BaseRecord>({
    resource,
    pagination,
    filters,
    sorters,
  }: GetListParams): Promise<GetListResponse<TData>> => {
    const params = new URLSearchParams();

    const current = (pagination as { current?: number } | undefined)?.current;
    const pageSize = (pagination as { pageSize?: number } | undefined)
      ?.pageSize;

    if (current) params.set("page", String(current));
    if (pageSize) params.set("limit", String(pageSize));

    if (sorters && sorters.length > 0) {
      params.set("sortBy", String(sorters[0].field));
      params.set("sortOrder", sorters[0].order ?? "asc");
    }

    (filters as CrudFilters | undefined)?.forEach((filter) => {
      if ("field" in filter && "value" in filter && filter.value != null) {
        params.set(String(filter.field), String(filter.value));
      }
    });

    const url = `${API_BASE}/${resource}${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throwIfError(response.status, errorBody);
    }

    const json = (await response.json()) as ListResponse<TData>;
    const data = Array.isArray(json) ? json : json.items;
    const total = Array.isArray(json) ? json.length : json.total;

    return {
      data,
      total,
    };
  },

  getOne: async <TData extends BaseRecord = BaseRecord>({
    resource,
    id,
  }: GetOneParams): Promise<GetOneResponse<TData>> => {
    const url = `${API_BASE}/${resource}/${id}`;
    const { status, body } = await fetchJson(url, { cache: "no-store" });
    throwIfError(status, body);
    return {
      data: body as TData,
    };
  },

  create: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >({
    resource,
    variables,
  }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    const url = `${API_BASE}/${resource}`;
    const { status, body } = await fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variables),
    });
    throwIfError(status, body);
    return { data: extractData<TData>(body) };
  },

  update: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>): Promise<CreateResponse<TData>> => {
    const url = `${API_BASE}/${resource}/${id}`;
    const { status, body } = await fetchJson(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variables),
    });
    throwIfError(status, body);
    return { data: extractData<TData>(body) };
  },

  deleteOne: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >({
    resource,
    id,
  }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    const url = `${API_BASE}/${resource}/${id}`;
    const { status, body } = await fetchJson(url, {
      method: "DELETE",
    });
    throwIfError(status, body);
    return { data: extractData<TData>(body) };
  },

  custom: async <
    TData extends BaseRecord = BaseRecord,
    TQuery = unknown,
    TPayload = unknown,
  >({
    url,
    method,
    payload,
    query,
    headers,
  }: CustomParams<TQuery, TPayload>): Promise<CustomResponse<TData>> => {
    const queryString = query
      ? `?${new URLSearchParams(query as Record<string, string>).toString()}`
      : "";
    const fullUrl = url.startsWith("http") ? url : `${url}${queryString}`;

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      cache: "no-store",
    };

    if (payload && method.toLowerCase() !== "get") {
      fetchOptions.body = JSON.stringify(payload);
    }

    const { status, body } = await fetchJson(fullUrl, fetchOptions);
    throwIfError(status, body);
    return { data: extractData<TData>(body) };
  },
};
