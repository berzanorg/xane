import { createMutable } from 'solid-js/store'

interface Store {
    address: string | undefined
    minaBalance: bigint
    tokenBalances: {
        symbol: string
        amount: bigint
        decimals: bigint
        id: bigint
        owner: string
    }[] | undefined
}

export const store = createMutable<Store>({
    address: undefined,
    minaBalance: 450000n,
    tokenBalances: [
        {
            id: 10n,
            amount: 21_000_000_000_000n,
            decimals: 6n,
            symbol: 'BTC',
            owner: 'B62qo3EUgRfVbJf9Pbs8VMbqrNeoS8ACM8NkZ7WNf5n6diKs2PqXqjt',
        },
        {
            id: 54n,
            amount: 100_000_000_000_000n,
            decimals: 6n,
            symbol: 'ETH',
            owner: 'B62qo3EUgRfVbJf9Pbs8VMbqrNeoS8ACM8NkZ7WNf5n6diKs2PqXqjn',
        },
        {
            id: 63n,
            amount: 45_000_000_00n,
            decimals: 2n,
            symbol: 'USDC',
            owner: 'B62qo3EUgRfVbJf9Pbs8VMbqrNeoS8ACM8NkZ7WNf5n6diKs2PqXqjt',
        },
    ],
})