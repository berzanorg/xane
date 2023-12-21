import { Field, MerkleTree, Poseidon, PublicKey } from 'o1js'
import { Order } from './Order'
import { ORDERS_HEIGHT } from 'xane'

interface AddOrder {
    side: 'BUY' | 'SELL'
    amount: number
    price: number
    maker: string
}

interface FindEmptyOrderSlot {
    side: 'BUY' | 'SELL'
}

interface RemoveOrder {
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

    _AddOrder(params: AddOrder) {
        const order = new Order(params.maker, params.amount, params.price)

        switch (params.side) {
            case 'BUY':
                const emptyBuyOrderIndex = this._FindEmptyOrderSlot({ side: 'BUY' })
                this.buyOrders[emptyBuyOrderIndex] = order
                this.buyOrdersTree.setLeaf(BigInt(emptyBuyOrderIndex), order._GetHash())
                break
            case 'SELL':
                const emptySellOrderIndex = this._FindEmptyOrderSlot({ side: 'BUY' })
                this.sellOrders[emptySellOrderIndex] = order
                this.sellOrdersTree.setLeaf(BigInt(emptySellOrderIndex), order._GetHash())
                break
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
}
