import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, Signature, UInt32, UInt64 } from 'o1js'
import { Token } from './Token'


const proofsEnabled = false

describe('Token Contract', () => {
  let deployerPrivateKey: PrivateKey
  let deployerPublicKey: PublicKey

  let zkAppInstance: Token
  let zkAppPrivateKey: PrivateKey
  let zkAppPublicKey: PublicKey

  let verificationKey: { data: string, hash: Field }

  let user1PrivateKey: PrivateKey
  let user1PublicKey: PublicKey

  let user2PrivateKey: PrivateKey
  let user2PublicKey: PublicKey

  beforeAll(async () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled })
    Mina.setActiveInstance(Local)

    deployerPrivateKey = Local.testAccounts[0].privateKey
    deployerPublicKey = Local.testAccounts[0].publicKey

    user1PrivateKey = Local.testAccounts[1].privateKey
    user1PublicKey = Local.testAccounts[1].publicKey

    user2PrivateKey = Local.testAccounts[2].privateKey
    user2PublicKey = Local.testAccounts[2].publicKey

    zkAppPrivateKey = PrivateKey.random()
    zkAppPublicKey = zkAppPrivateKey.toPublicKey()
    zkAppInstance = new Token(zkAppPublicKey)

    verificationKey = (await Token.compile()).verificationKey

    const tx = await Mina.transaction(deployerPublicKey, () => {
      AccountUpdate.fundNewAccount(deployerPublicKey)
      zkAppInstance.deploy({ verificationKey, zkappKey: zkAppPrivateKey })
    })

    await tx.prove()
    await tx.sign([deployerPrivateKey]).send()
  })

  it('can initialize token metadata', async () => {
    const ticker = Field.from(777) //todo: create a field that represents a string
    const name = Field.from(777) //todo: create a field that represents a string
    const decimals = UInt32.from(8)
    const supplyMaximum = UInt64.from(100_000_000 * Math.pow(10, 8))

    const adminSignature = Signature.create(
      zkAppPrivateKey,
      ticker.toFields().concat(name.toFields()).concat(decimals.toFields()).concat(supplyMaximum.toFields())
    )

    const tx = await Mina.transaction(deployerPublicKey, () => {
      zkAppInstance.initMetadata(ticker, name, decimals, supplyMaximum, adminSignature)
    })

    await tx.prove()
    await tx.sign([deployerPrivateKey]).send()

    expect(zkAppInstance.ticker.get()).toEqual(ticker)
    expect(zkAppInstance.name.get()).toEqual(name)
    expect(zkAppInstance.decimals.get()).toEqual(decimals)
    expect(zkAppInstance.supplyMaximum.get()).toEqual(supplyMaximum)
    expect(zkAppInstance.supplyCirculating.get()).toEqual(UInt64.from(0))
  })

  it('can mint tokens', async () => {
    const receiverAddress = user1PublicKey
    const amount = UInt64.from(1_000_000 * Math.pow(10, 8))

    const adminSignature = Signature.create(
      zkAppPrivateKey,
      receiverAddress.toFields().concat(amount.toFields())
    )

    const tx = await Mina.transaction(deployerPublicKey, () => {
      AccountUpdate.fundNewAccount(deployerPublicKey)
      zkAppInstance.mintTokens(receiverAddress, amount, adminSignature)
    })

    await tx.prove()
    await tx.sign([deployerPrivateKey]).send()

    expect(Mina.getBalance(receiverAddress, zkAppInstance.token.id)).toEqual(amount)
  })

  it('can send and receive tokens', async () => {
    const senderAddress = user1PublicKey
    const receiverAddress = user2PublicKey
    const amount = UInt64.from(200_000 * Math.pow(10, 8))

    const tx = await Mina.transaction(user1PublicKey, () => {
      AccountUpdate.fundNewAccount(user1PublicKey)
      zkAppInstance.sendTokens(senderAddress, receiverAddress, amount)
    })

    await tx.prove()
    await tx.sign([user1PrivateKey]).send()

    expect(Mina.getBalance(senderAddress, zkAppInstance.token.id)).toEqual(UInt64.from(800_000 * Math.pow(10, 8)))
    expect(Mina.getBalance(receiverAddress, zkAppInstance.token.id)).toEqual(amount)
  })
})
