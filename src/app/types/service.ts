// types/service.ts
export interface Service {
    id: string;
    title: string;
    description: string;
    icon: string;
    image: string;
    slug: string;
    details: {
      overview: string;
      benefits: string[];
      process: string[];
    };
  }