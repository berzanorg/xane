import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, Signature, UInt32, UInt64 } from 'o1js'
import { Exchange } from './Exchange'
import { Token } from './Token'
import { stringToField } from './utils'



const proofsEnabled = false

describe('Exchange Contract', () => {
  let deployerPrivateKey: PrivateKey
  let deployerPublicKey: PublicKey

  let user1PrivateKey: PrivateKey
  let user1PublicKey: PublicKey

  let user2PrivateKey: PrivateKey
  let user2PublicKey: PublicKey

  let exchangeZkAppInstance: Exchange
  let exchangeZkAppPrivateKey: PrivateKey
  let exchangeZkAppPublicKey: PublicKey
  let exchangeZkAppverificationKey: { data: string, hash: Field }

  let tokenOneZkAppInstance: Token
  let tokenOneZkAppPrivateKey: PrivateKey
  let tokenOneZkAppPublicKey: PublicKey
  let tokenOneZkAppverificationKey: { data: string, hash: Field }

  let tokenTwoZkAppInstance: Token
  let tokenTwoZkAppPrivateKey: PrivateKey
  let tokenTwoZkAppPublicKey: PublicKey
  let tokenTwoZkAppverificationKey: { data: string, hash: Field }



  beforeAll(async () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled })
    Mina.setActiveInstance(Local)

    deployerPrivateKey = Local.testAccounts[0].privateKey
    deployerPublicKey = Local.testAccounts[0].publicKey

    user1PrivateKey = Local.testAccounts[1].privateKey
    user1PublicKey = Local.testAccounts[1].publicKey

    user2PrivateKey = Local.testAccounts[2].privateKey
    user2PublicKey = Local.testAccounts[2].publicKey


    // Deploy exchange zkApp.
    exchangeZkAppPrivateKey = PrivateKey.random()
    exchangeZkAppPublicKey = exchangeZkAppPrivateKey.toPublicKey()
    exchangeZkAppInstance = new Exchange(exchangeZkAppPublicKey)
    exchangeZkAppverificationKey = (await Exchange.compile()).verificationKey

    const txToDeployExchange = await Mina.transaction(deployerPublicKey, () => {
      AccountUpdate.fundNewAccount(deployerPublicKey)
      exchangeZkAppInstance.deploy({
        verificationKey: exchangeZkAppverificationKey,
        zkappKey: exchangeZkAppPrivateKey
      })
    })
    await txToDeployExchange.prove()
    await txToDeployExchange.sign([deployerPrivateKey]).send()


    // Deploy token one zkApp.
    tokenOneZkAppPrivateKey = PrivateKey.random()
    tokenOneZkAppPublicKey = tokenOneZkAppPrivateKey.toPublicKey()
    tokenOneZkAppInstance = new Token(tokenOneZkAppPublicKey)
    tokenOneZkAppverificationKey = (await Token.compile()).verificationKey

    const txnTokenOne = await Mina.transaction(user1PublicKey, () => {
      AccountUpdate.fundNewAccount(user1PublicKey)
      AccountUpdate.fundNewAccount(user1PublicKey)

      const name = stringToField('ONE')
      const ticker = stringToField('Token One')
      const supply = UInt64.from(21_000_000)

      tokenOneZkAppInstance.deploy({
        verificationKey: tokenOneZkAppverificationKey,
        zkappKey: tokenOneZkAppPrivateKey,
        name,
        ticker,
        supply,
      })
    })
    await txnTokenOne.prove()
    await txnTokenOne.sign([user1PrivateKey]).send()


    // Deploy token two zkApp.
    tokenTwoZkAppPrivateKey = PrivateKey.random()
    tokenTwoZkAppPublicKey = tokenTwoZkAppPrivateKey.toPublicKey()
    tokenTwoZkAppInstance = new Token(tokenTwoZkAppPublicKey)
    tokenTwoZkAppverificationKey = tokenOneZkAppverificationKey // They are different instances of the same smart contract. So their verification key is the same.

    const txnTokenTwo = await Mina.transaction(user2PublicKey, () => {
      AccountUpdate.fundNewAccount(user2PublicKey)
      AccountUpdate.fundNewAccount(user2PublicKey)

      const name = stringToField('TWO')
      const ticker = stringToField('Token Two')
      const supply = UInt64.from(100_000_000)

      tokenTwoZkAppInstance.deploy({
        verificationKey: tokenTwoZkAppverificationKey,
        zkappKey: tokenTwoZkAppPrivateKey,
        name,
        ticker,
        supply
      })
    })
    await txnTokenTwo.prove()
    await txnTokenTwo.sign([user2PrivateKey]).send()
  })

  it('can place orders', async () => {
    const tx = await Mina.transaction(user1PublicKey, () => {
      AccountUpdate.fundNewAccount(user1PublicKey)
      exchangeZkAppInstance.placeOrder(tokenOneZkAppPublicKey, tokenTwoZkAppPublicKey, UInt64.from(200_000))
    })
    await tx.prove()
    await tx.sign([user1PrivateKey]).send()
  })
})
