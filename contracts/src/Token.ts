import { Bool, DeployArgs, Field, Permissions, PublicKey, Signature, SmartContract, State, UInt32, UInt64, method, state } from "o1js"

/**
 * This smart contract is a basic token standard.
 * 
 * This token standard will be used in development phase
 * 
 * When an official token standard is released, this smart contract will be unnecessary.
 */
export class Token extends SmartContract {
    /** This state makes sure token metadata can only be initialized once. */
    @state(Bool) isInitialized = State<Bool>()

    /** This state represents the ticker of the token. */
    @state(Field) ticker = State<Field>()

    /** This state represents the name of the token. */
    @state(Field) name = State<Field>()

    /** This state represents the denomination of the token. */
    @state(UInt32) decimals = State<UInt32>()

    /** This state represents the circulating supply of the token. */
    @state(UInt64) supplyCirculating = State<UInt64>()

    /** This state represents the maxium supply of the token. */
    @state(UInt64) supplyMaximum = State<UInt64>()

    /** Deploys the smart contract. */
    deploy(args: DeployArgs) {
        super.deploy(args)

        const permissionToEdit = Permissions.proof()

        this.account.permissions.set({
            ...Permissions.default(),
            editState: permissionToEdit,
            setTokenSymbol: permissionToEdit,
            send: permissionToEdit,
            receive: permissionToEdit,
        })
    }


    /** Initializes the token metadata. Can only be called once. */
    @method initMetadata(ticker: Field, name: Field, decimals: UInt32, supplyMaximum: UInt64, adminSignature: Signature) {
        // Requires that admin signed the inputs.
        adminSignature.verify(
            this.address,
            ticker.toFields().concat(name.toFields()).concat(decimals.toFields()).concat(supplyMaximum.toFields())
        ).assertTrue()

        const isInitialized = this.isInitialized.getAndAssertEquals()

        // Requires token metadata not to be initialized.
        isInitialized.assertFalse()

        // Initializes token metadata.
        this.ticker.set(ticker)
        this.name.set(name)
        this.decimals.set(decimals)
        this.supplyMaximum.set(supplyMaximum)
        this.supplyCirculating.set(UInt64.from(0))

        // Makes token initialized. 
        this.isInitialized.set(new Bool(true))
    }


    /** Mints given amount of tokens to the receiver address. */
    @method mintTokens(receiverAddress: PublicKey, amount: UInt64, adminSignature: Signature) {
        // Requires that admin signed the inputs.
        adminSignature.verify(
            this.address,
            receiverAddress.toFields().concat(amount.toFields())
        ).assertTrue()

        const supplyMaximum = this.supplyMaximum.getAndAssertEquals()
        const supplyCirculating = this.supplyCirculating.getAndAssertEquals()

        // Calculates the possibly new circulating supply by adding the given amount to the current circulating supply.  
        const possiblyNewSupplyCirculating = supplyCirculating.add(amount)

        // Requires the maxium supply is greater than or equal to the possible new circulating supply.
        supplyMaximum.assertGreaterThanOrEqual(possiblyNewSupplyCirculating)

        // Mints given amount of tokens to receiver.
        this.token.mint({ address: receiverAddress, amount })

        // Update the circulating supply.
        this.supplyCirculating.set(possiblyNewSupplyCirculating)
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

