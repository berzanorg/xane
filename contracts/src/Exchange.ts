import { DeployArgs, Field, Permissions, PublicKey, SmartContract, State, UInt64, method, state } from "o1js"
import { Token } from "./Token"

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


    @method placeOrder(tokenToSellContractAddress: PublicKey, tokenToGetContractAddress: PublicKey, amount: UInt64) {
        const tokenToSell = new Token(tokenToSellContractAddress)

        tokenToSell.sendTokens(this.sender, this.address, amount)
    }
}