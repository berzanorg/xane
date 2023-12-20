import { Field, MerkleTree, Poseidon, PublicKey } from 'o1js'
import { Order } from './Order'
import { ORDERS_HEIGHT } from 'xane'

interface AddOrder {
    side: 'BUY' | 'SELL'
    amount: number
    price: number
    maker: string
}

export class Pair {
    baseCurrency: string
    quoteCurrency: string
    buyOrders: Array<Order>
    sellOrders: Array<Order>
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

    _AddOrder(params: AddOrder) {
        const order = new Order(params.maker, params.amount, params.price)

        switch (params.side) {
            case 'BUY':
                this.buyOrders.push(order)
                this.buyOrdersTree.setLeaf(BigInt(this.buyOrders.length), order._GetHash())
                break
            case 'SELL':
                this.sellOrders.push(order)
                this.sellOrdersTree.setLeaf(BigInt(this.sellOrders.length), order._GetHash())
                break
        }
    }
}
