import { expose } from 'comlink'
import type { Field as FieldType } from 'o1js'
const { Mina, PublicKey, Field, fetchAccount, PrivateKey, AccountUpdate, Encoding, UInt64 } = await import('o1js')
const { Exchange, Token, Vault } = await import('xane')

Mina.setActiveInstance(Mina.Network('https://api.minascan.io/node/berkeley/v1/graphql'))

const SAMPLE_EXCHANGE_PUBKEY = PublicKey.empty()
const SAMPLE_SERVER_URL = 'http://localhost:3000'

type VerificationKey = {
    data: string;
    hash: FieldType;
}

const verificationKeys: {
    token: VerificationKey | undefined
    vault: VerificationKey | undefined
    exchange: VerificationKey | undefined
} = {
    token: undefined,
    vault: undefined,
    exchange: undefined,
};


(async () => {
    const token = await Token.compile()
    const vault = await Vault.compile()
    const exchange = await Exchange.compile()
    verificationKeys.token = token.verificationKey
    verificationKeys.vault = vault.verificationKey
    verificationKeys.exchange = exchange.verificationKey
})()



const worker = {
    async getBalance(props: { address: string, tokenId?: string }): Promise<bigint | undefined> {
        try {
            alert(23423)
            const publicKey = PublicKey.fromBase58(props.address)
            const tokenId = props.tokenId ? Field.from(props.tokenId) : undefined
            await fetchAccount({ publicKey: props.address })
            const balance = Mina.getBalance(publicKey, tokenId)
            return balance.toBigInt()
        } catch (error) {
            console.log(error)
            return
        }
    },
    async createToken(props: { symbol: string, maxSupply: bigint, sender: string }) {
        try {
            const verificationKey = verificationKeys.token
            if (!verificationKey) return

            const symbol = Encoding.stringToFields(props.symbol)[0]!
            const maxSupply = UInt64.from(props.maxSupply)
            const decimals = UInt64.from(4)
            const sender = PublicKey.fromBase58(props.sender)

            const tokenPrivkey = PrivateKey.random()

            const token = new Token(tokenPrivkey.toPublicKey())

            const txDeploy = await Mina.transaction(sender, () => {
                AccountUpdate.fundNewAccount(sender)
                token.deploy({ verificationKey })
            })

            await txDeploy.prove()

            txDeploy.sign([tokenPrivkey])

            const txInitialize = await Mina.transaction(sender, () => {
                token.initialize(symbol, decimals, maxSupply)
            })

            await txInitialize.prove()

            txInitialize.sign([tokenPrivkey])

            return {
                txDeploy: txDeploy.toJSON(),
                txInitialize: txInitialize.toJSON(),
            }
        } catch (error) {
            console.log(error)
            return
        }
    },
    async mintToken(props: { tokenPubkey: string, amount: bigint, sender: string }) {
        try {
            const verificationKey = verificationKeys.token
            if (!verificationKey) return

            const tokenPubkey = PublicKey.fromBase58(props.tokenPubkey)
            const amount = UInt64.from(props.amount)
            const sender = PublicKey.fromBase58(props.sender)

            const token = new Token(tokenPubkey)

            const txMint = await Mina.transaction(sender, () => {
                AccountUpdate.fundNewAccount(sender)
                token.mint(sender, amount)
            })

            await txMint.prove()

            // no need to sign the tx as Auro wallet is going to sign it

            return {
                txMint: txMint.toJSON(),
            }
        } catch (error) {
            console.log(error)
            return
        }
    },
    async transferToken(props: { tokenPubkey: string, receiver: string, amount: bigint, sender: string }) {
        try {
            const verificationKey = verificationKeys.token
            if (!verificationKey) return

            const tokenPubkey = PublicKey.fromBase58(props.tokenPubkey)
            const receiver = PublicKey.fromBase58(props.receiver)
            const amount = UInt64.from(props.amount)
            const sender = PublicKey.fromBase58(props.sender)

            const token = new Token(tokenPubkey)

            const txTransfer = await Mina.transaction(sender, () => {
                AccountUpdate.fundNewAccount(sender)
                token.transfer(sender, receiver, amount)
            })

            await txTransfer.prove()

            // no need to sign the tx as Auro wallet is going to sign it

            return {
                txTransfer: txTransfer.toJSON(),
            }
        } catch (error) {
            console.log(error)
            return
        }
    },
    async createPair(props: { baseCurrency: string, quoteCurrency: string, sender: string }) {
        try {
            const verificationKey = verificationKeys.token
            if (!verificationKey) return

            const baseCurrency = PublicKey.fromBase58(props.baseCurrency)
            const quoteCurrency = PublicKey.fromBase58(props.quoteCurrency)
            const sender = PublicKey.fromBase58(props.sender)
            const res = await fetch(SAMPLE_SERVER_URL + '/create-pair')
            if (!res.ok) {
                console.error(res)
                return
            }

            const {
                pairWitness,
                authoritySignature,
            } = await res.json()

            // todo: parse these
            const pairWitnessParsed = pairWitness
            const authoritySignatureParsed = authoritySignature

            const exchange = new Exchange(SAMPLE_EXCHANGE_PUBKEY)

            const txCreatePair = await Mina.transaction(sender, () => {
                exchange.createPair(baseCurrency, quoteCurrency, pairWitnessParsed, authoritySignatureParsed)
            })

            await txCreatePair.prove()

            // no need to sign the tx as Auro wallet is going to sign it

            return {
                txCreatePair: txCreatePair.toJSON(),
            }
        } catch (error) {
            console.log(error)
            return
        }
    },
    async placeOrder(props: { baseCurrency: string, quoteCurrency: string, amount: bigint, price: bigint, sender: string, side: 'BUY' | 'SELL' }) {
        try {
            const verificationKey = verificationKeys.token
            if (!verificationKey) return

            const side = props.side
            const baseCurrency = PublicKey.fromBase58(props.baseCurrency)
            const quoteCurrency = PublicKey.fromBase58(props.quoteCurrency)
            const amount = UInt64.from(props.amount)
            const price = UInt64.from(props.price)
            const sender = PublicKey.fromBase58(props.sender)
            const res = await fetch(SAMPLE_SERVER_URL + '/place-order')
            if (!res.ok) {
                console.error(res)
                return
            }

            const {
                ordersRoot,
                orderWitness,
                pairWitness,
                authoritySignature,
            } = await res.json()


            const ordersRootParsed = Field.fromJSON(JSON.stringify(ordersRoot))
            // todo: parse these
            const orderWitnessParsed = orderWitness
            const pairWitnessParsed = pairWitness
            const authoritySignatureParsed = authoritySignature

            const exchange = new Exchange(SAMPLE_EXCHANGE_PUBKEY)

            const txPlaceOrder = side === 'BUY' ?
                await Mina.transaction(sender, () => {
                    exchange.placeBuyOrder(
                        amount,
                        price,
                        baseCurrency,
                        quoteCurrency,
                        orderWitnessParsed,
                        ordersRootParsed,
                        pairWitnessParsed,
                        authoritySignatureParsed,
                    )
                }) : await Mina.transaction(sender, () => {
                    exchange.placeSellOrder(
                        amount,
                        price,
                        baseCurrency,
                        quoteCurrency,
                        ordersRootParsed,
                        orderWitnessParsed,
                        pairWitnessParsed,
                        authoritySignatureParsed,
                    )
                })

            await txPlaceOrder.prove()

            // no need to sign the tx as Auro wallet is going to sign it

            return {
                txPlaceOrder: txPlaceOrder.toJSON(),
            }
        } catch (error) {
            console.log(error)
            return
        }
    },
    async cancelOrder(props: { baseCurrency: string, quoteCurrency: string, amount: bigint, price: bigint, sender: string, side: 'BUY' | 'SELL' }) {
        try {
            const verificationKey = verificationKeys.token
            if (!verificationKey) return

            const side = props.side
            const baseCurrency = PublicKey.fromBase58(props.baseCurrency)
            const quoteCurrency = PublicKey.fromBase58(props.quoteCurrency)
            const amount = UInt64.from(props.amount)
            const price = UInt64.from(props.price)
            const sender = PublicKey.fromBase58(props.sender)
            const res = await fetch(SAMPLE_SERVER_URL + '/cancel-order')
            if (!res.ok) {
                console.error(res)
                return
            }

            const {
                ordersRoot,
                orderWitness,
                pairWitness,
                authoritySignature,
            } = await res.json()


            const ordersRootParsed = Field.fromJSON(JSON.stringify(ordersRoot))
            // todo: parse these
            const orderWitnessParsed = orderWitness
            const pairWitnessParsed = pairWitness
            const authoritySignatureParsed = authoritySignature

            const exchange = new Exchange(SAMPLE_EXCHANGE_PUBKEY)

            const txCancelOrder = side === 'BUY' ?
                await Mina.transaction(sender, () => {
                    exchange.cancelBuyOrder(
                        amount,
                        price,
                        baseCurrency,
                        quoteCurrency,
                        orderWitnessParsed,
                        ordersRootParsed,
                        pairWitnessParsed,
                        authoritySignatureParsed,
                    )
                }) : await Mina.transaction(sender, () => {
                    exchange.cancelSellOrder(
                        amount,
                        price,
                        baseCurrency,
                        quoteCurrency,
                        ordersRootParsed,
                        orderWitnessParsed,
                        pairWitnessParsed,
                        authoritySignatureParsed,
                    )
                })

            await txCancelOrder.prove()

            // no need to sign the tx as Auro wallet is going to sign it

            return {
                txCancelOrder: txCancelOrder.toJSON(),
            }
        } catch (error) {
            console.log(error)
            return
        }
    },
    async executeOrder(props: { baseCurrency: string, quoteCurrency: string, maker: string, amount: bigint, price: bigint, sender: string, side: 'BUY' | 'SELL' }) {
        try {
            const verificationKey = verificationKeys.token
            if (!verificationKey) return

            const side = props.side
            const baseCurrency = PublicKey.fromBase58(props.baseCurrency)
            const quoteCurrency = PublicKey.fromBase58(props.quoteCurrency)
            const maker = PublicKey.fromBase58(props.maker)
            const amount = UInt64.from(props.amount)
            const price = UInt64.from(props.price)
            const sender = PublicKey.fromBase58(props.sender)
            const res = await fetch(SAMPLE_SERVER_URL + '/execute-order')
            if (!res.ok) {
                console.error(res)
                return
            }

            const {
                ordersRoot,
                orderWitness,
                pairWitness,
                authoritySignature,
            } = await res.json()


            const ordersRootParsed = Field.fromJSON(JSON.stringify(ordersRoot))
            // todo: parse these
            const orderWitnessParsed = orderWitness
            const pairWitnessParsed = pairWitness
            const authoritySignatureParsed = authoritySignature

            const exchange = new Exchange(SAMPLE_EXCHANGE_PUBKEY)

            const txExecuteOrder = side === 'BUY' ?
                await Mina.transaction(sender, () => {
                    exchange.executeBuyOrder(
                        maker,
                        amount,
                        price,
                        baseCurrency,
                        quoteCurrency,
                        orderWitnessParsed,
                        ordersRootParsed,
                        pairWitnessParsed,
                        authoritySignatureParsed,
                    )
                }) : await Mina.transaction(sender, () => {
                    exchange.executeSellOrder(
                        maker,
                        amount,
                        price,
                        baseCurrency,
                        quoteCurrency,
                        ordersRootParsed,
                        orderWitnessParsed,
                        pairWitnessParsed,
                        authoritySignatureParsed,
                    )
                })

            await txExecuteOrder.prove()

            // no need to sign the tx as Auro wallet is going to sign it

            return {
                txExecuteOrder: txExecuteOrder.toJSON(),
            }
        } catch (error) {
            console.log(error)
            return
        }
    },
}

expose(worker)

export type XaneWorker = typeof worker
