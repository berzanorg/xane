import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64, Encoding } from 'o1js'
import { Token } from './Token'

const proofsEnabled = false

describe('Token Contract', () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled })
    Mina.setActiveInstance(Local)

    const deployerPrivateKey: PrivateKey = Local.testAccounts[0].privateKey
    const deployerPublicKey: PublicKey = Local.testAccounts[0].publicKey
    const tokenZkAppPrivateKey: PrivateKey = PrivateKey.random()
    const tokenZkAppPublicKey: PublicKey = tokenZkAppPrivateKey.toPublicKey()
    const token: Token = new Token(tokenZkAppPublicKey)

    let verificationKey: { data: string; hash: Field }

    beforeAll(async () => {
        verificationKey = (await Token.compile()).verificationKey
    })

    it('can create a new token', async () => {
        const symbol = Encoding.stringToFields('MY')[0]
        const fixedSupply = UInt64.from(100_000_000)

        const tx = await Mina.transaction(deployerPublicKey, () => {
            AccountUpdate.fundNewAccount(deployerPublicKey)
            AccountUpdate.fundNewAccount(deployerPublicKey)
            token.deploy({ verificationKey, zkappKey: tokenZkAppPrivateKey, symbol, fixedSupply })
        })

        await tx.prove()
        await tx.sign([deployerPrivateKey, tokenZkAppPrivateKey]).send()

        expect(token.fixedSupply.get()).toEqual(fixedSupply)
        expect(Mina.getBalance(deployerPublicKey, token.token.id)).toEqual(fixedSupply)
    })

    it('can send and receive tokens', async () => {
        const receiverAddress = PrivateKey.random().toPublicKey()
        const amount = UInt64.from(20_000_000)

        const tx = await Mina.transaction(deployerPublicKey, () => {
            AccountUpdate.fundNewAccount(deployerPublicKey)
            token.transfer(deployerPublicKey, receiverAddress, amount)
        })

        await tx.prove()
        await tx.sign([deployerPrivateKey]).send()

        expect(Mina.getBalance(deployerPublicKey, token.token.id)).toEqual(UInt64.from(80_000_000))
        expect(Mina.getBalance(receiverAddress, token.token.id)).toEqual(amount)
    })

    it("can't send and receive tokens if balance is not enough", async () => {
        try {
            const receiverAddress = PrivateKey.random().toPublicKey()
            const amount = UInt64.from(90_000_000)

            const tx = await Mina.transaction(deployerPublicKey, () => {
                AccountUpdate.fundNewAccount(deployerPublicKey)
                token.transfer(deployerPublicKey, receiverAddress, amount)
            })

            await tx.prove()
            await tx.sign([deployerPrivateKey]).send()

            throw 'this must have failed'
        } catch (error) {}
    })

    it("can't send and receive tokens if not signed by the sender", async () => {
        try {
            const receiverAddress = PrivateKey.random().toPublicKey()
            const amount = UInt64.from(10_000_000)

            const tx = await Mina.transaction(deployerPublicKey, () => {
                AccountUpdate.fundNewAccount(deployerPublicKey)
                token.transfer(deployerPublicKey, receiverAddress, amount)
            })

            await tx.prove()
            await tx.sign([]).send()

            throw 'this must have failed'
        } catch (error) {}
    })
})
