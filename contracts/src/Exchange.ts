import { Witness } from 'o1js/dist/node/lib/merkle_tree.js'
import { Token } from './Token.js'
import {
    DeployArgs,
    Field,
    MerkleTree,
    MerkleWitness,
    Permissions,
    Poseidon,
    PrivateKey,
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

// These are only for testing purposes.
export const AUTHORITY_PRIVATE_KEY = PrivateKey.fromBase58('EKEvp6bPR2D9BCQYPmKgTC9swtxok5JKQvsovNeffV7487SjkqPu')
export const AUTHORITY_PUBLIC_KEY = PublicKey.fromBase58('B62qqaK8H6CXjtFXMeHFk6WQxW7ynYiRMjCKKPCQimZCGucMTCzTj1i')

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

export const ORDERS_HEIGHT = 10
export const PAIRS_HEIGHT = 10

export class OrdersWitness extends MerkleWitness(ORDERS_HEIGHT) {}
export class PairsWitness extends MerkleWitness(PAIRS_HEIGHT) {}

export enum Errors {
    SameCurrencies = "A pair can't have the same currencies.",
    PairAlreadyExists = 'The pair already exists.',
    MistakenPair = 'The pair provided is mistaken.',
    InvalidSignature = 'The authority signature is not valid.',
}

export function getErrorMessage(error: any): string {
    const msg: string | undefined = error?.toString().split('Error: ').at(1)?.split('\n')[0]

    if (typeof msg === 'undefined') {
        console.error("Exchange conract's error message is unknown:")
        console.error(error)
        throw new Error("`getErrorMessage` function didn't work properly")
    } else {
        return msg
    }
}

export type PairObject = {
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

export type OrderObject = {
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
        this.authority.set(AUTHORITY_PUBLIC_KEY)
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
        baseCurrencyAddress.equals(quoteCurrencyAddress).assertFalse(Errors.SameCurrencies)

        const pairsRoot = pairsWitness.calculateRoot(FIELD_ZERO)
        this.root.getAndAssertEquals().assertEquals(pairsRoot, Errors.PairAlreadyExists)

        authoritySignature
            .verify(this.authority.getAndAssertEquals(), [
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                pairsWitness.calculateIndex(),
            ])
            .assertTrue(Errors.InvalidSignature)

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

        const pairsRoot = pairsWitness.calculateRoot(pair.hash())
        this.root.getAndAssertEquals().assertEquals(pairsRoot, Errors.MistakenPair)

        authoritySignature
            .verify(this.authority.getAndAssertEquals(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                ...buyOrdersWitness.toFields(),
                ...sellOrdersRoot.toFields(),
                ...pairsWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const quoteCurrency = new Token(quoteCurrencyAddress)

        // this fails inside when there is a problem
        quoteCurrency.transfer(this.sender, this.address, amount.mul(price))

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

        const pairsRoot = pairsWitness.calculateRoot(pair.hash())
        this.root.getAndAssertEquals().assertEquals(pairsRoot, Errors.MistakenPair)

        authoritySignature
            .verify(this.authority.getAndAssertEquals(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                ...buyOrdersRoot.toFields(),
                ...sellOrdersWitness.toFields(),
                ...pairsWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const baseCurrency = new Token(baseCurrencyAddress)

        // this fails inside when there is a problem
        baseCurrency.transfer(this.sender, this.address, amount)

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

        const pairsRoot = pairsWitness.calculateRoot(pair.hash())
        this.root.getAndAssertEquals().assertEquals(pairsRoot, Errors.MistakenPair)

        authoritySignature
            .verify(this.authority.getAndAssertEquals(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                ...buyOrdersWitness.toFields(),
                ...sellOrdersRoot.toFields(),
                ...pairsWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const quoteCurrency = new Token(quoteCurrencyAddress)

        // this fails inside when there is a problem
        quoteCurrency.transfer(this.address, this.sender, amount.mul(price))

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

        const pairsRoot = pairsWitness.calculateRoot(pair.hash())
        this.root.getAndAssertEquals().assertEquals(pairsRoot, Errors.MistakenPair)

        authoritySignature
            .verify(this.authority.getAndAssertEquals(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                ...buyOrdersRoot.toFields(),
                ...sellOrdersWitness.toFields(),
                ...pairsWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const baseCurrency = new Token(baseCurrencyAddress)

        // this fails inside when there is a problem
        baseCurrency.transfer(this.address, this.sender, amount)

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

    /**
     * Executes given BUY order.
     */
    @method executeBuyOrder(
        maker: PublicKey,
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
            amount,
            price,
            maker,
        })

        const buyOrdersRoot = buyOrdersWitness.calculateRoot(order.hash())

        const pair = new Pair({
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot,
            sellOrdersRoot,
        })

        const pairsRoot = pairsWitness.calculateRoot(pair.hash())
        this.root.getAndAssertEquals().assertEquals(pairsRoot, Errors.MistakenPair)

        authoritySignature
            .verify(this.authority.getAndAssertEquals(), [
                ...maker.toFields(),
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                ...buyOrdersWitness.toFields(),
                ...sellOrdersRoot.toFields(),
                ...pairsWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const baseCurrency = new Token(baseCurrencyAddress)
        const quoteCurrency = new Token(quoteCurrencyAddress)

        // this fails inside when there is a problem
        baseCurrency.transfer(this.sender, maker, amount)
        // this fails inside when there is a problem
        quoteCurrency.transfer(this.address, this.sender, amount.mul(price))

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
     * Executes given SELL order.
     */
    @method executeSellOrder(
        maker: PublicKey,
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
            amount,
            price,
            maker,
        })

        const sellOrdersRoot = sellOrdersWitness.calculateRoot(order.hash())

        const pair = new Pair({
            baseCurrencyAddress,
            quoteCurrencyAddress,
            buyOrdersRoot,
            sellOrdersRoot,
        })

        const pairsRoot = pairsWitness.calculateRoot(pair.hash())
        this.root.getAndAssertEquals().assertEquals(pairsRoot, Errors.MistakenPair)

        authoritySignature
            .verify(this.authority.getAndAssertEquals(), [
                ...maker.toFields(),
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrencyAddress.toFields(),
                ...quoteCurrencyAddress.toFields(),
                ...buyOrdersRoot.toFields(),
                ...sellOrdersWitness.toFields(),
                ...pairsWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const quoteCurrency = new Token(quoteCurrencyAddress)
        const baseCurrency = new Token(baseCurrencyAddress)

        // this fails inside when there is a problem
        quoteCurrency.transfer(this.sender, maker, amount.mul(price))
        // this fails inside when there is a problem
        baseCurrency.transfer(this.address, this.sender, amount)

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
