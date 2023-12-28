import { expose } from 'comlink'
import { Mina, PublicKey, Field, fetchAccount, PrivateKey, AccountUpdate, Encoding, UInt64 } from 'o1js'
import { Exchange, Token, Vault } from 'xane'

Mina.setActiveInstance(Mina.Network('https://api.minascan.io/node/berkeley/v1/graphql'))

type VerificationKey = {
    data: string;
    hash: Field;
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

}

expose(worker)

export type XaneWorker = typeof worker
