import { MerkleTree } from 'o1js'
import { Pair } from './Pair.js'
import { DatabaseError } from './DatabaseError.js'
import { OrderWitness, PAIRS_HEIGHT, PairWitness } from '../../Exchange.js'

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
    amount: bigint
    price: bigint
    maker: string
}

interface RemoveOrder {
    baseCurrency: string
    quoteCurrency: string
    side: 'BUY' | 'SELL'
    orderIndex: number
}

interface GetPairWitness {
    baseCurrency: string
    quoteCurrency: string
}

interface GetOrderWitness {
    baseCurrency: string
    quoteCurrency: string
    side: 'BUY' | 'SELL'
    orderIndex: number
}

interface GetOrdersRoot {
    baseCurrency: string
    quoteCurrency: string
    side: 'BUY' | 'SELL'
}

interface GetOrder {
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

        const orderIndex = pair._AddOrder(params)

        this.#tree.setLeaf(BigInt(pairIndex), pair._GetHash())

        return orderIndex
    }

    removeOrder(params: RemoveOrder) {
        const pairIndex = this.findPairIndex(params)

        if (pairIndex === undefined) throw DatabaseError.PairDoesntExist

        const pair = this.#data[pairIndex]

        pair._RemoveOrder(params)

        this.#tree.setLeaf(BigInt(pairIndex), pair._GetHash())
    }

    getOrder(params: GetOrder) {
        const pairIndex = this.findPairIndex(params)

        if (pairIndex === undefined) throw DatabaseError.PairDoesntExist

        const pair = this.#data[pairIndex]

        return pair._GetOrder(params)
    }

    getPairWitness(params: GetPairWitness) {
        const pairIndex = this.findPairIndex(params)

        if (pairIndex === undefined) throw DatabaseError.PairDoesntExist

        const witness = this.#tree.getWitness(BigInt(pairIndex))

        return new PairWitness(witness)
    }

    getOrderWitness(params: GetOrderWitness) {
        const pairIndex = this.findPairIndex(params)

        if (pairIndex === undefined) throw DatabaseError.PairDoesntExist

        const pair = this.#data[pairIndex]

        return pair._GetOrderWitness(params)
    }

    getOrdersRoot(params: GetOrdersRoot) {
        const pairIndex = this.findPairIndex(params)

        if (pairIndex === undefined) throw DatabaseError.PairDoesntExist

        const pair = this.#data[pairIndex]

        return pair._GetOrdersRoot(params)
    }

    data() {
        return this.#data
    }
}
