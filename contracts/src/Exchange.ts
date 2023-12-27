import { Token } from './Token.js'
import {
    DeployArgs,
    Field,
    MerkleTree,
    MerkleWitness,
    Permissions,
    Poseidon,
    PrivateKey,
    PublicKey,
    Signature,
    SmartContract,
    State,
    Struct,
    UInt64,
    method,
    state,
} from 'o1js'
import { Vault } from './Vault.js'

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

export class OrderWitness extends MerkleWitness(ORDERS_HEIGHT) {}
export class PairWitness extends MerkleWitness(PAIRS_HEIGHT) {}

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
    baseCurrency: PublicKey
    quoteCurrency: PublicKey
    buyOrdersRoot: Field
    sellOrdersRoot: Field
}

class Pair extends Struct({
    baseCurrency: PublicKey,
    quoteCurrency: PublicKey,
    buyOrdersRoot: Field,
    sellOrdersRoot: Field,
} satisfies StructLayout<PairObject>) {
    hash(): Field {
        return Poseidon.hash([
            ...this.baseCurrency.toFields(),
            ...this.quoteCurrency.toFields(),
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

    deploy(args?: DeployArgs) {
        super.deploy(args)
        this.account.permissions.set({
            ...Permissions.default(),
            editState: Permissions.proofOrSignature(),
            editActionState: Permissions.proofOrSignature(),
            incrementNonce: Permissions.proofOrSignature(),
            setVerificationKey: Permissions.none(),
            setPermissions: Permissions.proofOrSignature(),
            send: Permissions.proof(),
        })
    }

    initialize(authority: PublicKey) {
        this.authority.requireEquals(PublicKey.empty())
        this.root.set(new MerkleTree(PAIRS_HEIGHT).getRoot())
        this.authority.set(authority)
    }

    /**
     * Creates a new pair.
     */
    @method createPair(
        baseCurrency: PublicKey,
        quoteCurrency: PublicKey,
        pairWitness: PairWitness,
        authoritySignature: Signature
    ) {
        baseCurrency.equals(quoteCurrency).assertFalse(Errors.SameCurrencies)

        const pairsRoot = pairWitness.calculateRoot(FIELD_ZERO)
        this.root.getAndRequireEquals().assertEquals(pairsRoot, Errors.PairAlreadyExists)

        authoritySignature
            .verify(this.authority.getAndRequireEquals(), [
                ...baseCurrency.toFields(),
                ...quoteCurrency.toFields(),
                ...pairWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const emptyRoot = new MerkleTree(ORDERS_HEIGHT).getRoot()

        const pair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot: emptyRoot,
            sellOrdersRoot: emptyRoot,
        })

        const newPairsRoot = pairWitness.calculateRoot(pair.hash())

        this.root.set(newPairsRoot)
    }

    /**
     * Places a BUY order.
     */
    @method placeBuyOrder(
        amount: UInt64,
        price: UInt64,
        baseCurrency: PublicKey,
        quoteCurrency: PublicKey,
        buyOrderWitness: OrderWitness,
        sellOrdersRoot: Field,
        pairWitness: PairWitness,
        authoritySignature: Signature
    ) {
        const buyOrdersRoot = buyOrderWitness.calculateRoot(FIELD_ZERO)

        const pair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot,
            sellOrdersRoot,
        })

        const pairsRoot = pairWitness.calculateRoot(pair.hash())
        this.root.getAndRequireEquals().assertEquals(pairsRoot, Errors.MistakenPair)

        authoritySignature
            .verify(this.authority.getAndRequireEquals(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrency.toFields(),
                ...quoteCurrency.toFields(),
                ...sellOrdersRoot.toFields(),
                ...buyOrderWitness.toFields(),
                ...pairWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const quoteToken = new Token(quoteCurrency)

        quoteToken.transfer(this.sender, this.address, amount.mul(price))

        const order = new Order({
            maker: this.sender,
            amount,
            price,
        })

        const newBuyOrdersRoot = buyOrderWitness.calculateRoot(order.hash())

        const newPair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot: newBuyOrdersRoot,
            sellOrdersRoot,
        })

        const newPairsRoot = pairWitness.calculateRoot(newPair.hash())

        this.root.set(newPairsRoot)
    }

    /**
     * Places a SELL order.
     */
    @method placeSellOrder(
        amount: UInt64,
        price: UInt64,
        baseCurrency: PublicKey,
        quoteCurrency: PublicKey,
        buyOrdersRoot: Field,
        sellOrderWitness: OrderWitness,
        pairWitness: PairWitness,
        authoritySignature: Signature
    ) {
        const sellOrdersRoot = sellOrderWitness.calculateRoot(FIELD_ZERO)

        const pair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot,
            sellOrdersRoot,
        })

        const pairsRoot = pairWitness.calculateRoot(pair.hash())
        this.root.getAndRequireEquals().assertEquals(pairsRoot, Errors.MistakenPair)

        authoritySignature
            .verify(this.authority.getAndRequireEquals(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrency.toFields(),
                ...quoteCurrency.toFields(),
                ...buyOrdersRoot.toFields(),
                ...sellOrderWitness.toFields(),
                ...pairWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const baseToken = new Token(baseCurrency)

        baseToken.transfer(this.sender, this.address, amount)

        const order = new Order({
            maker: this.sender,
            amount,
            price,
        })

        const newSellOrdersRoot = sellOrderWitness.calculateRoot(order.hash())

        const newPair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot,
            sellOrdersRoot: newSellOrdersRoot,
        })

        const newPairsRoot = pairWitness.calculateRoot(newPair.hash())

        this.root.set(newPairsRoot)
    }

    /**
     * Cancels a BUY order.
     */
    @method cancelBuyOrder(
        amount: UInt64,
        price: UInt64,
        baseCurrency: PublicKey,
        quoteCurrency: PublicKey,
        buyOrderWitness: OrderWitness,
        sellOrdersRoot: Field,
        pairWitness: PairWitness,
        authoritySignature: Signature
    ) {
        const order = new Order({
            maker: this.sender,
            amount,
            price,
        })

        const buyOrdersRoot = buyOrderWitness.calculateRoot(order.hash())

        const pair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot: buyOrdersRoot,
            sellOrdersRoot,
        })

        const pairsRoot = pairWitness.calculateRoot(pair.hash())
        this.root.getAndRequireEquals().assertEquals(pairsRoot, Errors.MistakenPair)

        authoritySignature
            .verify(this.authority.getAndRequireEquals(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrency.toFields(),
                ...quoteCurrency.toFields(),
                ...sellOrdersRoot.toFields(),
                ...buyOrderWitness.toFields(),
                ...pairWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const quoteToken = new Token(quoteCurrency)

        const vault = new Vault(this.address, quoteToken.token.id)
        vault.decrementBalance(amount.mul(price))
        quoteToken.approveUpdateAndTransfer(vault.self, this.sender, amount.mul(price))

        const newBuyOrdersRoot = buyOrderWitness.calculateRoot(FIELD_ZERO)

        const newPair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot: newBuyOrdersRoot,
            sellOrdersRoot,
        })

        const newPairsRoot = pairWitness.calculateRoot(newPair.hash())

        this.root.set(newPairsRoot)
    }

    /**
     * Cancels a SELL order.
     */
    @method cancelSellOrder(
        amount: UInt64,
        price: UInt64,
        baseCurrency: PublicKey,
        quoteCurrency: PublicKey,
        buyOrdersRoot: Field,
        sellOrderWitness: OrderWitness,
        pairWitness: PairWitness,
        authoritySignature: Signature
    ) {
        const order = new Order({
            maker: this.sender,
            amount,
            price,
        })

        const sellOrdersRoot = sellOrderWitness.calculateRoot(order.hash())

        const pair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot,
            sellOrdersRoot: sellOrdersRoot,
        })

        const pairsRoot = pairWitness.calculateRoot(pair.hash())
        this.root.getAndRequireEquals().assertEquals(pairsRoot, Errors.MistakenPair)

        authoritySignature
            .verify(this.authority.getAndRequireEquals(), [
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrency.toFields(),
                ...quoteCurrency.toFields(),
                ...buyOrdersRoot.toFields(),
                ...sellOrderWitness.toFields(),
                ...pairWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const baseToken = new Token(baseCurrency)

        const vault = new Vault(this.address, baseToken.token.id)
        vault.decrementBalance(amount)
        baseToken.approveUpdateAndTransfer(vault.self, this.sender, amount)

        const newSellOrdersRoot = sellOrderWitness.calculateRoot(FIELD_ZERO)

        const newPair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot,
            sellOrdersRoot: newSellOrdersRoot,
        })

        const newPairsRoot = pairWitness.calculateRoot(newPair.hash())

        this.root.set(newPairsRoot)
    }

    /**
     * Executes given BUY order.
     */
    @method executeBuyOrder(
        maker: PublicKey,
        amount: UInt64,
        price: UInt64,
        baseCurrency: PublicKey,
        quoteCurrency: PublicKey,
        buyOrderWitness: OrderWitness,
        sellOrdersRoot: Field,
        pairWitness: PairWitness,
        authoritySignature: Signature
    ) {
        const order = new Order({
            amount,
            price,
            maker,
        })

        const buyOrdersRoot = buyOrderWitness.calculateRoot(order.hash())

        const pair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot,
            sellOrdersRoot,
        })

        const pairsRoot = pairWitness.calculateRoot(pair.hash())
        this.root.getAndRequireEquals().assertEquals(pairsRoot, Errors.MistakenPair)

        authoritySignature
            .verify(this.authority.getAndRequireEquals(), [
                ...maker.toFields(),
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrency.toFields(),
                ...quoteCurrency.toFields(),
                ...sellOrdersRoot.toFields(),
                ...buyOrderWitness.toFields(),
                ...pairWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const baseToken = new Token(baseCurrency)
        const quoteToken = new Token(quoteCurrency)

        baseToken.transfer(this.sender, maker, amount)

        const vault = new Vault(this.address, quoteToken.token.id)
        vault.decrementBalance(amount.mul(price))
        quoteToken.approveUpdateAndTransfer(vault.self, this.sender, amount.mul(price))

        const newBuyOrdersRoot = buyOrderWitness.calculateRoot(FIELD_ZERO)

        const newPair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot: newBuyOrdersRoot,
            sellOrdersRoot,
        })

        const newPairsRoot = pairWitness.calculateRoot(newPair.hash())

        this.root.set(newPairsRoot)
    }

    /**
     * Executes given SELL order.
     */
    @method executeSellOrder(
        maker: PublicKey,
        amount: UInt64,
        price: UInt64,
        baseCurrency: PublicKey,
        quoteCurrency: PublicKey,
        buyOrdersRoot: Field,
        sellOrderWitness: OrderWitness,
        pairWitness: PairWitness,
        authoritySignature: Signature
    ) {
        const order = new Order({
            amount,
            price,
            maker,
        })

        const sellOrdersRoot = sellOrderWitness.calculateRoot(order.hash())

        const pair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot,
            sellOrdersRoot,
        })

        const pairsRoot = pairWitness.calculateRoot(pair.hash())
        this.root.requireEquals(pairsRoot)

        authoritySignature
            .verify(this.authority.getAndRequireEquals(), [
                ...maker.toFields(),
                ...amount.toFields(),
                ...price.toFields(),
                ...baseCurrency.toFields(),
                ...quoteCurrency.toFields(),
                ...buyOrdersRoot.toFields(),
                ...sellOrderWitness.toFields(),
                ...pairWitness.toFields(),
            ])
            .assertTrue(Errors.InvalidSignature)

        const quoteToken = new Token(quoteCurrency)
        const baseToken = new Token(baseCurrency)

        quoteToken.transfer(this.sender, maker, amount.mul(price))

        const vault = new Vault(this.address, baseToken.token.id)
        vault.decrementBalance(amount)
        baseToken.approveUpdateAndTransfer(vault.self, this.sender, amount)

        const newSellOrdersRoot = sellOrderWitness.calculateRoot(FIELD_ZERO)

        const newPair = new Pair({
            baseCurrency,
            quoteCurrency,
            buyOrdersRoot,
            sellOrdersRoot: newSellOrdersRoot,
        })

        const newPairsRoot = pairWitness.calculateRoot(newPair.hash())

        this.root.set(newPairsRoot)
    }
}
