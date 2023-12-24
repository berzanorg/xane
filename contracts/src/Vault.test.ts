import { AccountUpdate, Encoding, Mina, PrivateKey, UInt64 } from 'o1js'
import { Vault } from './Vault'
import { Token } from './Token'

const proofsEnabled = false

describe('token vault test', () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled })
    Mina.setActiveInstance(Local)

    const userPrivkey = Local.testAccounts[0].privateKey
    const userPubkey = Local.testAccounts[0].publicKey

    const tokenPrivkey = PrivateKey.random()
    const tokenPubkey = tokenPrivkey.toPublicKey()
    const tokenZkapp = new Token(tokenPubkey)

    const vaultPrivkey = PrivateKey.random()
    const vaultPubkey = vaultPrivkey.toPublicKey()
    const vaultZkapp = new Vault(vaultPubkey, tokenZkapp.token.id)

    const SYMBOL = Encoding.stringToFields('BTC')[0]
    const DECIMALS = UInt64.from(9)
    const SUPPLY_MAX = UInt64.from(21_000_000_000_000_000n)
    const AMOUNT_MINT = UInt64.from(20_000_000_000_000_000n)
    const AMOUNT_DEPOSIT = UInt64.from(5_000_000_000_000_000n)
    const AMOUNT_WITHDRAW = UInt64.from(3_000_000_000_000_000n)

    beforeAll(async () => {
        if (proofsEnabled) {
            await Vault.compile()
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

    it('can deploy vaults', async () => {
        const tx = await Mina.transaction(userPubkey, () => {
            AccountUpdate.fundNewAccount(userPubkey)
            vaultZkapp.deploy()
            tokenZkapp.approveUpdate(vaultZkapp.self)
        })
        await tx.prove()
        tx.sign([userPrivkey, vaultPrivkey])
        await tx.send()
    })

    it('can deposit tokens into vaults', async () => {
        const tx = await Mina.transaction(userPubkey, () => {
            tokenZkapp.transfer(userPubkey, vaultPubkey, AMOUNT_DEPOSIT)
        })
        await tx.prove()
        tx.sign([userPrivkey])
        await tx.send()
        Mina.getBalance(userPubkey, tokenZkapp.token.id).assertEquals(AMOUNT_MINT.sub(AMOUNT_DEPOSIT))
        Mina.getBalance(vaultPubkey, tokenZkapp.token.id).assertEquals(AMOUNT_DEPOSIT)
    })

    it('can withdraw tokens from vaults', async () => {
        const tx = await Mina.transaction(userPubkey, () => {
            vaultZkapp.decrementBalance(AMOUNT_WITHDRAW)
            tokenZkapp.approveUpdateAndTransfer(vaultZkapp.self, userPubkey, AMOUNT_WITHDRAW)
        })
        await tx.prove()
        tx.sign([userPrivkey])
        await tx.send()
        Mina.getBalance(userPubkey, tokenZkapp.token.id).assertEquals(
            AMOUNT_MINT.sub(AMOUNT_DEPOSIT).add(AMOUNT_WITHDRAW)
        )
        Mina.getBalance(vaultPubkey, tokenZkapp.token.id).assertEquals(AMOUNT_DEPOSIT.sub(AMOUNT_WITHDRAW))
    })
})
