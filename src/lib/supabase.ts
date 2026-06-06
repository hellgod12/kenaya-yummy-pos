import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string
          role: 'admin' | 'kasir'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name: string
          role: 'admin' | 'kasir'
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          name?: string
          role?: 'admin' | 'kasir'
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          category: 'bakery' | 'cemilan' | 'minuman'
          price: number
          cost: number
          stock: number
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: 'bakery' | 'cemilan' | 'minuman'
          price: number
          cost: number
          stock?: number
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: 'bakery' | 'cemilan' | 'minuman'
          price?: number
          cost?: number
          stock?: number
          image_url?: string | null
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          total_amount: number
          total_cost: number
          profit: number
          payment_method: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          total_amount: number
          total_cost: number
          profit: number
          payment_method: string
          created_at?: string
          created_by: string
        }
        Update: {
          total_amount?: number
          total_cost?: number
          profit?: number
          payment_method?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          quantity: number
          price: number
          cost: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          quantity: number
          price: number
          cost: number
          subtotal: number
          created_at?: string
        }
        Update: {
          quantity?: number
          price?: number
          cost?: number
          subtotal?: number
        }
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          type: 'in' | 'out' | 'production' | 'waste'
          quantity: number
          reference_id: string | null
          notes: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          product_id: string
          type: 'in' | 'out' | 'production' | 'waste'
          quantity: number
          reference_id?: string | null
          notes?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          quantity?: number
          notes?: string | null
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact: string | null
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          contact?: string | null
          address?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          contact?: string | null
          address?: string | null
        }
      }
      daily_production: {
        Row: {
          id: string
          product_id: string
          date: string
          quantity_produced: number
          quantity_sold: number
          quantity_waste: number
          quantity_remaining: number
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          product_id: string
          date: string
          quantity_produced: number
          quantity_sold?: number
          quantity_waste?: number
          quantity_remaining?: number
          created_at?: string
          created_by: string
        }
        Update: {
          quantity_produced?: number
          quantity_sold?: number
          quantity_waste?: number
          quantity_remaining?: number
        }
      }
      waste_items: {
        Row: {
          id: string
          product_id: string
          quantity: number
          reason: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity: number
          reason: string
          created_at?: string
          created_by: string
        }
        Update: {
          quantity?: number
          reason?: string
        }
      }
    }
  }
}
