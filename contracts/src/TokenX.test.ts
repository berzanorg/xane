import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, Signature, UInt64 } from "o1js"
import { TokenX } from "./TokenX"

let proofsEnabled = false

describe('TokenX', () => {
    let deployerPrivateKey: PrivateKey
    let deployerPublicKey: PublicKey
    let zkAppPrivateKey: PrivateKey
    let zkAppPublicKey: PublicKey
    let user1PrivateKey: PrivateKey
    let user1PublicKey: PublicKey
    let user2PrivateKey: PrivateKey
    let user2PublicKey: PublicKey
    let contract: TokenX
    let verificationKey: { data: string, hash: Field }

    beforeAll(async () => {
        verificationKey = (await TokenX.compile()).verificationKey
    })

    beforeEach(async () => {
        const Local = Mina.LocalBlockchain({ proofsEnabled })
        Mina.setActiveInstance(Local)

        deployerPrivateKey = Local.testAccounts[0].privateKey
        deployerPublicKey = Local.testAccounts[0].publicKey

        zkAppPrivateKey = PrivateKey.random()
        zkAppPublicKey = zkAppPrivateKey.toPublicKey()

        user1PrivateKey = Local.testAccounts[1].privateKey
        user1PublicKey = Local.testAccounts[1].publicKey

        user2PrivateKey = Local.testAccounts[2].privateKey
        user2PublicKey = Local.testAccounts[2].publicKey

        contract = new TokenX(zkAppPublicKey)

        const tx = await Mina.transaction(deployerPublicKey, () => {
            AccountUpdate.fundNewAccount(deployerPublicKey)
            contract.deploy({ verificationKey, zkappKey: zkAppPrivateKey })
        })
        await tx.prove()
        await tx.sign([deployerPrivateKey]).send()
    })

    it('initialization is correct', async () => {
        expect(contract.totalAmountInCirculation.get()).toEqual(UInt64.from(0))
    })

    it('can mint tokens', async () => {
        //------ mint `40` tokens to user 1 ------
        const receiverAddress = user1PublicKey

        const amount = UInt64.from(40)

        const signature = Signature.create(
            zkAppPrivateKey,
            amount.toFields().concat(receiverAddress.toFields())
        )

        const tx = await Mina.transaction(deployerPublicKey, () => {
            AccountUpdate.fundNewAccount(deployerPublicKey)
            contract.mint(receiverAddress, amount, signature)
        })
        await tx.prove()
        await tx.sign([deployerPrivateKey]).send()

        expect(contract.totalAmountInCirculation.get()).toEqual(UInt64.from(40))
    })

    it('can send tokens', async () => {
        //------ mint `10` tokens to user 1 ------
        await (async () => {
            const receiverAddress = user1PublicKey

            const amount = UInt64.from(10)

            const signature = Signature.create(
                zkAppPrivateKey,
                amount.toFields().concat(receiverAddress.toFields())
            )

            const tx = await Mina.transaction(deployerPublicKey, () => {
                AccountUpdate.fundNewAccount(deployerPublicKey)
                contract.mint(receiverAddress, amount, signature)
            })
            await tx.prove()
            await tx.sign([deployerPrivateKey]).send()
        })()


        //------ send `5` tokens to user 2 from user 1  ------
        await (async () => {
            const senderAddress = user1PublicKey

            const receiverAddress = user2PublicKey

            const amount = UInt64.from(5)

            const sendTokensTx = await Mina.transaction(user1PublicKey, () => {
                AccountUpdate.fundNewAccount(user1PublicKey)
                contract.sendTokens(senderAddress, receiverAddress, amount)
            })
            await sendTokensTx.prove()
            await sendTokensTx.sign([user1PrivateKey]).send()

            expect(Mina.getBalance(senderAddress, contract.token.id).value.toBigInt()).toBe(5n)
            expect(Mina.getBalance(receiverAddress, contract.token.id).value.toBigInt()).toBe(5n)
        })()


    })
})