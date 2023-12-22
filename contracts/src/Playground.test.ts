import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64, Encoding, Experimental } from 'o1js'
import { Exchange, Token } from './Playground'

const proofsEnabled = false

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
