import { AccountUpdate, Encoding, Field, Mina, PrivateKey, UInt64 } from 'o1js'
import { Token } from './Token'

const proofsEnabled = false

describe('token test', () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled })
    Mina.setActiveInstance(Local)

    const userPrivkey = Local.testAccounts[0].privateKey
    const userPubkey = Local.testAccounts[0].publicKey

    const tokenPrivkey = PrivateKey.random()
    const tokenPubkey = tokenPrivkey.toPublicKey()
    const tokenZkapp = new Token(tokenPubkey)

    const SYMBOL = Encoding.stringToFields('BTC')[0]
    const DECIMALS = UInt64.from(9)
    const SUPPLY_MAX = UInt64.from(21_000_000_000_000_000n)
    const AMOUNT_MINT = UInt64.from(18_000_000_000_000_000n)
    const AMOUNT_TRANSFER = UInt64.from(7_000_000_000_000_000n)

    beforeAll(async () => {
        if (proofsEnabled) {
            await Token.compile()
        }
    })

    it('can deploy tokens', async () => {
        const tx = await Mina.transaction(userPubkey, () => {
            AccountUpdate.fundNewAccount(userPubkey)
            tokenZkapp.deploy()
        })
        await tx.prove()
        tx.sign([userPrivkey, tokenPrivkey])
        await tx.send()
        tokenZkapp.symbol.getAndRequireEquals().assertEquals(Field(0))
        tokenZkapp.decimals.getAndRequireEquals().assertEquals(UInt64.zero)
        tokenZkapp.maxSupply.getAndRequireEquals().assertEquals(UInt64.zero)
        tokenZkapp.circulatingSupply.getAndRequireEquals().assertEquals(UInt64.zero)
    })

    it('can initialize tokens', async () => {
        const tx = await Mina.transaction(userPubkey, () => {
            tokenZkapp.initialize(SYMBOL, DECIMALS, SUPPLY_MAX)
        })
        await tx.prove()
        tx.sign([userPrivkey, tokenPrivkey])
        await tx.send()
        tokenZkapp.symbol.getAndRequireEquals().assertEquals(SYMBOL)
        tokenZkapp.decimals.getAndRequireEquals().assertEquals(DECIMALS)
        tokenZkapp.maxSupply.getAndRequireEquals().assertEquals(SUPPLY_MAX)
        tokenZkapp.circulatingSupply.getAndRequireEquals().assertEquals(UInt64.from(0))
    })

    it('can mint tokens', async () => {
        const tx = await Mina.transaction(userPubkey, () => {
            AccountUpdate.fundNewAccount(userPubkey)
            tokenZkapp.mint(userPubkey, AMOUNT_MINT)
        })
        await tx.prove()
        tx.sign([userPrivkey, tokenPrivkey])
        await tx.send()
        Mina.getBalance(userPubkey, tokenZkapp.token.id).assertEquals(AMOUNT_MINT)
        tokenZkapp.circulatingSupply.getAndRequireEquals().assertEquals(AMOUNT_MINT)
    })

    it('can transfer tokens', async () => {
        const receiver = PrivateKey.random().toPublicKey()
        const tx = await Mina.transaction(userPubkey, () => {
            AccountUpdate.fundNewAccount(userPubkey)
            tokenZkapp.transfer(userPubkey, receiver, AMOUNT_TRANSFER)
        })
        await tx.prove()
        tx.sign([userPrivkey])
        await tx.send()
        Mina.getBalance(userPubkey, tokenZkapp.token.id).assertEquals(AMOUNT_MINT.sub(AMOUNT_TRANSFER))
        Mina.getBalance(receiver, tokenZkapp.token.id).assertEquals(AMOUNT_TRANSFER)
    })

    it("can't transfer tokens when signature is not valid", async () => {
        const receiver = PrivateKey.random().toPublicKey()
        const anyOtherPrivateKey = PrivateKey.random()
        const tx = await Mina.transaction(userPubkey, () => {
            AccountUpdate.fundNewAccount(userPubkey)
            tokenZkapp.transfer(userPubkey, receiver, AMOUNT_TRANSFER)
        })
        await tx.prove()
        tx.sign([anyOtherPrivateKey])
        expect(tx.send()).rejects.toThrow()
    })

    it("can't transfer tokens when balance is not enough", async () => {
        const receiver = PrivateKey.random().toPublicKey()
        const tx = await Mina.transaction(userPubkey, () => {
            AccountUpdate.fundNewAccount(userPubkey)
            tokenZkapp.transfer(userPubkey, receiver, SUPPLY_MAX)
        })
        await tx.prove()
        tx.sign([userPrivkey])
        expect(tx.send()).rejects.toThrow()
    })
})
