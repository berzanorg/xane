import { expose } from 'comlink'
import { Token, Exchange } from 'xane'
import { Encoding } from 'o1js'

// const SAMPLE_PUBLIC_KEY = PrivateKey.random().toPublicKey()

// const exchangeContract = new Exchange(SAMPLE_PUBLIC_KEY)

console.log(Token, Exchange, Encoding)

const worker = {
    async createToken() {
        // todo
    },
    async createPair() {
        // todo
    },
    async placeOrder() {
        // todo
    },
    async cancelOrder() {
        // todo
    },
    async executeOrder() {
        // todo
    },
}

expose(worker)

export type XaneWorker = typeof worker
