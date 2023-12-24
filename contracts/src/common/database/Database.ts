import { MerkleTree } from 'o1js'
import { Pair } from './Pair.js'
import { DatabaseError } from './DatabaseError.js'
import { PAIRS_HEIGHT } from '../../Exchange.js'

interface FindPairIndex {
    baseCurrency: string
    quoteCurrency: string
}

interface AddPair {
    baseCurrency: string
    quoteCurrency: string
}

interface AddOrder {
    baseCurrency: string
    quoteCurrency: string
    side: 'BUY' | 'SELL'
    amount: number
    price: number
    maker: string
}

interface RemoveOrder {
    baseCurrency: string
    quoteCurrency: string
    side: 'BUY' | 'SELL'
    orderIndex: number
}

export class Database {
    #data: Array<Pair>
    #tree: MerkleTree

    constructor() {
        this.#data = []
        this.#tree = new MerkleTree(PAIRS_HEIGHT)
    }

    findPairIndex(params: FindPairIndex): number | undefined {
        const index = this.#data.findIndex(
            (pair) => pair.baseCurrency === params.baseCurrency && pair.quoteCurrency === params.quoteCurrency
        )

        if (index === -1) return undefined

        return index
    }

    addPair(params: AddPair) {
        if (this.findPairIndex(params) !== undefined) throw DatabaseError.PairAlreadyExists

        const pairIndex = BigInt(this.#data.length)

        const pair = new Pair(params.baseCurrency, params.quoteCurrency)

        this.#data.push(pair)
        this.#tree.setLeaf(pairIndex, pair._GetHash())
    }

    addOrder(params: AddOrder) {
        const pairIndex = this.findPairIndex(params)

        if (pairIndex === undefined) throw DatabaseError.PairDoesntExist

        const pair = this.#data[pairIndex]

        if (!pair) throw DatabaseError.PairDoesntExist

        pair._AddOrder(params)

        this.#tree.setLeaf(BigInt(pairIndex), pair._GetHash())
    }

    removeOrder(params: RemoveOrder) {
        const pairIndex = this.findPairIndex(params)

        if (pairIndex === undefined) throw DatabaseError.PairDoesntExist

        const pair = this.#data[pairIndex]

        if (!pair) throw DatabaseError.PairDoesntExist

        pair._RemoveOrder(params)

        this.#tree.setLeaf(BigInt(pairIndex), pair._GetHash())
    }
}
