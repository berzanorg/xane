import {
    Mina,
    PrivateKey,
    Encoding,
    Experimental,
    AccountUpdate,
    DeployArgs,
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

const proofsEnabled = false

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

describe('Token Contract', () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled })
    Mina.setActiveInstance(Local)

    const deployerPrivateKey: PrivateKey = Local.testAccounts[0].privateKey
    const deployerPublicKey: PublicKey = Local.testAccounts[0].publicKey

    const user1PrivateKey: PrivateKey = Local.testAccounts[1].privateKey
    const user1PublicKey: PublicKey = Local.testAccounts[1].publicKey

    const user2PrivateKey: PrivateKey = Local.testAccounts[2].privateKey
    const user2PublicKey: PublicKey = Local.testAccounts[2].publicKey

    const exchangeZkAppPrivateKey: PrivateKey = PrivateKey.random()
    const exchangeZkAppPublicKey: PublicKey = exchangeZkAppPrivateKey.toPublicKey()
    const exchange: Exchange = new Exchange(exchangeZkAppPublicKey)

    const tokenOneZkAppPrivateKey: PrivateKey = PrivateKey.random()
    const tokenOneZkAppPublicKey: PublicKey = tokenOneZkAppPrivateKey.toPublicKey()
    const token: Token = new Token(tokenOneZkAppPublicKey)

    let exchangeZkAppverificationKey: { data: string; hash: Field }
    let tokenZkAppverificationKey: { data: string; hash: Field }

    beforeAll(async () => {
        // we're compiling both contracts in parallel to finish earlier
        const results = await Promise.all([Exchange.compile(), Token.compile()])

        exchangeZkAppverificationKey = results[0].verificationKey
        tokenZkAppverificationKey = results[1].verificationKey
    })

    it('can create exchange', async () => {
        const tx = await Mina.transaction(deployerPublicKey, () => {
            AccountUpdate.fundNewAccount(deployerPublicKey)
            exchange.deploy({
                verificationKey: exchangeZkAppverificationKey,
                zkappKey: exchangeZkAppPrivateKey,
            })
        })

        await tx.prove()
        await tx.sign([deployerPrivateKey, exchangeZkAppPrivateKey]).send()
    })

    it('can deploy token', async () => {
        const tx = await Mina.transaction(user1PublicKey, () => {
            AccountUpdate.fundNewAccount(user1PublicKey)

            token.deploy({
                verificationKey: tokenZkAppverificationKey,
                zkappKey: tokenOneZkAppPrivateKey,
            })
        })

        await tx.prove()
        await tx.sign([user1PrivateKey, tokenOneZkAppPrivateKey]).send()
    })

    it('can mint token', async () => {
        const supply = UInt64.from(21_000_000)

        const tx = await Mina.transaction(user1PublicKey, () => {
            AccountUpdate.fundNewAccount(user1PublicKey)

            token.mint(exchange.address, supply)
        })

        await tx.prove()
        await tx.sign([user1PrivateKey, tokenOneZkAppPrivateKey]).send()

        const bal = Mina.getBalance(exchange.address, token.token.id)

        expect(supply).toEqual(bal)
    })

    // YOU CAN UNCOMMENT BELOW, BUT IT WON'T MAKE ANY DIFFERENCE

    // it('can deploy zkapp token', async () => {
    //     const tx = await Mina.transaction(user2PublicKey, () => {
    //         token.deployZkapp(exchangeZkAppPublicKey, exchangeZkAppverificationKey)
    //     })

    //     await tx.prove()
    //     await tx.sign([user2PrivateKey, exchangeZkAppPrivateKey, tokenOneZkAppPrivateKey]).send()
    // })

    it('can transfer token', async () => {
        const amount = UInt64.from(10_000_000)

        const callback = Experimental.Callback.create(exchange, 'approveZkapp', [amount])

        const tx = await Mina.transaction(user2PublicKey, () => {
            AccountUpdate.fundNewAccount(user2PublicKey)

            token.transfer(exchange.address, user2PublicKey, amount, callback)
        })

        await tx.prove()
        await tx.sign([user2PrivateKey, tokenOneZkAppPrivateKey, exchangeZkAppPrivateKey]).send()

        expect(Mina.getBalance(exchange.address, token.token.id)).toEqual(amount.add(1_000_000))
        expect(Mina.getBalance(user2PublicKey, token.token.id)).toEqual(amount)
    })
})
