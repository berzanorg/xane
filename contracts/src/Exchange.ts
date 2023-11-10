import { DeployArgs, Field, MerkleMap, MerkleMapWitness, Permissions, Poseidon, Provable, PublicKey, SmartContract, State, Struct, UInt64, method, state } from "o1js"
import { Token } from "./Token"





/**
 * It represents a pair.
 */
class Pair extends Struct({
    tokenAddressOne: PublicKey,
    tokenAddressTwo: PublicKey,
    tempValue: Field
}) {
    /**
     * Hash of the key of the `Pair`.
     */
    keyHash(): Field {
        // calculate hashes of two tokens separately.
        const hashOne = Poseidon.hash(this.tokenAddressOne.toFields())
        const hashTwo = Poseidon.hash(this.tokenAddressTwo.toFields())

        // no matter in what order tokens are given, always get them in the same order by comparing.
        const greaterHash = Provable.if(hashOne.greaterThan(hashTwo), hashOne, hashTwo)
        const lowerHash = Provable.if(hashOne.greaterThan(hashTwo), hashTwo, hashOne)

        // we can't allow a pair where both sides are the same token.
        greaterHash.assertNotEquals(lowerHash)

        // return hash of both tokens.
        return Poseidon.hash([greaterHash, lowerHash])
    }

    /**
     * Hash of the value of the `Pair`.
     */
    valueHash(): Field {
        return Poseidon.hash([this.tempValue])
    }
}

/**
 * Initial value as the root of an empty `MerkleMap`.
 */
export let INITIAL_MERKLE_ROOT: Field = new MerkleMap().getRoot()


/**
 * An order book decentralized exchange that allows trading of tokens.
 */
export class Exchange extends SmartContract {
    /**
     * Root of the merkle map that stores all the pairs.
     */
    @state(Field) root = State<Field>()

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

    @method init() {
        super.init()
        this.root.set(INITIAL_MERKLE_ROOT)
    }


    @method addNewPair(path: MerkleMapWitness, pair: Pair) {
        const root = this.root.getAndAssertEquals()
        const [computedRoot, computedKey] = path.computeRootAndKey(Field(0))

        // require that roots are the same.
        root.assertEquals(computedRoot)

        // require that the pair isn't created yet.
        pair.keyHash().assertEquals(computedKey)

        const [newRoot] = path.computeRootAndKey(pair.valueHash())

        this.root.set(newRoot)
    }

    @method placeOrder(tokenToSellContractAddress: PublicKey, tokenToGetContractAddress: PublicKey, amount: UInt64) {
        const tokenToSell = new Token(tokenToSellContractAddress)

        tokenToSell.sendTokens(this.sender, this.address, amount)
    }
}


