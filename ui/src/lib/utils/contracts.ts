import { AccountUpdate, Mina, PrivateKey, PublicKey, } from "o1js"
import { Token } from "xane-contracts"
import { wallet } from "$lib/stores/wallet"
//import verificationKey2 from './verificationKey.json'

interface CreateTokenArgs {
    signer: string | null
    ticker: string
    name: string
    decimals: number
    supplyMaximum: bigint
}


export const createToken = async (args: CreateTokenArgs) => {
    if (args.signer === null) return

    const signer = PublicKey.fromBase58(args.signer)


    console.log('compilation started')
    const { verificationKey } = await Token.compile()
    console.log('compilation complete')


    const zkAppPrivateKey = PrivateKey.random()
    const zkAppPublicKey = zkAppPrivateKey.toPublicKey()
    // const adminSignature = Signature.create(
    //     zkAppPrivateKey,
    //     ticker.toFields().concat(name.toFields()).concat(decimals.toFields()).concat(supplyMaximum.toFields())
    // )

    const tx = await Mina.transaction(signer, () => {
        const token = new Token(zkAppPublicKey)
        AccountUpdate.fundNewAccount(signer)
        token.deploy({ verificationKey, zkappKey: zkAppPrivateKey })
    })
    await tx.prove()

    const tx2 = tx.sign([zkAppPrivateKey])

    await wallet.sendTransaction(tx2.toJSON())

    return



    // const contractPrivateKey = PrivateKey.random()
    // const contractPublicKey = contractPrivateKey.toPublicKey()
    // const contractInstance = new Token(contractPublicKey)

    // const { verificationKey } = await Token.compile()

    // const txnToDeploy = await Mina.transaction(signer, () => {
    //     AccountUpdate.fundNewAccount(signer)
    //     contractInstance.deploy({ verificationKey, zkappKey: contractPrivateKey })
    // })

    // await txnToDeploy.prove()

    // const a = await wallet.sendTransaction(txnToDeploy.toJSON())

    // console.log(a)

    // return
    // const ticker = Field.from(0)
    // const name = Field.from(0)
    // const decimals = UInt32.from(args.decimals)
    // const supplyMaximum = UInt64.from(args.supplyMaximum)
    // const adminSignature = Signature.create(
    //     contractPrivateKey,
    //     ticker.toFields().concat(name.toFields()).concat(decimals.toFields()).concat(supplyMaximum.toFields())
    // )



    // const txnToInit = await Mina.transaction(signer, () => {
    //     contractInstance.initMetadata(ticker, name, decimals, supplyMaximum, adminSignature)
    // })

    // const txns = {
    //     deployTransaction: txnToDeploy.toJSON(),
    //     initTransaction: txnToInit.toJSON(),
    // }

    // console.log(txns)

    // await wallet.sendTransaction(txns.deployTransaction)
    // await wallet.sendTransaction(txns.initTransaction)
}