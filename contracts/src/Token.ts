import {
    Bool,
    DeployArgs,
    Field,
    Permissions,
    PublicKey,
    Signature,
    SmartContract,
    State,
    UInt32,
    UInt64,
    method,
    state
} from "o1js"

interface CustomDeployArgs {
    name: Field
    ticker: Field
    supply: UInt64
}

/**
 * This smart contract is a basic token standard.
 * 
 * This token standard will be used in development phase
 * 
 * When an official token standard is released, this smart contract will be unnecessary.
 */
export class Token extends SmartContract {
    /** This state represents the name of the token. */
    @state(Field) name = State<Field>()

    /** This state represents the ticker of the token. */
    @state(Field) ticker = State<Field>()

    /** This state represents the supply of the token. */
    @state(UInt64) supply = State<UInt64>()

    /** Deploys the smart contract. */
    deploy(args: DeployArgs & CustomDeployArgs) {
        super.deploy(args)

        const permissionToEdit = Permissions.proof()

        this.account.permissions.set({
            ...Permissions.default(),
            editState: permissionToEdit,
            setTokenSymbol: permissionToEdit,
            send: permissionToEdit,
            receive: permissionToEdit,
        })

        this.name.set(args.name)
        this.ticker.set(args.ticker)
        this.supply.set(args.supply)

        this.token.mint({
            address: this.sender,
            amount: args.supply
        })
    }

    /** Sends given amount of tokens to the receiver address from the sender address. */
    @method sendTokens(senderAddress: PublicKey, receiverAddress: PublicKey, amount: UInt64) {
        // Sends given amount of tokens from sender to receiver.
        this.token.send({
            from: senderAddress,
            to: receiverAddress,
            amount
        })
    }
}

