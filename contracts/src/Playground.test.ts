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
    @method approveSend(amount: UInt64) {
        this.balance.subInPlace(amount)
    }
}

enum TokenError {
    MaxSupplyCannotBeExceeded = 'TOKEN: Max supply cannot be exceeded.',
}

class Token extends SmartContract {
    @state(UInt64) decimals = State<UInt64>()
    @state(UInt64) maxSupply = State<UInt64>()
    @state(UInt64) circulatingSupply = State<UInt64>()

    deploy(args: DeployArgs) {
        super.deploy(args)

        this.account.permissions.set({
            ...Permissions.default(),
            editState: Permissions.proofOrSignature(),
            access: Permissions.proofOrSignature(),
        })

        this.decimals.set(UInt64.from(3))
        this.maxSupply.set(UInt64.from(100_000_000))
        this.circulatingSupply.set(UInt64.from(0))
    }

    @method tokenDeploy(address: PublicKey, verificationKey: VerificationKey) {
        const tokenId = this.token.id
        const deployUpdate = AccountUpdate.defaultAccountUpdate(address, tokenId)
        this.approve(deployUpdate)
        deployUpdate.account.permissions.set(Permissions.default())
        deployUpdate.account.verificationKey.set(verificationKey)
        deployUpdate.requireSignature()
    }

    @method mint(receiver: PublicKey, amount: UInt64) {
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

    @method transfer(
        senderAddress: PublicKey,
        receiverAddress: PublicKey,
        amount: UInt64,
        callback: Experimental.Callback<any>
    ) {
        const senderAccountUpdate = this.approve(callback, AccountUpdate.Layout.AnyChildren)
        const negativeAmount = Int64.fromObject(senderAccountUpdate.body.balanceChange)
        negativeAmount.assertEquals(Int64.from(amount).neg())
        const tokenId = this.token.id
        senderAccountUpdate.body.tokenId.assertEquals(tokenId)
        senderAccountUpdate.body.publicKey.assertEquals(senderAddress)
        const receiverAccountUpdate = Experimental.createChildAccountUpdate(this.self, receiverAddress, tokenId)
        receiverAccountUpdate.balance.addInPlace(amount)
    }
}

describe('Token Contract', () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled })
    Mina.setActiveInstance(Local)

    const deployerPrivateKey: PrivateKey = Local.testAccounts[0].privateKey
    const deployerPublicKey: PublicKey = Local.testAccounts[0].publicKey

    const userPrivateKey: PrivateKey = Local.testAccounts[1].privateKey
    const userPublicKey: PublicKey = Local.testAccounts[1].publicKey

    const exchangeZkAppPrivateKey: PrivateKey = PrivateKey.random()
    const exchangeZkAppPublicKey: PublicKey = exchangeZkAppPrivateKey.toPublicKey()
    const exchange: Exchange = new Exchange(exchangeZkAppPublicKey)

    const tokenZkAppPrivateKey: PrivateKey = PrivateKey.random()
    const tokenZkAppPublicKey: PublicKey = tokenZkAppPrivateKey.toPublicKey()
    const token: Token = new Token(tokenZkAppPublicKey)

    let exchangeZkAppverificationKey: { data: string; hash: Field }
    let tokenZkAppverificationKey: { data: string; hash: Field }

    beforeAll(async () => {
        // we're compiling both contracts in parallel to finish earlier
        const results = await Promise.all([Exchange.compile(), Token.compile()])

        exchangeZkAppverificationKey = results[0].verificationKey
        tokenZkAppverificationKey = results[1].verificationKey
    })

    it('can deploy token', async () => {
        const tx = await Mina.transaction(userPublicKey, () => {
            AccountUpdate.fundNewAccount(userPublicKey)

            token.deploy({
                verificationKey: tokenZkAppverificationKey,
                zkappKey: tokenZkAppPrivateKey,
            })
        })

        await tx.prove()
        await tx.sign([userPrivateKey, tokenZkAppPrivateKey]).send()
    })

    it('can deploy exchange', async () => {
        const tx = await Mina.transaction(userPublicKey, () => {
            AccountUpdate.fundNewAccount(userPublicKey)
            token.tokenDeploy(exchangeZkAppPublicKey, exchangeZkAppverificationKey)
        })

        await tx.prove()
        await tx.sign([userPrivateKey, exchangeZkAppPrivateKey, tokenZkAppPrivateKey]).send()
    })

    it('can mint token', async () => {
        const supply = UInt64.from(21_000_000)

        const tx = await Mina.transaction(userPublicKey, () => {
            token.mint(exchange.address, supply)
        })

        await tx.prove()
        await tx.sign([userPrivateKey, tokenZkAppPrivateKey]).send()

        const bal = Mina.getBalance(exchange.address, token.token.id)

        expect(supply).toEqual(bal)
    })

    it('can transfer token', async () => {
        const amount = UInt64.from(10_000_000)

        const callback = Experimental.Callback.create(exchange, 'approveSend', [amount])

        const tx = await Mina.transaction(userPublicKey, () => {
            token.transfer(exchange.address, userPublicKey, amount, callback)
        })

        await tx.prove()
        await tx.sign([userPrivateKey, tokenZkAppPrivateKey]).send()

        expect(Mina.getBalance(exchange.address, token.token.id)).toEqual(amount.add(1_000_000))
    })
})
