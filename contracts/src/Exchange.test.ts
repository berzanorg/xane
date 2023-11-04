import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, Signature, UInt32, UInt64 } from 'o1js'
import { Exchange } from './Exchange'
import { Token } from './Token'



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

    const txToDeployTokenOne = await Mina.transaction(deployerPublicKey, () => {
      AccountUpdate.fundNewAccount(deployerPublicKey)
      tokenOneZkAppInstance.deploy({
        verificationKey: tokenOneZkAppverificationKey,
        zkappKey: tokenOneZkAppPrivateKey
      })
    })
    await txToDeployTokenOne.prove()
    await txToDeployTokenOne.sign([deployerPrivateKey]).send()


    // Deploy token two zkApp.
    tokenTwoZkAppPrivateKey = PrivateKey.random()
    tokenTwoZkAppPublicKey = tokenTwoZkAppPrivateKey.toPublicKey()
    tokenTwoZkAppInstance = new Token(tokenTwoZkAppPublicKey)
    tokenTwoZkAppverificationKey = tokenOneZkAppverificationKey // They are different instances of the same smart contract. So their verification key is the same.

    const txToDeployTokenTwo = await Mina.transaction(deployerPublicKey, () => {
      AccountUpdate.fundNewAccount(deployerPublicKey)
      tokenTwoZkAppInstance.deploy({
        verificationKey: tokenTwoZkAppverificationKey,
        zkappKey: tokenTwoZkAppPrivateKey
      })
    })
    await txToDeployTokenTwo.prove()
    await txToDeployTokenTwo.sign([deployerPrivateKey]).send()


    // Initialize the metadata of token one.
    const txToInitializeTokenOneMetadata = await Mina.transaction(deployerPublicKey, () => {
      const ticker = Field.from(777) //todo: create a field that represents a string
      const name = Field.from(777) //todo: create a field that represents a string
      const decimals = UInt32.from(8)
      const supplyMaximum = UInt64.from(100_000_000 * Math.pow(10, 8))

      const adminSignature = Signature.create(
        tokenOneZkAppPrivateKey,
        ticker.toFields().concat(name.toFields()).concat(decimals.toFields()).concat(supplyMaximum.toFields())
      )

      tokenOneZkAppInstance.initMetadata(ticker, name, decimals, supplyMaximum, adminSignature)
    })
    await txToInitializeTokenOneMetadata.prove()
    await txToInitializeTokenOneMetadata.sign([deployerPrivateKey]).send()


    // Initialize the metadata of token two.
    const txToInitializeTokenTwoMetadata = await Mina.transaction(deployerPublicKey, () => {
      const ticker = Field.from(888) //todo: create a field that represents a string
      const name = Field.from(888) //todo: create a field that represents a string
      const decimals = UInt32.from(6)
      const supplyMaximum = UInt64.from(1_000_000_000 * Math.pow(10, 6))

      const adminSignature = Signature.create(
        tokenTwoZkAppPrivateKey,
        ticker.toFields().concat(name.toFields()).concat(decimals.toFields()).concat(supplyMaximum.toFields())
      )

      tokenTwoZkAppInstance.initMetadata(ticker, name, decimals, supplyMaximum, adminSignature)
    })
    await txToInitializeTokenTwoMetadata.prove()
    await txToInitializeTokenTwoMetadata.sign([deployerPrivateKey]).send()


    // Mint 100 token one to user 1.
    const txToMintTokenOne = await Mina.transaction(deployerPublicKey, () => {
      AccountUpdate.fundNewAccount(deployerPublicKey)
      const receiverAddress = user1PublicKey
      const amount = UInt64.from(100 * Math.pow(10, 8))
      const signature = Signature.create(
        tokenOneZkAppPrivateKey,
        receiverAddress.toFields().concat(amount.toFields())
      )
      tokenOneZkAppInstance.mintTokens(receiverAddress, amount, signature)
    })
    await txToMintTokenOne.prove()
    await txToMintTokenOne.sign([deployerPrivateKey]).send()


    // Mint 500 token two to user 2.
    const txToMintTokenTwo = await Mina.transaction(deployerPublicKey, () => {
      AccountUpdate.fundNewAccount(deployerPublicKey)
      const receiverAddress = user2PublicKey
      const amount = UInt64.from(500 * Math.pow(10, 6))
      const signature = Signature.create(
        tokenTwoZkAppPrivateKey,
        receiverAddress.toFields().concat(amount.toFields())
      )
      tokenTwoZkAppInstance.mintTokens(receiverAddress, amount, signature)
    })
    await txToMintTokenTwo.prove()
    await txToMintTokenTwo.sign([deployerPrivateKey]).send()
  })



  it('can place orders', async () => {
    const tx = await Mina.transaction(user1PublicKey, () => {
      AccountUpdate.fundNewAccount(user1PublicKey)
      exchangeZkAppInstance.placeOrder(tokenOneZkAppPublicKey, tokenTwoZkAppPublicKey, UInt64.from(20 * Math.pow(10, 8)))
    })
    await tx.prove()
    await tx.sign([user1PrivateKey]).send()
  })
})
