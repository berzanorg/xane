import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, Signature, UInt32, UInt64, Encoding } from 'o1js'
import { Token } from './Token'


const proofsEnabled = false

describe('Token Contract', () => {
  let deployerPrivateKey: PrivateKey
  let deployerPublicKey: PublicKey

  let zkAppInstance: Token
  let zkAppPrivateKey: PrivateKey
  let zkAppPublicKey: PublicKey

  let verificationKey: { data: string, hash: Field }

  beforeAll(async () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled })
    Mina.setActiveInstance(Local)

    deployerPrivateKey = Local.testAccounts[0].privateKey
    deployerPublicKey = Local.testAccounts[0].publicKey

    zkAppPrivateKey = PrivateKey.random()
    zkAppPublicKey = zkAppPrivateKey.toPublicKey()
    zkAppInstance = new Token(zkAppPublicKey)

    verificationKey = (await Token.compile()).verificationKey
  })

  it('can create a new token', async () => {
    const ticker = Encoding.stringToFields('MY')[0]
    const name = Encoding.stringToFields('My Token')[0]
    const supply = UInt64.from(100_000_000)

    const tx = await Mina.transaction(deployerPublicKey, () => {
      AccountUpdate.fundNewAccount(deployerPublicKey)
      AccountUpdate.fundNewAccount(deployerPublicKey)
      zkAppInstance.deploy({ verificationKey, zkappKey: zkAppPrivateKey, ticker, name, supply })
    })

    await tx.prove()
    await tx.sign([deployerPrivateKey, zkAppPrivateKey]).send()
  })


  it('can send and receive tokens', async () => {
    const receiverAddress = PrivateKey.random().toPublicKey()
    const amount = UInt64.from(20_000_000)

    const tx = await Mina.transaction(deployerPublicKey, () => {
      AccountUpdate.fundNewAccount(deployerPublicKey)
      zkAppInstance.sendTokens(deployerPublicKey, receiverAddress, amount)
    })

    await tx.prove()
    await tx.sign([deployerPrivateKey]).send()

    expect(Mina.getBalance(deployerPublicKey, zkAppInstance.token.id)).toEqual(UInt64.from(80_000_000))
    expect(Mina.getBalance(receiverAddress, zkAppInstance.token.id)).toEqual(amount)
  })
})
