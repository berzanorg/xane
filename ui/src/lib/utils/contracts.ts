import { AccountUpdate, Mina, PrivateKey, PublicKey, UInt64, } from "o1js"
import { Token, utils } from "xane-contracts"
import { wallet } from "$lib/stores/wallet"
import verificationKey from './verificationKey.json'

interface DeployTokenArgs {
    signer: string
    supply: number
    ticker: string
    name: string
}




export const deployTokenContract = async (args: DeployTokenArgs) => {
    const signer = PublicKey.fromBase58(args.signer)
    const contractPrivateKey = PrivateKey.random()
    const contractPublicKey = contractPrivateKey.toPublicKey()
    const contract = new Token(contractPublicKey)

    const name = utils.stringToField(args.name)
    const ticker = utils.stringToField(args.ticker)
    const supply = UInt64.from(args.ticker)

    let tx = await Mina.transaction(signer, () => {
        AccountUpdate.fundNewAccount(signer)
        AccountUpdate.fundNewAccount(signer)
        contract.deploy({
            verificationKey,
            zkappKey: contractPrivateKey,
            name,
            supply,
            ticker,
        })
    })

    await tx.prove()

    tx = tx.sign([contractPrivateKey])

    const hash = await wallet.sendTransaction(tx.toJSON())

    return hash
}