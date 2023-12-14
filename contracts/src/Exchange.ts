import { DeployArgs, Field, MerkleMap, MerkleMapWitness, MerkleTree, MerkleWitness, Permissions, Poseidon, Provable, PublicKey, Signature, SmartContract, State, Struct, UInt64, method, state } from "o1js"
import { Token } from "./Token"

const FIELD_ZERO = Field.from(0)

const HEIGHT_OF_ORDERS_MERKLE_TREE = 10
const HEIGHT_OF_PAIRS_MERKLE_TREE = 10

const ROOT_OF_EMPTY_ORDERS_MERKLE_TREE = new MerkleTree(HEIGHT_OF_ORDERS_MERKLE_TREE).getRoot()

class MerkleWitnessForOrdersTree extends MerkleWitness(HEIGHT_OF_ORDERS_MERKLE_TREE) { }
class MerkleWitnessForPairsTree extends MerkleWitness(HEIGHT_OF_PAIRS_MERKLE_TREE) { }

class Pair extends Struct({
    buySideToken: PublicKey,
    sellSideToken: PublicKey,
    sellOrdersRoot: Field,
    buyOrdersRoot: Field,
}) {

    hash(): Field {
        return Poseidon.hash([...this.buySideToken.toFields(), ...this.sellSideToken.toFields(), this.buyOrdersRoot, this.sellOrdersRoot])
    }

    static new(tokenOne: PublicKey, tokenTwo: PublicKey, buyOrdersRoot: Field, sellOrdersRoot: Field): Pair {
        // we can't allow a pair where both sides are the same token.
        tokenOne.equals(tokenTwo).assertFalse()

        // calculate hashes of two tokens separately.
        const hashOne = Poseidon.hash(tokenOne.toFields())
        const hashTwo = Poseidon.hash(tokenTwo.toFields())

        // no matter in what order tokens are given, always get them in the same order by comparing.
        const buySideToken = Provable.if(hashOne.greaterThan(hashTwo), tokenOne, tokenTwo)
        const sellSideToken = Provable.if(hashOne.greaterThan(hashTwo), tokenTwo, tokenOne)

        return new Pair({
            buySideToken,
            sellSideToken,
            buyOrdersRoot,
            sellOrdersRoot,
        })
    }
}


class Order extends Struct({
    maker: Field,
    amount: UInt64,
    price: UInt64,
}) {
    hash(): Field {
        return Poseidon.hash([this.maker, ...this.amount.toFields(), ...this.price.toFields()])
    }

    static new(maker: PublicKey, amount: UInt64, price: UInt64): Order {
        return new Order({
            maker: Poseidon.hash(maker.toFields()),
            amount,
            price,
        })
    }
}


/**
 * An order book decentralized exchange that allows trading of tokens.
 */
export class Exchange extends SmartContract {
    /**
     * Root of the merkle tree that stores all the pairs.
     */
    @state(Field) pairsRoot = State<Field>()

    /**
     * Hash of the public key of the authority.
     */
    @state(PublicKey) authority = State<PublicKey>()

    deploy(args: DeployArgs) {
        super.deploy(args)
        this.account.permissions.set({
            ...Permissions.default(),
            editState: Permissions.proofOrSignature(),
            editActionState: Permissions.proofOrSignature(),
            incrementNonce: Permissions.proofOrSignature(),
            setVerificationKey: Permissions.none(),
            setPermissions: Permissions.proofOrSignature(),
        })
    }

    init() {
        super.init()
        const PAIRS_MERKLE_TREE_HEIGHT = 10
        const mt = new MerkleTree(PAIRS_MERKLE_TREE_HEIGHT)
        this.pairsRoot.set(mt.getRoot())
    }

    @method createPair(tokenOne: PublicKey, tokenTwo: PublicKey, pairWitness: MerkleWitnessForPairsTree, authoritySignature: Signature) {
        // require that pair doesn't exist on given leaf node
        this.pairsRoot.getAndAssertEquals().assertEquals(pairWitness.calculateRoot(FIELD_ZERO))

        // require that signature is valid
        authoritySignature.verify(this.authority.get(), [...tokenOne.toFields(), ...tokenTwo.toFields(), pairWitness.calculateIndex()]).assertTrue()

        // create a pair
        const pair = Pair.new(tokenOne, tokenTwo, ROOT_OF_EMPTY_ORDERS_MERKLE_TREE, ROOT_OF_EMPTY_ORDERS_MERKLE_TREE)

        // create the new root
        const newPairsRoot = pairWitness.calculateRoot(pair.hash())

        // update the on-chain pairs root
        this.pairsRoot.set(newPairsRoot)
    }

    @method placeBuyOrder(amount: UInt64, price: UInt64, sellToken: PublicKey, buyToken: PublicKey, buyOrdersRoot: Field, sellOrdersRoot: Field, pairWitness: MerkleWitnessForPairsTree, buyOrdersWitness: MerkleWitnessForOrdersTree, authoritySignature: Signature) {
        // require that signature is valid
        authoritySignature.verify(this.authority.get(), [...amount.toFields(), ...price.toFields(), ...sellToken.toFields(), ...buyToken.toFields(), buyOrdersRoot, sellOrdersRoot, ...pairWitness.toFields(), ...buyOrdersWitness.toFields()]).assertTrue()

        // construct the pair
        const pair = Pair.new(buyToken, sellToken, buyOrdersRoot, sellOrdersRoot)

        // require that the constructed pair is correct
        this.pairsRoot.getAndAssertEquals().assertEquals(pairWitness.calculateRoot(pair.hash()))

        // require that the order doesn't exist
        pair.buyOrdersRoot.assertEquals(buyOrdersWitness.calculateRoot(FIELD_ZERO))

        const sellTokenInstance = new Token(sellToken)

        // todo: learn that if it fails when the transfer is not successful
        sellTokenInstance.sendTokens(this.sender, this.address, amount.mul(price))

        // create a buy order
        const buyOrder = Order.new(this.sender, amount, price)

        // create a new root for the buy orders of the pair
        const newBuyOrdersRoot = buyOrdersWitness.calculateRoot(buyOrder.hash())

        // construct a new pair using the new buy orders root
        const newPair = Pair.new(buyToken, sellToken, newBuyOrdersRoot, sellOrdersRoot)

        // construct a new pairs root using the updated pair
        const newPairsRoot = pairWitness.calculateRoot(newPair.hash())

        // update the on-chain pairs root
        this.pairsRoot.set(newPairsRoot)
    }

    @method placeSellOrder(amount: UInt64, price: UInt64, sellToken: PublicKey, buyToken: PublicKey, buyOrdersRoot: Field, sellOrdersRoot: Field, pairWitness: MerkleWitnessForPairsTree, sellOrdersWitness: MerkleWitnessForOrdersTree, authoritySignature: Signature) {
        // require that signature is valid
        authoritySignature.verify(this.authority.get(), [...amount.toFields(), ...price.toFields(), ...sellToken.toFields(), ...buyToken.toFields(), buyOrdersRoot, sellOrdersRoot, ...pairWitness.toFields(), ...sellOrdersWitness.toFields()]).assertTrue()

        // construct the pair
        const pair = Pair.new(buyToken, sellToken, buyOrdersRoot, sellOrdersRoot)

        // require that the constructed pair is correct
        this.pairsRoot.getAndAssertEquals().assertEquals(pairWitness.calculateRoot(pair.hash()))

        // require that the order doesn't exist
        pair.sellOrdersRoot.assertEquals(sellOrdersWitness.calculateRoot(FIELD_ZERO))

        const sellTokenInstance = new Token(sellToken)

        // todo: learn that if it fails when the transfer is not successful
        sellTokenInstance.sendTokens(this.sender, this.address, amount.mul(price))

        // create a sell order
        const sellOrder = Order.new(this.sender, amount, price)

        // create a new root for the sell orders of the pair
        const newSellOrdersRoot = sellOrdersWitness.calculateRoot(sellOrder.hash())

        // construct a new pair using the new sell orders root
        const newPair = Pair.new(buyToken, sellToken, buyOrdersRoot, newSellOrdersRoot)

        // construct a new pairs root using the updated pair
        const newPairsRoot = pairWitness.calculateRoot(newPair.hash())

        // update the on-chain pairs root
        this.pairsRoot.set(newPairsRoot)
    }
}


