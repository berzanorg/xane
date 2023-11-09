
import type { Token, o1js } from "xane-contracts";

/** The type that represents the state of the worker. */
type WorkerState =
    | {
        status: 'unloaded'
    }
    | {
        status: 'loaded'
        TokenContract: typeof Token
    }
    | {
        status: 'compiled'
        TokenContract: typeof Token
        TokenContractVerificationKey: {
            data: string;
            hash: o1js.Field;
        }
    }

/** The type that represents the methods of the worker. */
export type WorkerMethods = {
    ready: () => Promise<null>
    getBalance: (args: {
        address: string
        tokenId?: string
    }) => Promise<undefined | bigint>
    loadContract: () => Promise<undefined | null>
    compileContract: () => Promise<undefined | null>
    deployContract: (args: {
        signerPublicKey: string
        name: string
        ticker: string
        supply: number
    }) => Promise<undefined | {
        transaction: string
        tokenId: string
    }>
}

/** The type that represents the requests that can be made to the worker. */
export type WorkerRequest = {
    [K in keyof WorkerMethods]: WorkerMethodParameters<K> extends [] ? {
        kind: K
    } : WorkerMethodParameters<K> extends [infer A] ? {
        kind: K
        args: A
    } : never
}[keyof WorkerMethods]

/** The type that represents the responses that can be made by the worker. */
export type WorkerResponse = {
    [K in keyof WorkerMethods]: {
        kind: K
        args: WorkerMethodReturnType<K>
    }
}[keyof WorkerMethods]

/** The type that represents the function that adds listener to given kind of worker responses. */
export type WorkerAddListener<T extends keyof WorkerMethods = keyof WorkerMethods> = (kind: T, args: WorkerResponseListener<T>) => void

/** The type that represents a listener to a worker response. Contains both `ok` and `err` case. */
export type WorkerResponseListener<T extends keyof WorkerMethods> = {
    ok: WorkerMethodReturnType<T> extends infer K ? K extends undefined ? never : K extends null ? () => Promise<void> : (args: K) => Promise<void> : never
    err: () => void
}

type WorkerMethodReturnType<T extends keyof WorkerMethods> = Awaited<ReturnType<WorkerMethods[T]>>
type WorkerMethodParameters<T extends keyof WorkerMethods> = Parameters<WorkerMethods[T]>


/** The type that represents the object that holds the handlers for each kind of worker responses. */
export type WorkerResponseHandlers = {
    [key in keyof WorkerMethods]: WorkerResponseListener<key>
}


/** The state of the worker. */
let workerState: WorkerState = {
    status: 'unloaded',
}

/** The methods of the worker. */
const workerMethods: WorkerMethods = {
    ready: async () => null,
    getBalance: async (args) => {
        try {
            const { o1js } = await import('xane-contracts')
            o1js.Mina.setActiveInstance(o1js.Mina.Network('https://api.minascan.io/node/berkeley/v1/graphql'))
            const publicKey = o1js.PublicKey.fromBase58(args.address)
            const tokenId = args.tokenId ? o1js.Field.from(args.tokenId) : undefined
            const balance = o1js.Mina.getBalance(publicKey, tokenId)

            return balance.toBigInt()
        } catch (error) {
            console.error('error while getting balance')
            console.error(error)
            return
        }
    },
    loadContract: async () => {
        if (workerState.status !== 'unloaded') return

        const { Token } = await import('xane-contracts')

        workerState = {
            status: 'loaded',
            TokenContract: Token,
        }

        return null
    },
    compileContract: async () => {
        try {
            if (workerState.status !== 'loaded') return

            const { verificationKey } = await workerState.TokenContract.compile()

            workerState = {
                status: 'compiled',
                TokenContract: workerState.TokenContract,
                TokenContractVerificationKey: verificationKey,
            }

            return null
        } catch (error) {
            console.error('Contract compilation inside the worker is failed.')
            console.error(error)
            return
        }
    },
    deployContract: async (args) => {
        try {
            if (workerState.status !== 'compiled') return
            const { utils, o1js: { AccountUpdate, Mina, PrivateKey, PublicKey, UInt64 } } = await import('xane-contracts')

            Mina.setActiveInstance(Mina.Network('https://api.minascan.io/node/berkeley/v1/graphql'))
            const zkappKey = PrivateKey.random()
            const contractInstance = new workerState.TokenContract(zkappKey.toPublicKey())

            const verificationKey = workerState.TokenContractVerificationKey

            const signer = PublicKey.fromBase58(args.signerPublicKey)
            const name = utils.stringToField(args.name)
            const ticker = utils.stringToField(args.ticker)
            const supply = UInt64.from(args.supply)
            const tx = await Mina.transaction(signer, () => {
                AccountUpdate.fundNewAccount(signer)
                AccountUpdate.fundNewAccount(signer)
                contractInstance.deploy({
                    verificationKey,
                    zkappKey,
                    name,
                    ticker,
                    supply,
                })
            })

            await tx.prove()

            return {
                tokenId: contractInstance.token.id.toString(),
                transaction: tx.sign([zkappKey]).toJSON()
            }
        } catch (error) {
            console.error('Contract deployment inside the worker is failed.')
            console.error(error)
            return
        }
    }
}

addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
    switch (event.data.kind) {
        case 'loadContract':
            postMessage({
                kind: 'loadContract',
                args: await workerMethods.loadContract(),
            } satisfies WorkerResponse)
            break
        case 'compileContract':
            postMessage({
                kind: 'compileContract',
                args: await workerMethods.compileContract(),
            } satisfies WorkerResponse)
            break
        case 'deployContract':
            postMessage({
                kind: 'deployContract',
                args: await workerMethods.deployContract(event.data.args)
            } satisfies WorkerResponse)
            break
        default:
            console.error('Worker received mistaken message', JSON.stringify(event.data))
    }
})

console.log('The worker is successfully started.')

postMessage({
    kind: 'ready',
    args: await workerMethods.ready()
} satisfies WorkerResponse)