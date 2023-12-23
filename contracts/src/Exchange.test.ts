import {
    AccountUpdate,
    Field,
    Mina,
    PrivateKey,
    PublicKey,
    Encoding,
    UInt64,
    Signature,
    MerkleTree,
    Poseidon,
} from 'o1js'
import {
    AUTHORITY_PRIVATE_KEY,
    Errors,
    Exchange,
    ORDERS_HEIGHT,
    OrderObject,
    OrderWitness,
    PAIRS_HEIGHT,
    PairObject,
    PairWitness,
    getErrorMessage,
} from './Exchange'
import { Token } from './Token'

const proofsEnabled = false

type Pair = {
    baseCurrency: PublicKey
    quoteCurrency: PublicKey
    buyOrders: Array<OrderObject | null>
    sellOrders: Array<OrderObject | null>
}

class TestAuthority {
    // Stores all the pairs in an array.
    private pairs: Array<Pair> = []
    // Stores all the pairs in a tree.
    private pairsTree: MerkleTree = new MerkleTree(PAIRS_HEIGHT)

    // Stores all the BUY orders of each pair in trees.
    private buyOrderTreesByPair: Map<number, MerkleTree> = new Map()

    // Stores all the SELL orders of each pair in trees.
    private sellOrderTreesByPair: Map<number, MerkleTree> = new Map()

    private createSignature(message: Array<Field>): Signature {
        return Signature.create(AUTHORITY_PRIVATE_KEY, message)
    }

    private getBuyOrdersTreeRoot(pairIndex: number): Field {
        const buyOrdersTree = this.buyOrderTreesByPair.get(pairIndex)

        if (!buyOrdersTree) throw 'There is no pair at given index.'

        const root = buyOrdersTree.getRoot()

        return root
    }

    private getSellOrdersTreeRoot(pairIndex: number): Field {
        const sellOrdersTree = this.sellOrderTreesByPair.get(pairIndex)

        if (!sellOrdersTree) throw 'There is no pair at given index.'

        const root = sellOrdersTree.getRoot()

        return root
    }

    private getBuyOrderWitness(pairIndex: number, orderIndex: number): OrderWitness {
        const buyOrdersTree = this.buyOrderTreesByPair.get(pairIndex)

        if (!buyOrdersTree) throw 'There is no pair at given index.'

        const merkleWitness = buyOrdersTree.getWitness(BigInt(orderIndex))

        const orderWitness = new OrderWitness(merkleWitness)

        return orderWitness
    }

    private getSellOrderWitness(pairIndex: number, orderIndex: number): OrderWitness {
        const sellOrdersTree = this.sellOrderTreesByPair.get(pairIndex)

        if (!sellOrdersTree) throw 'There is no pair at given index.'

        const merkleWitness = sellOrdersTree.getWitness(BigInt(orderIndex))

        const orderWitness = new OrderWitness(merkleWitness)

        return orderWitness
    }

    private getPairWitness(pairIndex: number): PairWitness {
        const merkleWitness = this.pairsTree.getWitness(BigInt(pairIndex))
        const pairWitness = new PairWitness(merkleWitness)

        return pairWitness
    }

    private updateBuyOrdersTree(pairIndex: number, orderIndex: number, orderHash: Field) {
        const buyOrdersTree = this.buyOrderTreesByPair.get(pairIndex)

        if (!buyOrdersTree) throw 'There is no pair at given index.'

        buyOrdersTree.setLeaf(BigInt(orderIndex), orderHash)

        this.buyOrderTreesByPair.set(pairIndex, buyOrdersTree)
    }

    private updateSellOrdersTree(pairIndex: number, orderIndex: number, orderHash: Field) {
        const sellOrdersTree = this.sellOrderTreesByPair.get(pairIndex)

        if (!sellOrdersTree) throw 'There is no pair at given index.'

        sellOrdersTree.setLeaf(BigInt(orderIndex), orderHash)

        this.sellOrderTreesByPair.set(pairIndex, sellOrdersTree)
    }

    private updatePairsTree(pairIndex: number, pairHash: Field) {
        console.log(`pairs tree before: ${this.pairsTree.getRoot().toString()}`)
        this.pairsTree.setLeaf(BigInt(pairIndex), pairHash)
        console.log(`pairs tree after: ${this.pairsTree.getRoot().toString()}`)
    }

    createPair(baseCurrency: PublicKey, quoteCurrency: PublicKey) {
        const doesPairAlreadyExist = this.pairs.find((pair) => {
            return (
                (pair.baseCurrency.equals(baseCurrency) && pair.quoteCurrency.equals(quoteCurrency)) ||
                (pair.baseCurrency.equals(quoteCurrency) && pair.quoteCurrency.equals(baseCurrency))
            )
        })
        if (doesPairAlreadyExist) throw 'Pair already exists.'

        const pairIndex = this.pairs.length

        const emptyOrdersMerkleTree = new MerkleTree(ORDERS_HEIGHT)
        const emptyOrdersMerkleRoot = emptyOrdersMerkleTree.getRoot()

        const pair: Pair = {
            baseCurrency,
            quoteCurrency,
            buyOrders: [],
            sellOrders: [],
        }

        this.pairs.push(pair)

        const pairHash = Poseidon.hash([
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            emptyOrdersMerkleRoot,
            emptyOrdersMerkleRoot,
        ])

        this.updatePairsTree(pairIndex, pairHash)
        this.buyOrderTreesByPair.set(pairIndex, emptyOrdersMerkleTree)
        this.sellOrderTreesByPair.set(pairIndex, emptyOrdersMerkleTree)

        return {
            pairWitness: this.getPairWitness(pairIndex),
            authoritySignature: this.createSignature([
                ...pair.baseCurrency.toFields(),
                ...pair.quoteCurrency.toFields(),
                new Field(pairIndex),
            ]),
        }
    }

    placeBuyOrder(amount: UInt64, price: UInt64, baseCurrency: PublicKey, quoteCurrency: PublicKey, maker: PublicKey) {
        const pairIndex = this.pairs.findIndex(
            (pair) => pair.baseCurrency.equals(baseCurrency) && pair.quoteCurrency.equals(quoteCurrency)
        )
        if (pairIndex === -1) throw 'Pair does not exist'

        const pair = this.pairs[pairIndex]
        const orderIndex = pair.buyOrders.length

        const buyOrderWitness = this.getBuyOrderWitness(pairIndex, orderIndex)
        const sellOrdersRoot = this.getSellOrdersTreeRoot(pairIndex)
        const pairWitness = this.getPairWitness(pairIndex)
        const authoritySignature = this.createSignature([
            ...amount.toFields(),
            ...price.toFields(),
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            ...buyOrderWitness.toFields(),
            ...sellOrdersRoot.toFields(),
            ...pairWitness.toFields(),
        ])

        const order: OrderObject = {
            maker,
            amount,
            price,
        }

        pair.buyOrders[orderIndex] = order

        const orderHash = Poseidon.hash([...maker.toFields(), ...amount.toFields(), ...price.toFields()])

        console.log(`before buy order ${orderIndex} is placed: `, this.pairsTree.getRoot().toString())

        this.updateBuyOrdersTree(pairIndex, orderIndex, orderHash)
        const updatedBuyOrdersRoot = this.getBuyOrdersTreeRoot(pairIndex)

        const pairHash = Poseidon.hash([
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            updatedBuyOrdersRoot,
            sellOrdersRoot,
        ])

        this.updatePairsTree(pairIndex, pairHash)

        console.log(`updated after buy order ${orderIndex} is placed: `, this.pairsTree.getRoot().toString())

        return {
            buyOrderWitness: buyOrderWitness,
            sellOrdersRoot: sellOrdersRoot,
            pairWitness: pairWitness,
            authoritySignature,
        }
    }

    placeSellOrder(amount: UInt64, price: UInt64, baseCurrency: PublicKey, quoteCurrency: PublicKey, maker: PublicKey) {
        const pairIndex = this.pairs.findIndex(
            (pair) => pair.baseCurrency.equals(baseCurrency) && pair.quoteCurrency.equals(quoteCurrency)
        )
        if (pairIndex === -1) throw 'Pair does not exist'

        const pair = this.pairs[pairIndex]
        const orderIndex = pair.sellOrders.length

        const buyOrdersRoot = this.getBuyOrdersTreeRoot(pairIndex)
        const sellOrderWitness = this.getSellOrderWitness(pairIndex, orderIndex)
        const pairWitness = this.getPairWitness(pairIndex)
        const authoritySignature = this.createSignature([
            ...amount.toFields(),
            ...price.toFields(),
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            ...buyOrdersRoot.toFields(),
            ...sellOrderWitness.toFields(),
            ...pairWitness.toFields(),
        ])

        const order: OrderObject = {
            maker,
            amount,
            price,
        }

        pair.sellOrders[orderIndex] = order

        const orderHash = Poseidon.hash([...maker.toFields(), ...amount.toFields(), ...price.toFields()])

        this.updateSellOrdersTree(pairIndex, orderIndex, orderHash)
        const updatedSellOrdersRoot = this.getSellOrdersTreeRoot(pairIndex)

        const pairHash = Poseidon.hash([
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            buyOrdersRoot,
            updatedSellOrdersRoot,
        ])

        this.updatePairsTree(pairIndex, pairHash)

        return {
            buyOrdersRoot: buyOrdersRoot,
            sellOrderWitness: sellOrderWitness,
            pairWitness: pairWitness,
            authoritySignature,
        }
    }

    executeBuyOrder(orderId: number, baseCurrency: PublicKey, quoteCurrency: PublicKey) {
        const pairIndex = this.pairs.findIndex(
            (pair) => pair.baseCurrency.equals(baseCurrency) && pair.quoteCurrency.equals(quoteCurrency)
        )
        if (pairIndex === -1) throw 'Pair does not exist'

        const pair = this.pairs[pairIndex]
        const order = pair.buyOrders.at(orderId)

        if (!order) throw 'Order ID is invalid.'

        const buyOrderWitness = this.getBuyOrderWitness(pairIndex, orderId)
        const sellOrdersRoot = this.getSellOrdersTreeRoot(pairIndex)
        const pairWitness = this.getPairWitness(pairIndex)

        const authoritySignature = this.createSignature([
            ...order.maker.toFields(),
            ...order.amount.toFields(),
            ...order.price.toFields(),
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            ...buyOrderWitness.toFields(),
            ...sellOrdersRoot.toFields(),
            ...pairWitness.toFields(),
        ])

        pair.buyOrders[orderId] = null

        this.updateBuyOrdersTree(pairIndex, orderId, Field(0))
        const updatedBuyOrdersRoot = this.getBuyOrdersTreeRoot(pairIndex)

        const pairHash = Poseidon.hash([
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            updatedBuyOrdersRoot,
            sellOrdersRoot,
        ])

        this.updatePairsTree(pairIndex, pairHash)

        return {
            maker: order.maker,
            amount: order.amount,
            price: order.price,
            buyOrderWitness,
            sellOrdersRoot,
            pairWitness,
            authoritySignature,
        }
    }

    executeSellOrder(orderId: number, baseCurrency: PublicKey, quoteCurrency: PublicKey) {
        const pairIndex = this.pairs.findIndex(
            (pair) => pair.baseCurrency.equals(baseCurrency) && pair.quoteCurrency.equals(quoteCurrency)
        )
        if (pairIndex === -1) throw 'Pair does not exist'

        const pair = this.pairs[pairIndex]
        const order = pair.sellOrders.at(orderId)

        if (!order) throw 'Order ID is invalid.'

        const buyOrdersRoot = this.getBuyOrdersTreeRoot(pairIndex)
        const sellOrderWitness = this.getSellOrderWitness(pairIndex, orderId)
        const pairWitness = this.getPairWitness(pairIndex)

        const authoritySignature = this.createSignature([
            ...order.maker.toFields(),
            ...order.amount.toFields(),
            ...order.price.toFields(),
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            ...buyOrdersRoot.toFields(),
            ...sellOrderWitness.toFields(),
            ...pairWitness.toFields(),
        ])

        pair.sellOrders[orderId] = null

        this.updateSellOrdersTree(pairIndex, orderId, Field(0))
        const updatedSellOrdersRoot = this.getSellOrdersTreeRoot(pairIndex)

        const pairHash = Poseidon.hash([
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            buyOrdersRoot,
            updatedSellOrdersRoot,
        ])

        this.updatePairsTree(pairIndex, pairHash)

        return {
            maker: order.maker,
            amount: order.amount,
            price: order.price,
            buyOrdersRoot,
            sellOrderWitness,
            pairWitness,
            authoritySignature,
        }
    }

    cancelBuyOrder(orderId: number, baseCurrency: PublicKey, quoteCurrency: PublicKey) {
        const pairIndex = this.pairs.findIndex(
            (pair) => pair.baseCurrency.equals(baseCurrency) && pair.quoteCurrency.equals(quoteCurrency)
        )
        if (pairIndex === -1) throw 'Pair does not exist'

        const pair = this.pairs[pairIndex]
        const order = pair.buyOrders.at(orderId)

        if (!order) throw 'Order ID is invalid.'

        console.log(`cancel buy order ${orderId} before: `, this.pairsTree.getRoot().toString())

        const buyOrderWitness = this.getBuyOrderWitness(pairIndex, orderId)
        const sellOrdersRoot = this.getSellOrdersTreeRoot(pairIndex)
        const pairWitness = this.getPairWitness(pairIndex)

        console.log(
            'calculated before: ',
            pairWitness
                .calculateRoot(
                    Poseidon.hash([
                        ...baseCurrency.toFields(),
                        ...quoteCurrency.toFields(),
                        buyOrderWitness.calculateRoot(
                            Poseidon.hash([
                                ...order.maker.toFields(),
                                ...order.amount.toFields(),
                                ...order.price.toFields(),
                            ])
                        ),
                        sellOrdersRoot,
                    ])
                )
                .toString()
        )

        const authoritySignature = this.createSignature([
            ...order.amount.toFields(),
            ...order.price.toFields(),
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            ...buyOrderWitness.toFields(),
            ...sellOrdersRoot.toFields(),
            ...pairWitness.toFields(),
        ])

        pair.buyOrders[orderId] = null

        this.updateBuyOrdersTree(pairIndex, orderId, Field(0))
        const updatedBuyOrdersRoot = this.getBuyOrdersTreeRoot(pairIndex)

        const pairHash = Poseidon.hash([
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            updatedBuyOrdersRoot,
            sellOrdersRoot,
        ])

        this.updatePairsTree(pairIndex, pairHash)

        return {
            price: order.price,
            amount: order.amount,
            buyOrderWitness,
            sellOrdersRoot,
            pairWitness,
            authoritySignature,
        }
    }

    cancelSellOrder(orderId: number, baseCurrency: PublicKey, quoteCurrency: PublicKey) {
        const pairIndex = this.pairs.findIndex(
            (pair) => pair.baseCurrency.equals(baseCurrency) && pair.quoteCurrency.equals(quoteCurrency)
        )
        if (pairIndex === -1) throw 'Pair does not exist'

        const pair = this.pairs[pairIndex]
        const order = pair.sellOrders.at(orderId)

        if (!order) throw 'Order ID is invalid.'

        const sellOrderWitness = this.getSellOrderWitness(pairIndex, orderId)
        const buyOrdersRoot = this.getBuyOrdersTreeRoot(pairIndex)
        const pairWitness = this.getPairWitness(pairIndex)

        const authoritySignature = this.createSignature([
            ...order.amount.toFields(),
            ...order.price.toFields(),
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            ...buyOrdersRoot.toFields(),
            ...sellOrderWitness.toFields(),
            ...pairWitness.toFields(),
        ])

        pair.sellOrders[orderId] = null

        this.updateSellOrdersTree(pairIndex, orderId, Field(0))
        const updatedSellOrdersRoot = this.getSellOrdersTreeRoot(pairIndex)

        const pairHash = Poseidon.hash([
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            buyOrdersRoot,
            updatedSellOrdersRoot,
        ])

        this.updatePairsTree(pairIndex, pairHash)

        return {
            price: order.price,
            amount: order.amount,
            buyOrdersRoot,
            sellOrderWitness,
            pairWitness,
            authoritySignature,
        }
    }
}

const testAuthority = new TestAuthority()

describe('Exchange Contract', () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled })
    Mina.setActiveInstance(Local)

    const deployerPrivateKey: PrivateKey = Local.testAccounts[0].privateKey
    const deployerPublicKey: PublicKey = Local.testAccounts[0].publicKey

    const user1PrivateKey: PrivateKey = Local.testAccounts[1].privateKey
    const user1PublicKey: PublicKey = Local.testAccounts[1].publicKey

    const user2PrivateKey: PrivateKey = Local.testAccounts[2].privateKey
    const user2PublicKey: PublicKey = Local.testAccounts[2].publicKey

    const exchangeZkAppPrivateKey: PrivateKey = PrivateKey.random()
    const exchangeZkAppPublicKey: PublicKey = exchangeZkAppPrivateKey.toPublicKey()
    const exchange: Exchange = new Exchange(exchangeZkAppPublicKey)

    const tokenOneZkAppPrivateKey: PrivateKey = PrivateKey.random()
    const tokenOneZkAppPublicKey: PublicKey = tokenOneZkAppPrivateKey.toPublicKey()
    const tokenOne: Token = new Token(tokenOneZkAppPublicKey)

    const tokenTwoZkAppPrivateKey: PrivateKey = PrivateKey.random()
    const tokenTwoZkAppPublicKey: PublicKey = tokenTwoZkAppPrivateKey.toPublicKey()
    const tokenTwo: Token = new Token(tokenTwoZkAppPublicKey)

    let exchangeZkAppverificationKey: { data: string; hash: Field }
    let tokenZkAppverificationKey: { data: string; hash: Field }

    beforeAll(async () => {
        // we're compiling both contracts in parallel to finish earlier
        const results = await Promise.all([Exchange.compile(), Token.compile()])

        exchangeZkAppverificationKey = results[0].verificationKey
        tokenZkAppverificationKey = results[1].verificationKey
    })

    it('can create exchange', async () => {
        const tx = await Mina.transaction(deployerPublicKey, () => {
            AccountUpdate.fundNewAccount(deployerPublicKey)
            exchange.deploy({
                verificationKey: exchangeZkAppverificationKey,
                zkappKey: exchangeZkAppPrivateKey,
            })
        })

        await tx.prove()
        await tx.sign([deployerPrivateKey, exchangeZkAppPrivateKey]).send()
    })

    it('can create ONE token', async () => {
        const symbol = Encoding.stringToFields('ONE')[0]
        const decimals = UInt64.from(8)
        const maxSupply = UInt64.from(21_000_000)

        const tx = await Mina.transaction(user1PublicKey, () => {
            AccountUpdate.fundNewAccount(user1PublicKey)

            tokenOne.deploy({
                verificationKey: tokenZkAppverificationKey,
                zkappKey: tokenOneZkAppPrivateKey,
            })

            tokenOne.initialize(symbol, decimals, maxSupply)
        })

        await tx.prove()
        await tx.sign([user1PrivateKey, tokenOneZkAppPrivateKey]).send()
    })

    it('can create TWO token', async () => {
        const symbol = Encoding.stringToFields('TWO')[0]
        const decimals = UInt64.from(5)
        const maxSupply = UInt64.from(1_000_000_000)

        const tx = await Mina.transaction(user2PublicKey, () => {
            AccountUpdate.fundNewAccount(user2PublicKey)

            tokenTwo.deploy({
                verificationKey: tokenZkAppverificationKey,
                zkappKey: tokenTwoZkAppPrivateKey,
            })

            tokenTwo.initialize(symbol, decimals, maxSupply)
        })

        await tx.prove()
        await tx.sign([user2PrivateKey, tokenTwoZkAppPrivateKey]).send()
    })

    it('can mint ONE token', async () => {
        const amount = UInt64.from(21_000_000)

        const tx = await Mina.transaction(user1PublicKey, () => {
            AccountUpdate.fundNewAccount(user1PublicKey)

            tokenOne.mint(user1PublicKey, amount)
        })

        await tx.prove()
        await tx.sign([user1PrivateKey, tokenOneZkAppPrivateKey]).send()
    })

    it('can mint TWO token', async () => {
        const amount = UInt64.from(1_000_000_000)

        const tx = await Mina.transaction(user2PublicKey, () => {
            AccountUpdate.fundNewAccount(user2PublicKey)

            tokenTwo.mint(user2PublicKey, amount)
        })

        await tx.prove()
        await tx.sign([user2PrivateKey, tokenTwoZkAppPrivateKey]).send()
    })

    it('can create pairs', async () => {
        const baseCurrency = tokenOne.address
        const quoteCurrency = tokenTwo.address

        const { pairWitness, authoritySignature } = testAuthority.createPair(baseCurrency, quoteCurrency)

        const tx = await Mina.transaction(user1PublicKey, () => {
            exchange.createPair(baseCurrency, quoteCurrency, pairWitness, authoritySignature)
        })

        await tx.prove()
        await tx.sign([user1PrivateKey]).send()
    })

    it("can't create pairs when pairs already exists", async () => {
        try {
            const baseCurrency = tokenOne.address
            const quoteCurrency = tokenTwo.address

            const { pairWitness, authoritySignature } = testAuthority.createPair(baseCurrency, quoteCurrency)

            const tx = await Mina.transaction(user1PublicKey, () => {
                exchange.createPair(baseCurrency, quoteCurrency, pairWitness, authoritySignature)
            })

            await tx.prove()
            await tx.sign([user1PrivateKey]).send()

            throw 'Must have failed!'
        } catch (error) {
            expect(error).toEqual('Pair already exists.')
        }
    })

    it('can place BUY orders', async () => {
        const amount = new UInt64(400)
        const price = new UInt64(21)
        const baseCurrency = tokenOne.address
        const quoteCurrency = tokenTwo.address

        const { buyOrderWitness, sellOrdersRoot, pairWitness, authoritySignature } = testAuthority.placeBuyOrder(
            amount,
            price,
            baseCurrency,
            quoteCurrency,
            user2PublicKey
        )

        const tx = await Mina.transaction(user2PublicKey, () => {
            AccountUpdate.fundNewAccount(user2PublicKey)

            exchange.placeBuyOrder(
                amount,
                price,
                baseCurrency,
                quoteCurrency,
                buyOrderWitness,
                sellOrdersRoot,
                pairWitness,
                authoritySignature
            )
        })

        await tx.prove()
        await tx.sign([user2PrivateKey]).send()
    })

    it('can place SELL orders', async () => {
        const amount = new UInt64(100)
        const price = new UInt64(50)
        const baseCurrency = tokenOne.address
        const quoteCurrency = tokenTwo.address

        const { buyOrdersRoot, sellOrderWitness, pairWitness, authoritySignature } = testAuthority.placeSellOrder(
            amount,
            price,
            baseCurrency,
            quoteCurrency,
            user1PublicKey
        )

        const tx = await Mina.transaction(user1PublicKey, () => {
            AccountUpdate.fundNewAccount(user1PublicKey)

            exchange.placeSellOrder(
                amount,
                price,
                baseCurrency,
                quoteCurrency,
                buyOrdersRoot,
                sellOrderWitness,
                pairWitness,
                authoritySignature
            )
        })

        await tx.prove()
        await tx.sign([user1PrivateKey]).send()
    })

    it('can execute BUY orders', async () => {
        const baseCurrency = tokenOne.address
        const quoteCurrency = tokenTwo.address
        const orderId = 0

        const { maker, amount, price, buyOrderWitness, sellOrdersRoot, pairWitness, authoritySignature } =
            testAuthority.executeBuyOrder(orderId, baseCurrency, quoteCurrency)

        const tx = await Mina.transaction(user1PublicKey, () => {
            AccountUpdate.fundNewAccount(user1PublicKey)

            exchange.executeBuyOrder(
                maker,
                amount,
                price,
                baseCurrency,
                quoteCurrency,
                buyOrderWitness,
                sellOrdersRoot,
                pairWitness,
                authoritySignature
            )
        })

        await tx.prove()
        await tx.sign([user1PrivateKey]).send()
    })

    it('can execute SELL orders', async () => {
        const baseCurrency = tokenOne.address
        const quoteCurrency = tokenTwo.address
        const orderId = 0

        const { maker, amount, price, buyOrdersRoot, sellOrderWitness, pairWitness, authoritySignature } =
            testAuthority.executeSellOrder(orderId, baseCurrency, quoteCurrency)

        const tx = await Mina.transaction(user2PublicKey, () => {
            AccountUpdate.fundNewAccount(user2PublicKey)

            exchange.executeSellOrder(
                maker,
                amount,
                price,
                baseCurrency,
                quoteCurrency,
                buyOrdersRoot,
                sellOrderWitness,
                pairWitness,
                authoritySignature
            )
        })

        await tx.prove()
        await tx.sign([user2PrivateKey]).send()
    })

    it('can place cancalable BUY orders', async () => {
        const amount = new UInt64(400)
        const price = new UInt64(21)
        const baseCurrency = tokenOne.address
        const quoteCurrency = tokenTwo.address

        const { buyOrderWitness, sellOrdersRoot, pairWitness, authoritySignature } = testAuthority.placeBuyOrder(
            amount,
            price,
            baseCurrency,
            quoteCurrency,
            user2PublicKey
        )

        const tx = await Mina.transaction(user2PublicKey, () => {
            exchange.placeBuyOrder(
                amount,
                price,
                baseCurrency,
                quoteCurrency,
                buyOrderWitness,
                sellOrdersRoot,
                pairWitness,
                authoritySignature
            )
        })

        await tx.prove()
        await tx.sign([user2PrivateKey]).send()
    })

    //     it('can cancel BUY orders', async () => {
    //         console.log('on-chain: ', exchange.root.get().toString())
    //         const orderId = 1
    //         const baseCurrency = tokenOne.address
    //         const quoteCurrency = tokenTwo.address
    //         const { buyOrderWitness, sellOrdersRoot, pairWitness, authoritySignature, amount, price } =
    //             testAuthority.cancelBuyOrder(orderId, baseCurrency, quoteCurrency)

    //         const tx = await Mina.transaction(user2PublicKey, () => {
    //             exchange.cancelBuyOrder(
    //                 amount,
    //                 price,
    //                 baseCurrency,
    //                 quoteCurrency,
    //                 buyOrderWitness,
    //                 sellOrdersRoot,
    //                 pairWitness,
    //                 authoritySignature
    //             )
    //         })

    //         await tx.prove()
    //         await tx.sign([user2PrivateKey]).send()
    //     })

    //     it('can place cancalable SELL orders', async () => {
    //         const amount = new UInt64(10)
    //         const price = new UInt64(50)
    //         const baseCurrency = tokenOne.address
    //         const quoteCurrency = tokenTwo.address

    //         const { buyOrdersRoot, sellOrderWitness, pairWitness, authoritySignature } = testAuthority.placeSellOrder(
    //             amount,
    //             price,
    //             baseCurrency,
    //             quoteCurrency,
    //             user1PublicKey
    //         )

    //         const tx = await Mina.transaction(user1PublicKey, () => {
    //             exchange.placeSellOrder(
    //                 amount,
    //                 price,
    //                 baseCurrency,
    //                 quoteCurrency,
    //                 buyOrdersRoot,
    //                 sellOrderWitness,
    //                 pairWitness,
    //                 authoritySignature
    //             )
    //         })

    //         await tx.prove()
    //         await tx.sign([user1PrivateKey]).send()
    //     })

    //     it('can cancel SELL orders', async () => {
    //         console.log('on-chain: ', exchange.root.get().toString())
    //         const orderId = 1
    //         const baseCurrency = tokenOne.address
    //         const quoteCurrency = tokenTwo.address
    //         const { buyOrdersRoot, sellOrderWitness, pairWitness, authoritySignature, amount, price } =
    //             testAuthority.cancelSellOrder(orderId, baseCurrency, quoteCurrency)

    //         const tx = await Mina.transaction(user1PublicKey, () => {
    //             exchange.cancelSellOrder(
    //                 amount,
    //                 price,
    //                 baseCurrency,
    //                 quoteCurrency,
    //                 buyOrdersRoot,
    //                 sellOrderWitness,
    //                 pairWitness,
    //                 authoritySignature
    //             )
    //         })

    //         await tx.prove()
    //         await tx.sign([user1PrivateKey]).send()
    //     })
})
