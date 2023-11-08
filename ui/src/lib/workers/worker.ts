import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64 } from "o1js";
import type { Token } from "xane-contracts";

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
            hash: Field;
        }
    }

/** The type that represents the methods of the worker. */
type WorkerMethods = {
    loadContract: () => Promise<undefined | null>
    compileContract: () => Promise<undefined | null>
    deployContract: (args: {
        signerPublicKey: PublicKey
        name: Field
        ticker: Field
        supply: UInt64
    }) => Promise<undefined | string>
}

/** The type that represents the requests that can be made to the worker. */
export type WorkerRequest = {
    [K in keyof WorkerMethods]: Parameters<WorkerMethods[K]> extends [] ? {
        kind: K
    } : Parameters<WorkerMethods[K]> extends [infer A] ? {
        kind: K
        args: A
    } : never
}[keyof WorkerMethods]

/** The type that represents the responses that can be made by the worker. */
export type WorkerResponse = {
    [K in keyof WorkerMethods]: {
        kind: K
        args: Awaited<ReturnType<WorkerMethods[K]>>
    }
}[keyof WorkerMethods]

/** The type that represents the function that adds listener to given kind of worker responses. */
export type WorkerAddListener<T extends keyof WorkerMethods = keyof WorkerMethods> = (kind: T, args: WorkerResponseListener<T>) => void

/** The type that represents a listener to a worker response. Contains both `ok` and `err` case. */
export type WorkerResponseListener<T extends keyof WorkerMethods> = {
    ok: Awaited<ReturnType<WorkerMethods[T]>> extends infer K ? K extends undefined ? never : K extends null ? () => Promise<void> : (args: K) => Promise<void> : never
    err: () => void
}

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
    loadContract: async () => {
        if (workerState.status !== 'unloaded') return

        console.log('loading from worker')

        const { Token } = await import('xane-contracts')

        console.log('loaded from worker')

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
            const zkappKey = PrivateKey.random()
            const contractInstance = new workerState.TokenContract(zkappKey.toPublicKey())

            const verificationKey = workerState.TokenContractVerificationKey

            const tx = await Mina.transaction(args.signerPublicKey, () => {
                AccountUpdate.fundNewAccount(args.signerPublicKey)
                AccountUpdate.fundNewAccount(args.signerPublicKey)
                contractInstance.deploy({
                    verificationKey,
                    zkappKey,
                    name: args.name,
                    ticker: args.ticker,
                    supply: args.supply,
                })
            })

            await tx.prove()

            return tx.sign([zkappKey]).toJSON()
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
            postMessage(await workerMethods.loadContract())
            break
        case 'compileContract':
            postMessage(await workerMethods.compileContract())
            break
        case 'deployContract':
            postMessage(await workerMethods.deployContract(event.data.args))
            break
        default:
            console.error('Worker received mistaken message', JSON.stringify(event.data))
    }
})

console.log('The worker is successfully started.')