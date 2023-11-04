import { DeployArgs, Field, MerkleTree, MerkleWitness, Permissions, Poseidon, PublicKey, SmartContract, State, Struct, UInt64, method, state } from "o1js"
import { Token } from "./Token"

class Account extends Struct({
    points: UInt64,
    publicKey: PublicKey,
}) {
    hash(): Field {
        return Poseidon.hash(Account.toFields(this))
    }

    addPoint(): Account {
        return new Account({
            points: this.points.add(1),
            publicKey: this.publicKey,
        })
    }
}

export let INITIAL_MERKLE_ROOT: Field = Field(0)

class ExchangeMerkleWitness extends MerkleWitness(8) { }

export class Exchange extends SmartContract {
    /**
     * Root of the merkle tree that stores all the placed orders.
     */
    @state(Field) merkleRoot = State<Field>()

    /** Deploys the smart contract. */
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
        this.merkleRoot.set(INITIAL_MERKLE_ROOT)
    }

    @method testingMethod(path: ExchangeMerkleWitness, account: Account) {
        // Get the merkle tree's root. 
        const merkleRoot = this.merkleRoot.getAndAssertEquals()

        // Require data to be within the merkle tree.
        path.calculateRoot(account.hash()).assertEquals(merkleRoot)

        const updatedAccount = account.addPoint()

        const newMerkleRoot = path.calculateRoot(updatedAccount.hash())

        this.merkleRoot.set(newMerkleRoot)
    }


    @method placeOrder(tokenToSellContractAddress: PublicKey, tokenToGetContractAddress: PublicKey, amount: UInt64) {
        const tokenToSell = new Token(tokenToSellContractAddress)

        tokenToSell.sendTokens(this.sender, this.address, amount)
    }
}