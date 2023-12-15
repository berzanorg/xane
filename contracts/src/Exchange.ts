import { Token } from './Token'
import {
    DeployArgs,
    Field,
    MerkleTree,
    MerkleWitness,
    Permissions,
    Poseidon,
    Provable,
    PublicKey,
    Signature,
    SmartContract,
    State,
    Struct,
    UInt64,
    method,
    state,
} from 'o1js'

/**
 * Creates the type of the object specifiying the layout of `Struct` from given type.
 *
 * So you can make sure that both types are the same.
 *
 * # Usage
 *
 * ```ts
 * type UserObject = {
 *     name: Field
 *     age: UInt32
 * }
 *
 * class User extends Struct({
 *     name: Field,
 *     age: UInt32,
 * } satisfies StructLayout<UserObject>) {}
 * ```
 */
type StructLayout<T> = {
    [P in keyof T]: { new (...args: any[]): T[P] }
}

const FIELD_ZERO = Field.from(0)

const ORDERS_HEIGHT = 10
const PAIRS_HEIGHT = 10

class OrdersWitness extends MerkleWitness(ORDERS_HEIGHT) {}
class PairsWitness extends MerkleWitness(PAIRS_HEIGHT) {}

enum Error {
    SameCurrencies = "A pair can't have the same currencies.",
    PairAlreadyExists = 'The pair already exists.',
    MistakenPair = 'The pair provided is mistaken.',
    InvalidSignature = 'The authority signature is not valid.',
}

type PairObject = {
    baseCurrencyAddress: PublicKey
    quoteCurrencyAddress: PublicKey
    buyOrdersRoot: Field
    sellOrdersRoot: Field
}

class Pair extends Struct({
    baseCurrencyAddress: PublicKey,
    quoteCurrencyAddress: PublicKey,
    buyOrdersRoot: Field,
    sellOrdersRoot: Field,
} satisfies StructLayout<PairObject>) {
    hash(): Field {
        return Poseidon.hash([
            ...this.baseCurrencyAddress.toFields(),
            ...this.quoteCurrencyAddress.toFields(),
            this.buyOrdersRoot,
            this.sellOrdersRoot,
        ])
    }
}

type OrderObject = {
    maker: PublicKey
    amount: UInt64
    price: UInt64
}

class Order extends Struct({
    maker: PublicKey,
    amount: UInt64,
    price: UInt64,
} satisfies StructLayout<OrderObject>) {
    hash(): Field {
        return Poseidon.hash([...this.maker.toFields(), ...this.amount.toFields(), ...this.price.toFields()])
    }
}

/**
 * An order book decentralized exchange that allows trading of tokens.
 */
export class Exchange extends SmartContract {
    /**
     * Root of the merkle tree that stores all the pairs.
     */
    @state(Field) root = State<Field>()

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
        this.root.set(new MerkleTree(PAIRS_HEIGHT).getRoot())
    }

    /**
     * Creates a new pair.
     */
    @method createPair(
        baseCurrencyAddress: PublicKey,
        quoteCurrencyAddress: PublicKey,
        pairsWitness: PairsWitness,
        authoritySignature: Signature
    ) {
        baseCurrencyAddress.equals(quoteCurrencyAddress).assertFalse(Error.SameCurrencies)

        this.root.getAndAssertEquals().assertEquals(pairsWitness.calculateRoot(FIELD_ZERO), Error.PairAlreadyExists)

        authoritySignature
            .verify(this.authority.get(), [
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                pairsWitness.calculateIndex(),
            ])
            .assertTrue(Error.InvalidSignature)

        const emptyRoot = new MerkleTree(ORDERS_HEIGHT).getRoot()

        const pair = new Pair({
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot: emptyRoot,
            sellOrdersRoot: emptyRoot,
        })

        const newPairsRoot = pairsWitness.calculateRoot(pair.hash())

        this.root.set(newPairsRoot)
    }

    /**
     * Places a BUY order.
     */
    @method placeBuyOrder(
        amount: UInt64,
        price: UInt64,
        baseCurrencyAddress: PublicKey,
        quoteCurrencyAddress: PublicKey,
        buyOrdersWitness: OrdersWitness,
        sellOrdersRoot: Field,
        pairsWitness: PairsWitness,
        authoritySignature: Signature
    ) {
        const buyOrdersRoot = buyOrdersWitness.calculateRoot(FIELD_ZERO)

        const pair = new Pair({
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot,
            sellOrdersRoot,
        })

        this.root.getAndAssertEquals().assertEquals(pairsWitness.calculateRoot(pair.hash()), Error.MistakenPair)

        authoritySignature
            .verify(this.authority.get(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                ...buyOrdersWitness.toFields(),
                ...sellOrdersRoot.toFields(),
                ...pairsWitness.toFields(),
            ])
            .assertTrue(Error.InvalidSignature)

        const quoteCurrency = new Token(quoteCurrencyAddress)

        //todo: make sure this fails when there is a problem
        quoteCurrency.sendTokens(this.sender, this.address, amount.mul(price))

        const order = new Order({
            maker: this.sender,
            amount,
            price,
        })

        const newBuyOrdersRoot = buyOrdersWitness.calculateRoot(order.hash())

        const newPair = new Pair({
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot: newBuyOrdersRoot,
            sellOrdersRoot,
        })

        const newPairsRoot = pairsWitness.calculateRoot(newPair.hash())

        this.root.set(newPairsRoot)
    }

    /**
     * Places a SELL order.
     */
    @method placeSellOrder(
        amount: UInt64,
        price: UInt64,
        baseCurrencyAddress: PublicKey,
        quoteCurrencyAddress: PublicKey,
        buyOrdersRoot: Field,
        sellOrdersWitness: OrdersWitness,
        pairsWitness: PairsWitness,
        authoritySignature: Signature
    ) {
        const sellOrdersRoot = sellOrdersWitness.calculateRoot(FIELD_ZERO)

        const pair = new Pair({
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot,
            sellOrdersRoot,
        })

        this.root.getAndAssertEquals().assertEquals(pairsWitness.calculateRoot(pair.hash()), Error.MistakenPair)

        authoritySignature
            .verify(this.authority.get(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                ...buyOrdersRoot.toFields(),
                ...sellOrdersWitness.toFields(),
                ...pairsWitness.toFields(),
            ])
            .assertTrue(Error.InvalidSignature)

        const baseCurrency = new Token(baseCurrencyAddress)

        //todo: make sure this fails when there is a problem
        baseCurrency.sendTokens(this.sender, this.address, amount.mul(price))

        const order = new Order({
            maker: this.sender,
            amount,
            price,
        })

        const newSellOrdersRoot = sellOrdersWitness.calculateRoot(order.hash())

        const newPair = new Pair({
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot,
            sellOrdersRoot: newSellOrdersRoot,
        })

        const newPairsRoot = pairsWitness.calculateRoot(newPair.hash())

        this.root.set(newPairsRoot)
    }

    /**
     * Cancels a BUY order.
     */
    @method cancelBuyOrder(
        amount: UInt64,
        price: UInt64,
        baseCurrencyAddress: PublicKey,
        quoteCurrencyAddress: PublicKey,
        buyOrdersWitness: OrdersWitness,
        sellOrdersRoot: Field,
        pairsWitness: PairsWitness,
        authoritySignature: Signature
    ) {
        const order = new Order({
            maker: this.sender,
            amount,
            price,
        })

        const buyOrdersRoot = buyOrdersWitness.calculateRoot(order.hash())

        const pair = new Pair({
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot: buyOrdersRoot,
            sellOrdersRoot,
        })

        this.root.getAndAssertEquals().assertEquals(pairsWitness.calculateRoot(pair.hash()), Error.MistakenPair)

        authoritySignature
            .verify(this.authority.get(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                ...buyOrdersWitness.toFields(),
                ...sellOrdersRoot.toFields(),
                ...pairsWitness.toFields(),
            ])
            .assertTrue(Error.InvalidSignature)

        const quoteCurrency = new Token(quoteCurrencyAddress)

        //todo: make sure this fails when there is a problem
        quoteCurrency.sendTokens(this.address, this.sender, amount.mul(price))

        const newBuyOrdersRoot = buyOrdersWitness.calculateRoot(FIELD_ZERO)

        const newPair = new Pair({
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot: newBuyOrdersRoot,
            sellOrdersRoot,
        })

        const newPairsRoot = pairsWitness.calculateRoot(newPair.hash())

        this.root.set(newPairsRoot)
    }

    /**
     * Cancels a SELL order.
     */
    @method cancelSellOrder(
        amount: UInt64,
        price: UInt64,
        baseCurrencyAddress: PublicKey,
        quoteCurrencyAddress: PublicKey,
        buyOrdersRoot: Field,
        sellOrdersWitness: OrdersWitness,
        pairsWitness: PairsWitness,
        authoritySignature: Signature
    ) {
        const order = new Order({
            maker: this.sender,
            amount,
            price,
        })

        const sellOrdersRoot = sellOrdersWitness.calculateRoot(order.hash())

        const pair = new Pair({
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot,
            sellOrdersRoot: sellOrdersRoot,
        })

        this.root.getAndAssertEquals().assertEquals(pairsWitness.calculateRoot(pair.hash()), Error.MistakenPair)

        authoritySignature
            .verify(this.authority.get(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                ...buyOrdersRoot.toFields(),
                ...sellOrdersWitness.toFields(),
                ...pairsWitness.toFields(),
            ])
            .assertTrue(Error.InvalidSignature)

        const baseCurrency = new Token(baseCurrencyAddress)

        //todo: make sure this fails when there is a problem
        baseCurrency.sendTokens(this.address, this.sender, amount.mul(price))

        const newSellOrdersRoot = sellOrdersWitness.calculateRoot(FIELD_ZERO)

        const newPair = new Pair({
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot,
            sellOrdersRoot: newSellOrdersRoot,
        })

        const newPairsRoot = pairsWitness.calculateRoot(newPair.hash())

        this.root.set(newPairsRoot)
    }
}
