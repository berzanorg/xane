import { MerkleTree, PublicKey } from 'o1js'
import { ORDERS_HEIGHT, PAIRS_HEIGHT } from 'xane'
import { Pair } from './Pair'
import { Errors } from 'xane/build/src/Exchange'

export class Database {
    #data: Array<Pair>
    #tree: MerkleTree

    constructor() {
        this.#data = []
        this.#tree = new MerkleTree(PAIRS_HEIGHT)
    }

    findPair(baseCurrency: string, quoteCurrency: string): Pair | undefined {
        const index = this.#data.findIndex(
            (pair) => pair.baseCurrency === baseCurrency && pair.quoteCurrency === quoteCurrency
        )
        return this.#data.at(index)
    }

    addPair(baseCurrency: string, quoteCurrency: string) {
        const existingIndex = this.#data.findIndex(
            (pair) => pair.baseCurrency === baseCurrency && pair.quoteCurrency === quoteCurrency
        )

        const existingIndexReversed = this.#data.findIndex(
            (pair) => pair.baseCurrency === quoteCurrency && pair.quoteCurrency === baseCurrency
        )

        if (existingIndex) throw Errors.PairAlreadyExists
        if (existingIndexReversed) throw Errors.PairAlreadyExists

        const pairIndex = BigInt(this.#data.length)

        const pair = new Pair(baseCurrency, quoteCurrency)

        this.#data.push(pair)
        this.#tree.setLeaf(pairIndex, pair._GetHash())
    }
}
