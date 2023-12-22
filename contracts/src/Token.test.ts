import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64, Encoding, Experimental } from 'o1js'
import { Token } from './Token'

const proofsEnabled = false

describe('Token Contract', () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled })
    Mina.setActiveInstance(Local)

    const deployerPrivateKey: PrivateKey = Local.testAccounts[0].privateKey
    const deployerPublicKey: PublicKey = Local.testAccounts[0].publicKey

    const userPrivateKey: PrivateKey = Local.testAccounts[1].privateKey
    const userPublicKey: PublicKey = Local.testAccounts[1].publicKey

    const tokenZkAppPrivateKey: PrivateKey = PrivateKey.random()
    const tokenZkAppPublicKey: PublicKey = tokenZkAppPrivateKey.toPublicKey()

    const token: Token = new Token(tokenZkAppPublicKey)

    let verificationKey: { data: string; hash: Field }

    beforeAll(async () => {
        verificationKey = (await Token.compile()).verificationKey
    })

    it('can create a new token', async () => {
        const tx = await Mina.transaction(deployerPublicKey, () => {
            AccountUpdate.fundNewAccount(deployerPublicKey)
            token.deploy({ verificationKey, zkappKey: tokenZkAppPrivateKey })
        })

        await tx.prove()
        await tx.sign([deployerPrivateKey, tokenZkAppPrivateKey]).send()
    })

    it('can initialize token ', async () => {
        const symbol = Encoding.stringToFields('MYT')[0]
        const decimals = UInt64.from(3)
        const maxSupply = UInt64.from(100_000_000)

        const tx = await Mina.transaction(deployerPublicKey, () => {
            token.initialize(symbol, decimals, maxSupply)
        })

        await tx.prove()
        await tx.sign([deployerPrivateKey, tokenZkAppPrivateKey]).send()

        console.log(token.decimals.get().toString())

        expect(token.decimals.get()).toEqual(decimals)
        expect(token.symbol.get()).toEqual(symbol)
        expect(token.maxSupply.get()).toEqual(maxSupply)
        expect(token.circulatingSupply.get()).toEqual(UInt64.from(0))
    })

    it('can mint tokens', async () => {
        const receiverAddress = userPublicKey
        const amount = UInt64.from(50_000_000)

        const tx = await Mina.transaction(deployerPublicKey, () => {
            AccountUpdate.fundNewAccount(deployerPublicKey)
            token.mint(receiverAddress, amount)
        })

        await tx.prove()
        await tx.sign([deployerPrivateKey]).send()

        expect(Mina.getBalance(receiverAddress, token.token.id)).toEqual(amount)
    })

    it('can send and receive tokens', async () => {
        const sender = userPublicKey
        const receiver = PrivateKey.random().toPublicKey()
        const amount = UInt64.from(20_000_000)
        const remainingAmount = UInt64.from(80_000_000)

        const tx = await Mina.transaction(sender, () => {
            AccountUpdate.fundNewAccount(sender)
            token.transfer(sender, receiver, amount)
        })

        await tx.prove()
        await tx.sign([userPrivateKey]).send()

        expect(Mina.getBalance(receiver, token.token.id)).toEqual(amount)
        expect(Mina.getBalance(sender, token.token.id)).toEqual(remainingAmount)
    })

    it("can't send and receive tokens if balance is not enough", async () => {
        const receiverAddress = PrivateKey.random().toPublicKey()
        const amount = UInt64.from(90_000_000)

        const tx = await Mina.transaction(deployerPublicKey, () => {
            AccountUpdate.fundNewAccount(deployerPublicKey)
            token.transfer(deployerPublicKey, receiverAddress, amount)
        })

        await tx.prove()
        await tx.sign([deployerPrivateKey]).send()
    })

    it("can't send and receive tokens if not signed by the sender", async () => {
        const receiverAddress = PrivateKey.random().toPublicKey()
        const amount = UInt64.from(10_000_000)

        const tx = await Mina.transaction(deployerPublicKey, () => {
            AccountUpdate.fundNewAccount(deployerPublicKey)
            token.transfer(deployerPublicKey, receiverAddress, amount)
        })

        await tx.prove()
        await tx.sign([]).send()
    })
})
