import { createMutable } from 'solid-js/store'

interface Store {
    address: string | undefined
    minaBalance: bigint | undefined
    tokenBalances: {
        symbol: string
        amount: bigint
        id: bigint
    }[] | undefined
}

export const store = createMutable<Store>({
    address: undefined,
    minaBalance: undefined,
    tokenBalances: undefined,
})

