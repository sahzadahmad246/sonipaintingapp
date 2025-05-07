import { ApiError, AuditLog, Project, Quotation, Invoice, Portfolio } from "@/app/types";

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

export async function getQuotations(page: number = 1, limit: number = 10) {
  return apiFetch<{
    quotations: Quotation[];
    total: number;
    page: number;
    pages: number;
  }>(`/quotations?page=${page}&limit=${limit}`);
}

export async function getProjects(page: number = 1, limit: number = 10) {
  return apiFetch<{
    projects: Project[];
    total: number;
    page: number;
    pages: number;
  }>(`/projects?page=${page}&limit=${limit}`);
}

export async function getInvoices(page: number = 1, limit: number = 10) {
  return apiFetch<{
    invoices: Invoice[];
    total: number;
    page: number;
    pages: number;
  }>(`/invoices?page=${page}&limit=${limit}`);
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