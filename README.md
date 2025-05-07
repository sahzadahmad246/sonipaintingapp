# Soni Painting App

![Soni Painting Logo](https://sonipainting.com/assets/logo-bOB18bgY.png) 

Soni Painting App is a comprehensive web application designed for painting contractors to manage their business operations efficiently. It enables contractors to generate quotations, create invoices, and track projects (including payments and extra work), while providing clients with a portal to view their quotations, invoices, and learn about Soni Painting’s services.

## Features

### For Staff (Admins and Team)
- **Business Settings**:
  - Configure company details (name, GST number, terms, contact info, address).
  - Upload and manage business logos via Cloudinary.
- **Quotation Management**:
  - Create, edit, and view detailed quotations with client info, itemized services, and terms.
  - Accept or reject quotations with status tracking (Pending, Accepted, Rejected).
  - Generate professional PDF quotations for clients.
- **Project Management**:
  - Manage projects with client details, items, extra work, and site images.
  - Track payment history and calculate amounts due.
  - Upload site images to Cloudinary for project documentation.
- **Invoice Management**:
  - Generate and manage invoices with PDF export functionality.
- **Audit Logs**:
  - Log admin actions (e.g., updating settings, accepting quotations) for accountability.
- **Portfolio**:
  - Showcase completed projects with images to highlight Soni Painting’s work.

### For Clients
- **Quotation & Invoice Access**:
  - View personalized quotations and invoices via secure links.
  - Download PDFs for records.
- **Company Information**:
  - Learn about Soni Painting’s services, contact details, and portfolio.
- **Project Updates**:
  - Check project progress, including payments and site images (if shared by staff).

### Technical Highlights
- **Responsive UI**: Modern, animated interface built with Shadcn UI and Framer Motion.
- **Performance**: Redis caching for fast data retrieval (e.g., business settings).
- **Security**: Role-based authentication (admin vs. client) with NextAuth.
- **Image Optimization**: Cloudinary integration with Next.js `Image` component.
- **Type Safety**: TypeScript and Zod for robust API validation.
- **PDF Generation**: Professional PDFs for quotations and invoices.

## Tech Stack

- **Frontend**: Next.js 15.3.1, TypeScript, React, Shadcn UI, Framer Motion, Sonner (toasts)
- **Backend**: Next.js API Routes, MongoDB, Mongoose
- **Authentication**: NextAuth.js
- **Caching**: Upstash Redis
- **Image Storage**: Cloudinary
- **PDF Generation**: PDFKit
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Deployment**: Vercel

## Prerequisites

- Node.js 18.x or higher
- MongoDB (local or cloud, e.g., MongoDB Atlas)
- Cloudinary account
- Upstash Redis account
- Git

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/sonipaintingapp.git
   cd sonipaintingapp