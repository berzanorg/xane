import { DeployArgs, Permissions, PublicKey, Signature, SmartContract, State, UInt64, method, state } from "o1js"

export class TokenX extends SmartContract {
    @state(UInt64) totalAmountInCirculation = State<UInt64>();

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

    @method init() {
        super.init()
        this.account.tokenSymbol.set('TKNX')
        this.totalAmountInCirculation.set(UInt64.zero)
    }

    @method mint(
        receiverAddress: PublicKey,
        amount: UInt64,
        adminSignature: Signature,
    ) {
        let totalAmountInCirculation = this.totalAmountInCirculation.getAndAssertEquals()

        let newTotalAmountInCirculation = totalAmountInCirculation.add(amount)

        adminSignature.verify(
            this.address,
            amount.toFields().concat(receiverAddress.toFields())
        ).assertTrue()

        this.token.mint({
            address: receiverAddress,
            amount,
        })

        this.totalAmountInCirculation.set(newTotalAmountInCirculation)
    }

    @method sendTokens(
        senderAddress: PublicKey,
        receiverAddress: PublicKey,
        amount: UInt64
    ) {
        this.token.send({
            from: senderAddress,
            to: receiverAddress,
            amount,
        })
    }
}