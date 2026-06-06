import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  id: string
  name: string
  category: string
  price: number
  cost: number
  quantity: number
}

interface StoreState {
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartTotalCost: () => number
  getCartProfit: () => number
  getCartCount: () => number
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      cart: [],
      
      addToCart: (item) => {
        set((state) => {
          const existingItem = state.cart.find((i) => i.id === item.id)
          if (existingItem) {
            return {
              cart: state.cart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            }
          }
          return { cart: [...state.cart, item] }
        })
      },
      
      removeFromCart: (id) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id),
        }))
      },
      
      updateQuantity: (id, quantity) => {
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }))
      },
      
      clearCart: () => {
        set({ cart: [] })
      },
      
      getCartTotal: () => {
        return get().cart.reduce((total, item) => total + item.price * item.quantity, 0)
      },
      
      getCartTotalCost: () => {
        return get().cart.reduce((total, item) => total + item.cost * item.quantity, 0)
      },
      
      getCartProfit: () => {
        return get().cart.reduce((total, item) => {
          return total + (item.price - item.cost) * item.quantity
        }, 0)
      },
      
      getCartCount: () => {
        return get().cart.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: 'kenaya-cart-storage',
    }
  )
)
