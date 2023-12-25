import { expose } from 'comlink'
import { Mina, PublicKey, Field } from 'o1js'

Mina.setActiveInstance(Mina.Network('https://api.minascan.io/node/berkeley/v1/graphql'))

const worker = {
    async getBalance(props: { address: string, tokenId?: string }): Promise<bigint> {
        const publicKey = PublicKey.fromBase58(props.address)
        const tokenId = props.tokenId ? Field.from(props.tokenId) : undefined
        const balance = Mina.getBalance(publicKey, tokenId)
        return balance.toBigInt()
    },
    
}

expose(worker)

export type XaneWorker = typeof worker