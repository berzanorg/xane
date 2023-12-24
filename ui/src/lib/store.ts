import { createStore } from 'solid-js/store'

interface Store {
    address?: string
}

export const [state, setState] = createStore<Store>({})
