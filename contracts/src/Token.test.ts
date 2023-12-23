import {
    AccountUpdate,
    DeployArgs,
    Encoding,
    Experimental,
    Field,
    Int64,
    Mina,
    Permissions,
    PrivateKey,
    PublicKey,
    SmartContract,
    State,
    UInt64,
    VerificationKey,
    method,
    state,
} from 'o1js'
import { Token } from './Token'

const proofsEnabled = false

const createRandomAccount = () => {
    const privateKey = PrivateKey.random()
    const publicKey = privateKey.toPublicKey()
    return {
        publicKey,
        privateKey,
    }
}

const Local = Mina.LocalBlockchain({ proofsEnabled })
Mina.setActiveInstance(Local)

const accounts = {
    token: createRandomAccount(),
    feePayer: Local.testAccounts[0],
    mainUser: Local.testAccounts[1],
    randomUser: createRandomAccount(),
}

const token = new Token(accounts.token.publicKey)

const { verificationKey: verificationKeyOfToken } = await Token.compile()

it('can deploy tokens', async () => {
    const tx = await Mina.transaction(accounts.feePayer.publicKey, () => {
        AccountUpdate.fundNewAccount(accounts.feePayer.publicKey)

        token.deploy({ verificationKey: verificationKeyOfToken })
    })

    await tx.prove()

    tx.sign([accounts.feePayer.privateKey, accounts.token.privateKey])

    await tx.send()

    expect(token.decimals.get()).toEqual(UInt64.zero)
    expect(token.symbol.get()).toEqual(Field(0))
    expect(token.maxSupply.get()).toEqual(UInt64.zero)
    expect(token.circulatingSupply.get()).toEqual(UInt64.zero)
})

it('can initialize tokens', async () => {
    const symbol = Encoding.stringToFields('MYT')[0]
    const decimals = UInt64.from(3)
    const maxSupply = UInt64.from(100_000_000)

    const tx = await Mina.transaction(accounts.feePayer.publicKey, () => {
        token.initialize(symbol, decimals, maxSupply)
    })

    await tx.prove()

    tx.sign([accounts.feePayer.privateKey, accounts.token.privateKey])

    await tx.send()

    expect(token.decimals.get()).toEqual(decimals)
    expect(token.symbol.get()).toEqual(symbol)
    expect(token.maxSupply.get()).toEqual(maxSupply)
    expect(token.circulatingSupply.get()).toEqual(UInt64.from(0))
})

it('can mint tokens', async () => {
    const amount = UInt64.from(100_000_000)
    const receiver = accounts.mainUser.publicKey

    const tx = await Mina.transaction(accounts.feePayer.publicKey, () => {
        AccountUpdate.fundNewAccount(accounts.feePayer.publicKey)
        token.mint(receiver, amount)
    })

    await tx.prove()

    tx.sign([accounts.feePayer.privateKey, accounts.token.privateKey])

    await tx.send()

    const receiverBalance = Mina.getBalance(receiver, token.token.id)
    expect(receiverBalance).toEqual(amount)
})

it('can transfer tokens', async () => {
    const senderStartingBalance = UInt64.from(100_000_000)
    const transferAmount = UInt64.from(10_000_000)
    const sender = accounts.mainUser.publicKey
    const receiver = accounts.randomUser.publicKey

    const senderPrivateKey = accounts.mainUser.privateKey

    const tx = await Mina.transaction(sender, () => {
        AccountUpdate.fundNewAccount(sender)
        token.transfer(sender, receiver, transferAmount)
    })

    await tx.prove()

    tx.sign([senderPrivateKey])

    await tx.send()

    const senderBalance = Mina.getBalance(sender, token.token.id)
    expect(senderBalance).toEqual(senderStartingBalance.sub(transferAmount))

    const receiverBalance = Mina.getBalance(receiver, token.token.id)
    expect(receiverBalance).toEqual(transferAmount)
})

it("can't transfer tokens when not signed by the sender", async () => {
    const transferAmount = UInt64.from(10_000_000)
    const sender = accounts.mainUser.publicKey
    const receiver = accounts.randomUser.publicKey

    const anyOtherPrivateKey = PrivateKey.random()

    const tx = await Mina.transaction(sender, () => {
        AccountUpdate.fundNewAccount(sender)
        token.transfer(sender, receiver, transferAmount)
    })

    await tx.prove()

    tx.sign([anyOtherPrivateKey])

    expect(tx.send()).rejects.toThrow()
})
