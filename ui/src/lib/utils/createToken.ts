import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt32, UInt64 } from 'o1js'
import { Token } from 'xane-contracts'
import verificationKey from './verificationKey.json'
import { wallet } from '$lib/stores/wallet'


interface DeployTokenParams {
    signer: PublicKey
    ticker: string
    name: string
    decimals: number
    supplyMaximum: bigint
}

/** Creates a new token with given input. Returns transactions to be sent. */
export async function createToken(params: DeployTokenParams) {
    const contractPrivateKey = PrivateKey.random()
    const contractPublicKey = contractPrivateKey.toPublicKey()
    const contractInstance = new Token(contractPublicKey)


    const deployTx = await Mina.transaction(params.signer, () => {
        AccountUpdate.fundNewAccount(params.signer)
        contractInstance.deploy({ verificationKey, zkappKey: contractPrivateKey })
    })


    const ticker = Field.from(0)
    const name = Field.from(0)
    const decimals = UInt32.from(params.decimals)
    const supplyMaximum = UInt64.from(params.supplyMaximum)
    const adminSignature = await wallet.signFields(ticker.toFields().concat(name.toFields()).concat(decimals.toFields()).concat(supplyMaximum.toFields()))

    if (adminSignature === null) return

    const initMetadataTx = await Mina.transaction(params.signer, () => {
        contractInstance.initMetadata(ticker, name, decimals, supplyMaximum, adminSignature)
    })

    return {
        deployTransaction: deployTx.toJSON(),
        initMetadataTransaction: initMetadataTx.toJSON(),
    }

}