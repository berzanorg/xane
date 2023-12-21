import { create } from 'zustand'

interface Store {
    address?: string
    setAddress: (address?: string) => void
}

export const useStore = create<Store>((set) => ({
    address: undefined,
    setAddress: (address?: string) => set((state) => ({ address })),
}))
