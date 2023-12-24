import { Field, MerkleTree, Poseidon, PublicKey } from 'o1js'
import { Order } from './Order.js'
import { ORDERS_HEIGHT, OrderWitness } from '../../Exchange.js'
import { DatabaseError } from './DatabaseError.js'

interface AddOrder {
    side: 'BUY' | 'SELL'
    amount: bigint
    price: bigint
    maker: string
}

interface FindEmptyOrderSlot {
    side: 'BUY' | 'SELL'
}

interface RemoveOrder {
    side: 'BUY' | 'SELL'
    orderIndex: number
}

interface GetOrderWitness {
    side: 'BUY' | 'SELL'
    orderIndex: number
}

interface GetOrdersRoot {
    side: 'BUY' | 'SELL'
}

interface GetOrder {
    side: 'BUY' | 'SELL'
    orderIndex: number
}

export class Pair {
    baseCurrency: string
    quoteCurrency: string
    buyOrders: Array<Order | undefined>
    sellOrders: Array<Order | undefined>
    buyOrdersTree: MerkleTree
    sellOrdersTree: MerkleTree

    constructor(baseCurrency: string, quoteCurrency: string) {
        this.baseCurrency = baseCurrency
        this.quoteCurrency = quoteCurrency
        this.buyOrders = []
        this.sellOrders = []
        this.buyOrdersTree = new MerkleTree(ORDERS_HEIGHT)
        this.sellOrdersTree = new MerkleTree(ORDERS_HEIGHT)
    }

    _GetHash(): Field {
        const baseCurrency = PublicKey.fromBase58(this.baseCurrency)
        const quoteCurrency = PublicKey.fromBase58(this.quoteCurrency)
        const buyOrdersRoot = this.buyOrdersTree.getRoot()
        const sellOrdersRoot = this.sellOrdersTree.getRoot()

        const hash = Poseidon.hash([
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            buyOrdersRoot,
            sellOrdersRoot,
        ])

        return hash
    }

    _FindEmptyOrderSlot(params: FindEmptyOrderSlot): number {
        const orders = params.side === 'BUY' ? this.buyOrders : this.sellOrders

        for (let i = 0; i < orders.length; i++) {
            if (orders.at(i) === undefined) {
                return i
            }
        }

        return orders.length
    }

    _AddOrder(params: AddOrder): number {
        const order = new Order(params.maker, params.amount, params.price)

        switch (params.side) {
            case 'BUY':
                const emptyBuyOrderIndex = this._FindEmptyOrderSlot({ side: 'BUY' })
                this.buyOrders[emptyBuyOrderIndex] = order
                this.buyOrdersTree.setLeaf(BigInt(emptyBuyOrderIndex), order._GetHash())
                return emptyBuyOrderIndex
            case 'SELL':
                const emptySellOrderIndex = this._FindEmptyOrderSlot({ side: 'BUY' })
                this.sellOrders[emptySellOrderIndex] = order
                this.sellOrdersTree.setLeaf(BigInt(emptySellOrderIndex), order._GetHash())
                return emptySellOrderIndex
        }
    }

    _RemoveOrder(params: RemoveOrder) {
        switch (params.side) {
            case 'BUY':
                this.buyOrders[params.orderIndex] = undefined
                this.buyOrdersTree.setLeaf(BigInt(params.orderIndex), Field(0))
                break
            case 'SELL':
                this.sellOrders[params.orderIndex] = undefined
                this.sellOrdersTree.setLeaf(BigInt(params.orderIndex), Field(0))
                break
        }
    }

    _GetOrder(params: GetOrder) {
        switch (params.side) {
            case 'BUY':
                const buyOrder = this.buyOrders.at(params.orderIndex)
                if (buyOrder === undefined) throw DatabaseError.OrderDoesntExist
                return buyOrder
            case 'SELL':
                const sellOrder = this.sellOrders.at(params.orderIndex)
                if (sellOrder === undefined) throw DatabaseError.OrderDoesntExist
                return sellOrder
        }
    }

    _GetOrderWitness(params: GetOrderWitness) {
        switch (params.side) {
            case 'BUY':
                if (this.buyOrders.at(params.orderIndex) === undefined) throw DatabaseError.OrderDoesntExist
                const buyOrderWitness = this.buyOrdersTree.getWitness(BigInt(params.orderIndex))
                return new OrderWitness(buyOrderWitness)
            case 'SELL':
                if (this.sellOrders.at(params.orderIndex) === undefined) throw DatabaseError.OrderDoesntExist
                const sellOrderWitness = this.sellOrdersTree.getWitness(BigInt(params.orderIndex))
                return new OrderWitness(sellOrderWitness)
        }
    }

    _GetOrdersRoot(params: GetOrdersRoot) {
        switch (params.side) {
            case 'BUY':
                return this.buyOrdersTree.getRoot()
            case 'SELL':
                return this.sellOrdersTree.getRoot()
        }
    }
}
