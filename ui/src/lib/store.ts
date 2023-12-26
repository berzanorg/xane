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
    }[]
    orders: {
        side: 'BUY' | 'SELL'
        baseCurrencySymbol: string
        baseCurrencyId: bigint
        baseCurrencyDecimals: bigint
        quoteCurrencySymbol: string
        quoteCurrencyId: bigint
        quoteCurrencyDecimals: bigint
        maker: string
        price: bigint
        amount: bigint
    }[]
}

export const store = createMutable<Store>({
    address: undefined,
    minaBalance: 450000n,
    tokenBalances: [
        {
            id: 10n,
            amount: 21_000_000_000000n,
            decimals: 6n,
            symbol: 'BTC',
            owner: 'B62qo3EUgRfVbJf9Pbs8VMbqrNeoS8ACM8NkZ7WNf5n6diKs2PqXqjt',
        },
        {
            id: 54n,
            amount: 100_000_000_000000n,
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
    orders: [
        {
            side: 'SELL',
            baseCurrencySymbol: 'BTC',
            baseCurrencyId: 10n,
            baseCurrencyDecimals: 6n,
            quoteCurrencySymbol: 'USDC',
            quoteCurrencyId: 63n,
            quoteCurrencyDecimals: 2n,
            maker: 'B62qo3EUgRfVbJf9Pbs8VMbqrNeoS8ACM8NkZ7WNf5n6diKs2PqXqjt',
            price: 69_000_00n,
            amount: 4_000000n,
        },
        {
            side: 'SELL',
            baseCurrencySymbol: 'ETH',
            baseCurrencyId: 54n,
            baseCurrencyDecimals: 6n,
            quoteCurrencySymbol: 'USDC',
            quoteCurrencyId: 63n,
            quoteCurrencyDecimals: 2n,
            maker: 'B62qo3EUgRfVbJf9Pbs8VMbqrNeoS8ACM8NkZ7WNf5n6diKs2PqXqjt',
            price: 2_000_00n,
            amount: 12_000000n,
        },
        {
            side: 'BUY',
            baseCurrencySymbol: 'BTC',
            baseCurrencyId: 10n,
            baseCurrencyDecimals: 6n,
            quoteCurrencySymbol: 'USDC',
            quoteCurrencyId: 63n,
            quoteCurrencyDecimals: 2n,
            maker: 'B62qo3EUgRfVbJf9Pbs8VMbqrNeoS8ACM8NkZ7WNf5n6diKs2PqXqjt',
            price: 63_000_00n,
            amount: 3_000000n,
        },
        {
            side: 'BUY',
            baseCurrencySymbol: 'ETH',
            baseCurrencyId: 54n,
            baseCurrencyDecimals: 6n,
            quoteCurrencySymbol: 'USDC',
            quoteCurrencyId: 63n,
            quoteCurrencyDecimals: 2n,
            maker: 'B62qo3EUgRfVbJf9Pbs8VMbqrNeoS8ACM8NkZ7WNf5n6diKs2PqXqjt',
            price: 1_500_00n,
            amount: 8_000000n,
        },
    ]
})