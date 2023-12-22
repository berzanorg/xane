import {
    AccountUpdate,
    DeployArgs,
    Experimental,
    Field,
    Int64,
    Permissions,
    PublicKey,
    State,
    VerificationKey,
    state,
    SmartContract,
    UInt64,
    method,
} from 'o1js'

export class Exchange extends SmartContract {
    @method approveZkapp(amount: UInt64) {
        this.balance.subInPlace(amount)
    }
}

enum TokenError {
    MaxSupplyCannotBeExceeded = 'TOKEN: Max supply cannot be exceeded.',
}

export class Token extends SmartContract {
    @state(UInt64) decimals = State<UInt64>()
    @state(UInt64) maxSupply = State<UInt64>()
    @state(UInt64) circulatingSupply = State<UInt64>()

    deploy(args: DeployArgs & {}) {
        super.deploy(args)

        this.account.permissions.set({
            ...Permissions.default(),
            editState: Permissions.proofOrSignature(),
            receive: Permissions.proof(),
            access: Permissions.proofOrSignature(),
        })

        this.decimals.set(UInt64.from(3))
        this.maxSupply.set(UInt64.from(100_000_000))
        this.circulatingSupply.set(UInt64.from(0))
    }

    @method mint(receiver: PublicKey, amount: UInt64) {
        let maxSupply = this.maxSupply.getAndRequireEquals()
        let circulatingSupply = this.circulatingSupply.getAndRequireEquals()

        let newCirculatingSupply = circulatingSupply.add(amount)

        newCirculatingSupply.assertLessThanOrEqual(maxSupply, TokenError.MaxSupplyCannotBeExceeded)

        this.token.mint({
            address: receiver,
            amount,
        })

        this.circulatingSupply.set(newCirculatingSupply)
    }

    @method burn(burner: PublicKey, amount: UInt64) {
        let circulatingSupply = this.circulatingSupply.getAndRequireEquals()

        let newCirculatingSupply = circulatingSupply.sub(amount)

        this.token.burn({
            address: burner,
            amount,
        })

        this.circulatingSupply.set(newCirculatingSupply)
    }

    @method transfer(sender: PublicKey, receiver: PublicKey, amount: UInt64, callback: Experimental.Callback<any>) {
        const tokenId = this.token.id
        const layout = AccountUpdate.Layout.NoChildren

        const senderAccountUpdate = this.approve(callback, layout)
        const negativeAmount = Int64.fromObject(senderAccountUpdate.body.balanceChange)
        negativeAmount.assertEquals(Int64.from(amount).neg())

        senderAccountUpdate.body.tokenId.assertEquals(tokenId)
        senderAccountUpdate.body.publicKey.assertEquals(sender)

        const receiverAccountUpdate = Experimental.createChildAccountUpdate(this.self, receiver, tokenId)
        receiverAccountUpdate.balance.addInPlace(amount)
    }

    @method deployZkapp(address: PublicKey, verificationKey: VerificationKey) {
        let tokenId = this.token.id
        let zkapp = AccountUpdate.defaultAccountUpdate(address, tokenId)
        this.approve(zkapp)
        zkapp.account.permissions.set(Permissions.default())
        zkapp.account.verificationKey.set(verificationKey)
        zkapp.requireSignature()
    }
}
