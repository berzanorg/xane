import {
    AccountUpdate,
    DeployArgs,
    Experimental,
    Field,
    Int64,
    Permissions,
    PublicKey,
    SmartContract,
    State,
    UInt64,
    method,
    state,
} from 'o1js'

export class Token extends SmartContract {
    @state(Field) symbol = State<Field>()
    @state(UInt64) decimals = State<UInt64>()
    @state(UInt64) maxSupply = State<UInt64>()
    @state(UInt64) circulatingSupply = State<UInt64>()
    @state(PublicKey) owner = State<PublicKey>()

    deploy(args?: DeployArgs) {
        super.deploy(args)

        this.account.permissions.set({
            ...Permissions.default(),
            access: Permissions.proofOrSignature(),
        })
    }

    @method initialize(symbol: Field, decimals: UInt64, maxSupply: UInt64) {
        this.symbol.set(symbol)
        this.decimals.set(decimals)
        this.maxSupply.set(maxSupply)
        this.owner.set(this.sender)
    }

    @method mint(receiver: PublicKey, amount: UInt64) {
        this.owner.getAndRequireEquals().assertEquals(this.sender)
        const maxSupply = this.maxSupply.getAndRequireEquals()
        const circulatingSupply = this.circulatingSupply.getAndRequireEquals()

        const newCirculatingSupply = circulatingSupply.add(amount)

        newCirculatingSupply.assertLessThanOrEqual(maxSupply)

        this.token.mint({
            address: receiver,
            amount,
        })

        this.circulatingSupply.set(newCirculatingSupply)
    }

    @method burn(burner: PublicKey, amount: UInt64) {
        const circulatingSupply = this.circulatingSupply.getAndRequireEquals()

        const newCirculatingSupply = circulatingSupply.sub(amount)

        this.token.burn({
            address: burner,
            amount,
        })

        this.circulatingSupply.set(newCirculatingSupply)
    }

    @method transfer(sender: PublicKey, receiver: PublicKey, amount: UInt64) {
        this.token.send({ from: sender, to: receiver, amount })
    }

    @method approveCallbackAndTransfer(
        sender: PublicKey,
        receiver: PublicKey,
        amount: UInt64,
        callback: Experimental.Callback<any>
    ) {
        const tokenId = this.token.id

        const senderAccountUpdate = this.approve(callback, AccountUpdate.Layout.AnyChildren)

        senderAccountUpdate.body.tokenId.assertEquals(tokenId)
        senderAccountUpdate.body.publicKey.assertEquals(sender)

        const negativeAmount = Int64.fromObject(senderAccountUpdate.body.balanceChange)
        negativeAmount.assertEquals(Int64.from(amount).neg())

        const receiverAccountUpdate = Experimental.createChildAccountUpdate(this.self, receiver, tokenId)
        receiverAccountUpdate.balance.addInPlace(amount)
    }

    @method approveUpdateAndTransfer(zkappUpdate: AccountUpdate, receiver: PublicKey, amount: UInt64) {
        // TODO: THIS IS INSECURE. The proper version has a prover error (compile != prove) that must be fixed
        this.approve(zkappUpdate, AccountUpdate.Layout.AnyChildren)

        // THIS IS HOW IT SHOULD BE DONE:
        // // approve a layout of two grandchildren, both of which can't inherit the token permission
        // let { StaticChildren, AnyChildren } = AccountUpdate.Layout;
        // this.approve(zkappUpdate, StaticChildren(AnyChildren, AnyChildren));
        // zkappUpdate.body.mayUseToken.parentsOwnToken.assertTrue();
        // let [grandchild1, grandchild2] = zkappUpdate.children.accountUpdates;
        // grandchild1.body.mayUseToken.inheritFromParent.assertFalse();
        // grandchild2.body.mayUseToken.inheritFromParent.assertFalse();

        // see if balance change cancels the amount sent
        const balanceChange = Int64.fromObject(zkappUpdate.body.balanceChange)
        balanceChange.assertEquals(Int64.from(amount).neg())

        const receiverAccountUpdate = Experimental.createChildAccountUpdate(this.self, receiver, this.token.id)
        receiverAccountUpdate.balance.addInPlace(amount)
    }

    @method approveUpdate(zkappUpdate: AccountUpdate) {
        this.approve(zkappUpdate)
        const balanceChange = Int64.fromObject(zkappUpdate.body.balanceChange)
        balanceChange.assertEquals(Int64.from(0))
    }

    // Instead, use `approveUpdate` method.
    // @method deployZkapp(address: PublicKey, verificationKey: VerificationKey) {
    //     let tokenId = this.token.id
    //     let zkapp = AccountUpdate.create(address, tokenId)
    //     zkapp.account.permissions.set(Permissions.default())
    //     zkapp.account.verificationKey.set(verificationKey)
    //     zkapp.requireSignature()
    // }
}
