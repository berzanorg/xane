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
    PAIRS_HEIGHT,
    PairObject,
    PairsWitness,
    getErrorMessage,
} from './Exchange'
import { Token } from './Token'

const proofsEnabled = false

class TestAuthority {
    // Stores all the pairs in an array.
    private pairs: Array<PairObject> = []
    // Stores all the pairs in a tree.
    private pairsTree: MerkleTree = new MerkleTree(PAIRS_HEIGHT)

    // Stores all the BUY orders of each pair in arrays.
    private buyOrders: Map<number, Array<OrderObject>> = new Map()
    // Stores all the BUY orders of each pair in trees.
    private buyOrdersTrees: Map<number, MerkleTree> = new Map()

    // Stores all the SELL orders of each pair in an array.
    private sellOrders: Map<number, Array<OrderObject>> = new Map()
    // Stores all the SELL orders of each pair in trees.
    private sellOrdersTrees: Map<number, MerkleTree> = new Map()

    private createSignature(message: Array<Field>): Signature {
        return Signature.create(AUTHORITY_PRIVATE_KEY, message)
    }

    createPair(baseCurrencyAddress: PublicKey, quoteCurrencyAddress: PublicKey) {
        const pairIndex = BigInt(this.pairs.length)

        const emptyRoot = new MerkleTree(ORDERS_HEIGHT).getRoot()

        const pair: PairObject = {
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot: emptyRoot,
            sellOrdersRoot: emptyRoot,
        }

        this.pairs.push(pair)

        this.pairsTree.setLeaf(
            pairIndex,
            Poseidon.hash([
                ...pair.baseCurrencyAddress.toFields(),
                ...pair.quoteCurrencyAddress.toFields(),
                pair.buyOrdersRoot,
                pair.sellOrdersRoot,
            ])
        )

        const pairsWitness = new PairsWitness(this.pairsTree.getWitness(pairIndex))

        return {
            pairsWitness,
            signature: this.createSignature([
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                new Field(pairIndex),
            ]),
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
        const supply = UInt64.from(21_000_000)

        const tx = await Mina.transaction(user1PublicKey, () => {
            AccountUpdate.fundNewAccount(user1PublicKey)
            AccountUpdate.fundNewAccount(user1PublicKey)

            tokenOne.deploy({
                verificationKey: tokenZkAppverificationKey,
                zkappKey: tokenOneZkAppPrivateKey,
                symbol: symbol,
                fixedSupply: supply,
            })
        })

        await tx.prove()
        await tx.sign([user1PrivateKey, tokenOneZkAppPrivateKey]).send()
    })

    it('can create TWO token', async () => {
        const symbol = Encoding.stringToFields('TWO')[0]
        const supply = UInt64.from(1_000_000_000)

        const tx = await Mina.transaction(user2PublicKey, () => {
            AccountUpdate.fundNewAccount(user2PublicKey)
            AccountUpdate.fundNewAccount(user2PublicKey)

            tokenTwo.deploy({
                verificationKey: tokenZkAppverificationKey,
                zkappKey: tokenTwoZkAppPrivateKey,
                symbol,
                fixedSupply: supply,
            })
        })

        await tx.prove()
        await tx.sign([user2PrivateKey, tokenTwoZkAppPrivateKey]).send()
    })

    it('can create pairs', async () => {
        const baseCurrencyAddress = tokenOne.address
        const quoteCurrencyAddress = tokenTwo.address

        const { pairsWitness, signature } = testAuthority.createPair(baseCurrencyAddress, quoteCurrencyAddress)

        const tx = await Mina.transaction(user1PublicKey, () => {
            exchange.createPair(baseCurrencyAddress, quoteCurrencyAddress, pairsWitness, signature)
        })

        await tx.prove()
        await tx.sign([user1PrivateKey]).send()
    })

    it("can't create pairs when signature is invalid", async () => {
        try {
            const baseCurrencyAddress = tokenOne.address
            const quoteCurrencyAddress = tokenTwo.address

            const { pairsWitness, signature } = testAuthority.createPair(baseCurrencyAddress, quoteCurrencyAddress)

            const fakeSignature = Signature.create(PrivateKey.random(), [new Field(0)])

            const tx = await Mina.transaction(user1PublicKey, () => {
                exchange.createPair(baseCurrencyAddress, quoteCurrencyAddress, pairsWitness, fakeSignature)
            })

            await tx.prove()
            await tx.sign([user1PrivateKey]).send()

            throw 'Must have failed!'
        } catch (error) {
            const errorMessage = getErrorMessage(error)
            expect(errorMessage).toEqual(Errors.InvalidSignature)
        }
    })
})
