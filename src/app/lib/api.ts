import { ApiError, AuditLog, Project, Quotation, Invoice, Portfolio } from "@/app/types";

type ListQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: "newest" | "oldest";
  signal?: AbortSignal;
};

interface GeneralInfo {
  siteName: string;
  address: string;
  mobileNumber1: string;
  mobileNumber2?: string;
  logoUrl?: string;
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  const fullUrl = url.startsWith("/") ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
  console.log(`apiFetch: ${options.method || "GET"} ${fullUrl}`, options.body);

  const headers = options.body instanceof FormData
    ? { ...options.headers } // Omit Content-Type for FormData
    : {
        "Content-Type": "application/json",
        ...options.headers,
      };

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    const error = { ...data, status: response.status } as ApiError;
    console.error(`apiFetch error: ${response.status} ${response.statusText}`, error);
    throw error;
  }
  return data as T;
}

function buildListQuery({ page = 1, limit = 10, search, status, sort }: ListQueryOptions) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    params.set("search", search);
  }
  if (status) {
    params.set("status", status);
  }
  if (sort) {
    params.set("sort", sort);
  }

  return params.toString();
}

export async function getQuotations(options: ListQueryOptions = {}) {
  return apiFetch<{
    quotations: Quotation[];
    total: number;
    page: number;
    pages: number;
  }>(`/quotations?${buildListQuery(options)}`, {
    signal: options.signal,
  });
}

export async function getProjects(options: ListQueryOptions = {}) {
  return apiFetch<{
    projects: Project[];
    total: number;
    page: number;
    pages: number;
  }>(`/projects?${buildListQuery(options)}`, {
    signal: options.signal,
  });
}

export async function getInvoices(options: ListQueryOptions = {}) {
  return apiFetch<{
    invoices: Invoice[];
    total: number;
    page: number;
    pages: number;
  }>(`/invoices?${buildListQuery(options)}`, {
    signal: options.signal,
  });
}

export async function getPortfolio(page: number = 1, limit: number = 10) {
  return apiFetch<{
    portfolio: Portfolio[];
    total: number;
    page: number;
    pages: number;
  }>(`/portfolio?page=${page}&limit=${limit}`);
}

export async function getAuditLogs(page: number = 1, limit: number = 10) {
  return apiFetch<{
    logs: AuditLog[];
    total: number;
    pages: number;
  }>(`/audit-logs?page=${page}&limit=${limit}`, {
    method: "GET",
    credentials: "include", // Include cookies for authentication
  });
}

export async function getGeneralInfo() {
  return apiFetch<GeneralInfo>("/general-info");
}
