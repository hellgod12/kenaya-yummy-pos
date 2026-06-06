# Kenaya Yummy POS & Inventory Management

A professional Point of Sale (POS) and Inventory Management web application for Kenaya Yummy Bakery. Built with Next.js, TypeScript, TailwindCSS, and Supabase.

## Features

- **Dashboard**: Real-time statistics showing daily revenue, profit, sales count, low stock alerts, and best-selling products
- **POS/Cashier**: Fast transaction processing with product grid, category filtering, and shopping cart
- **Inventory Management**:
  - Products management (CRUD operations)
  - Stock In tracking
  - Daily Production tracking with automatic calculations
  - Waste/Damaged items recording
  - Stock movement history
- **Reports**: Daily and monthly reports with PDF and Excel export
- **Authentication**: Admin and Cashier roles
- **PWA Support**: Installable on Android and iOS devices

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript
- **Styling**: TailwindCSS, shadcn/ui components
- **Database**: Supabase
- **State Management**: Zustand
- **Charts**: Recharts
- **PDF Export**: jsPDF, jspdf-autotable
- **Excel Export**: xlsx
- **PWA**: next-pwa

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project

### Installation

1. Clone the repository and navigate to the project directory:
```bash
cd kenaya-yummy-pos
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your Supabase credentials in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Set up the database:
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Run the SQL commands from `supabase-schema.sql` (business logic tables)
   - Run the SQL commands from `supabase-auth-migration.sql` (authentication setup)
   - Run the SQL commands from `supabase-rls-policies.sql` (security policies)

6. Create demo users in Supabase Auth:
   - Go to your Supabase project dashboard
   - Navigate to Authentication → Users
   - Click "Add user" and create the following users:
   
   **Admin User:**
   - Email: admin@kenayayummy.com
   - Password: demo123
   - User Metadata (JSON):
     ```json
     {
       "name": "Admin Kenaya Yummy",
       "role": "admin"
     }
     ```
   
   **Kasir User:**
   - Email: kasir@kenayayummy.com
   - Password: demo123
   - User Metadata (JSON):
     ```json
     {
       "name": "Kasir Kenaya Yummy",
       "role": "kasir"
     }
     ```

   The `handle_new_user()` trigger will automatically create the profile record with the role from the metadata.

7. Run the development server:
```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000) in your browser

### Demo Credentials

- **Admin**: admin@kenayayummy.com / demo123
- **Kasir**: kasir@kenayayummy.com / demo123

## Project Structure

```
kenaya-yummy-pos/
├── src/
│   ├── app/
│   │   ├── dashboard/          # Dashboard page
│   │   ├── pos/                # POS/Cashier page
│   │   ├── inventory/          # Inventory management pages
│   │   │   ├── products/       # Products CRUD
│   │   │   ├── stock-in/       # Stock in recording
│   │   │   ├── production/     # Daily production
│   │   │   ├── waste/          # Waste/damaged items
│   │   │   └── history/        # Stock movement history
│   │   ├── reports/            # Reports with export
│   │   ├── login/              # Login page
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home (redirects to login)
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── Sidebar.tsx         # Navigation sidebar
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication context
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   └── utils.ts            # Utility functions
│   ├── store/
│   │   └── useStore.ts         # Zustand store (cart)
│   └── types/
│       └── next-pwa.d.ts       # PWA type definitions
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── icon-192.png            # PWA icon (192x192)
│   └── icon-512.png            # PWA icon (512x512)
├── supabase-schema.sql         # Database schema (business logic)
├── supabase-auth-migration.sql # Authentication setup (profiles table)
├── next.config.ts              # Next.js config with PWA
├── tailwind.config.ts          # TailwindCSS config
└── tsconfig.json               # TypeScript config
```

## Brand Colors

Kenaya Yummy uses a warm, bakery-inspired color palette:
- **Primary**: Orange/Red gradient
- **Background**: Cream/White
- **Accent**: Light cream/orange tones
- **Design**: Clean, modern, with rounded corners and soft shadows

## Database Schema

The application uses Supabase Auth for authentication with a `profiles` table for role management:

**Authentication:**
- `auth.users` - Supabase Auth users (managed by Supabase)
- `profiles` - User profiles with roles (admin/kasir) linked to auth.users

**Business Logic:**
- `products` - Product catalog
- `sales` - Sales transactions
- `sale_items` - Individual sale items
- `stock_movements` - Stock movement history
- `suppliers` - Supplier information
- `daily_production` - Daily production tracking
- `waste_items` - Waste/damaged items recording

## Role-Based Access Control (RBAC)

The application implements role-based access control with two roles:

**Admin Role:**
- Full access to all features
- Dashboard, POS, Products, Inventory Management, Reports
- Can create, read, update, and delete all data

**Kasir (Cashier) Role:**
- Limited access to POS operations only
- Dashboard and POS pages
- Can only view products and create sales
- Cannot access inventory management, reports, or admin features

**Security Features:**
- Row Level Security (RLS) policies on all database tables
- Route protection at the application level
- Dynamic sidebar menu based on user role
- Automatic redirect to dashboard for unauthorized access attempts

## Building for Production

```bash
npm run build
npm start
```

## PWA Installation

The application supports PWA installation on mobile devices:
- Android: Add to Home Screen from browser menu
- iOS: Add to Home Screen from Share menu

## Future Enhancements

- QRIS payment integration
- Advanced analytics dashboard
- Multi-store support
- Barcode scanning
- Receipt printing
- Customer loyalty program

## License

This project is proprietary software for Kenaya Yummy.
