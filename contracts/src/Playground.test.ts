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
    const Local = Mina.LocalBlockchain()
    Mina.setActiveInstance(Local)

    const feePayer = Local.testAccounts[0].privateKey
    const feePayerAddress = Local.testAccounts[0].publicKey

    const tokenZkAppKey = PrivateKey.random()
    const tokenZkAppAddress = tokenZkAppKey.toPublicKey()

    const exchangeKey = PrivateKey.random()
    const exchangeAddress = exchangeKey.toPublicKey()

    const tokenAccount1Key = PrivateKey.random()
    const tokenAccount1 = tokenAccount1Key.toPublicKey()

    const tokenZkApp = new Token(tokenZkAppAddress)
    const tokenId = tokenZkApp.token.id

    const zkAppB = new Exchange(exchangeAddress, tokenId)

    let exchangeVerificationKey: { data: string; hash: Field }
    let tokenVerificationKey: { data: string; hash: Field }

    const token: Token = new Token(tokenZkAppAddress)

    beforeAll(async () => {
        // we're compiling both contracts in parallel to finish earlier
        const results = await Promise.all([Exchange.compile(), Token.compile()])

        exchangeVerificationKey = results[0].verificationKey
        tokenVerificationKey = results[1].verificationKey
    })

    it('can deploy token', async () => {
        const tx = await Mina.transaction(feePayerAddress, () => {
            AccountUpdate.fundNewAccount(feePayerAddress)

            token.deploy({
                verificationKey: tokenVerificationKey,
                zkappKey: tokenZkAppKey,
            })
        })

        await tx.prove()
        await tx.sign([feePayer, tokenZkAppKey]).send()
    })

    it('can deploy exchange', async () => {
        const tx = await Mina.transaction(feePayerAddress, () => {
            AccountUpdate.fundNewAccount(feePayerAddress)
            token.tokenDeploy(exchangeAddress, exchangeVerificationKey)
        })

        await tx.prove()
        await tx.sign([feePayer, exchangeKey, tokenZkAppKey]).send()
    })

    it('can mint token', async () => {
        const amount = UInt64.from(21_000_000)

        const tx = await Mina.transaction(feePayerAddress, () => {
            token.mint(exchangeAddress, amount)
        })

        await tx.prove()
        await tx.sign([feePayer, tokenZkAppKey]).send()

        const bal = Mina.getBalance(exchangeAddress, token.token.id)

        expect(amount).toEqual(bal)
    })

    it('can transfer token', async () => {
        const amount = UInt64.from(10_000_000)

        const tx = await Mina.transaction(feePayerAddress, () => {
            const callback = Experimental.Callback.create(zkAppB, 'approveSend', [amount])
            AccountUpdate.fundNewAccount(feePayerAddress)
            token.transfer(exchangeAddress, tokenAccount1, amount, callback)
        })

        await tx.prove()
        await tx.sign([feePayer, tokenZkAppKey]).send()

        const bal1 = Mina.getBalance(exchangeAddress, tokenZkApp.token.id)
        expect(bal1).toEqual(UInt64.from(11_000_000))

        const bal2 = Mina.getBalance(tokenAccount1, tokenZkApp.token.id)
        expect(bal2).toEqual(UInt64.from(10_000_000))
    })
})
