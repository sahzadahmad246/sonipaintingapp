// types.ts
export interface Quotation {
  _id?: string;
  quotationNumber: string;
  clientName: string;
  clientAddress: string;
  clientNumber: string;
  clientMobile?: {
    countryCode: string;
    number: string;
  };
  date: string | Date;
  items: {
    description: string;
    area?: number | null;
    rate: number;
    total?: number | null;
    note?: string;
  }[];
  subtotal?: number;
  discount?: number;
  grandTotal?: number;
  terms: string[];
  note?: string;
  createdBy: Date;
  createdAt: Date;
  lastUpdated?: Date;
  isAccepted: "pending" | "accepted" | "rejected";
  updateHistory?: {
    updatedAt: string | Date;
    updatedBy: string;
    changes: string[];
  }[];
  siteImages?: {
    url: string;
    publicId: string;
    description?: string;
  }[];
  validity?: string;
}

export interface Project {
  projectId: string;
  quotationNumber: string;
  invoiceId: string;
  clientName: string;
  clientAddress: string;
  clientNumber: string;
  date: string | Date;
  items: {
    description: string;
    area?: number | null;
    rate: number;
    total?: number | null;
    note?: string;
  }[];
  extraWork: {
    description: string;
    total: number;
    note?: string;
  }[];
  subtotal?: number;
  discount: number;
  grandTotal?: number;
  amountDue?: number;
  paymentHistory: {
    amount: number;
    date: string | Date;
    method?: string;
    note?: string;
  }[];
  siteImages: { url: string; publicId: string; description?: string }[];
  terms: string[];
  note?: string;
  createdAt?: string | Date;
  lastUpdated?: string | Date;
  status: "ongoing" | "completed" | "cancelled";
  updateHistory?: {
    updatedAt: string | Date;
    updatedBy: string;
    changes: string[];
  }[];
}

export interface Invoice {
  invoiceId: string;
  projectId: string;
  quotationNumber: string;
  clientName: string;
  clientAddress: string;
  clientNumber: string;
  date: string | Date;
  items: {
    description: string;
    area?: number | null;
    rate: number;
    total?: number | null;
    note?: string;
  }[];
  extraWork: {
    description: string;
    total: number;
    note?: string;
  }[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  paymentHistory: {
    amount: number;
    date: string | Date;
    method?: string;
    note?: string;
  }[];
  amountDue: number;
  accessToken?: string;
  createdAt: string | Date;
  terms: string[];
  note?: string;
  lastUpdated?: string | Date;
  totalPayments?: number;
}

export interface Portfolio {
  _id?: string;
  publicId: string;
  imageUrl: string;
  title?: string;
  description?: string;
  uploadedAt: string;
}

export interface PortfolioInput {
  title?: string;
  description?: string;
  image?: File;
}

export interface GeneralInfo {
  _id?: string;
  logoUrl?: string;
  publicId?: string;
  siteName: string;
  gstNumber?: string;
  gstPercent?: number;
  termsAndConditions?: string[];
  mobileNumber1: string;
  mobileNumber2?: string;
  address: string;
  lastUpdated?: string;
}

export interface AuditLog {
  _id?: string;
  action: string;
  userId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface StaticData {
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  services: Array<{
    title: string;
    description: string;
  }>;
  about: {
    title: string;
    description: string;
  };
  contact: {
    title: string;
    tagline: string;
    call: {
      phone: string;
      hours: string;
    };
    whatsapp: {
      phone: string;
      hours: string;
    };
    address: {
      line1: string;
      line2: string;
    };
    logo: string;
  };
}
export interface ApiError {
  error: string;
  details?: { message: string }[];
  code?: string;
}
export interface Payment {
  amount: number;
  date: string | Date;
  method?: string;
  note?: string;
}
