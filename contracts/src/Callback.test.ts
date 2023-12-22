import {
    method,
    Mina,
    AccountUpdate,
    PrivateKey,
    SmartContract,
    PublicKey,
    UInt64,
    Int64,
    Experimental,
    Permissions,
    DeployArgs,
    VerificationKey,
    TokenId,
    state,
    State,
} from 'o1js'

class TokenContract extends SmartContract {
    @state(UInt64) decimals = State<UInt64>()
    @state(UInt64) maxSupply = State<UInt64>()
    @state(UInt64) circulatingSupply = State<UInt64>()

    deploy(args: DeployArgs) {
        super.deploy(args)

        this.account.permissions.set({
            ...Permissions.default(),
            editState: Permissions.proofOrSignature(),
            access: Permissions.proofOrSignature(),
        })

        this.decimals.set(UInt64.from(3))
        this.maxSupply.set(UInt64.from(100_000_000))
        this.circulatingSupply.set(UInt64.from(0))
    }

    @method tokenDeploy(address: PublicKey, verificationKey: VerificationKey) {
        const tokenId = this.token.id
        const deployUpdate = AccountUpdate.defaultAccountUpdate(address, tokenId)
        this.approve(deployUpdate)
        deployUpdate.account.permissions.set(Permissions.default())
        deployUpdate.account.verificationKey.set(verificationKey)
        deployUpdate.requireSignature()
    }

    @method mint(receiver: PublicKey, amount: UInt64) {
        const maxSupply = this.maxSupply.getAndRequireEquals()
        const circulatingSupply = this.circulatingSupply.getAndRequireEquals()

        const newCirculatingSupply = circulatingSupply.add(amount)

        newCirculatingSupply.assertLessThanOrEqual(maxSupply)

        this.token.mint({
            address: receiver,
            amount,
        })

        this.circulatingSupply.set(newCirculatingSupply)
    }

    @method burn(burner: PublicKey, amount: UInt64) {
        const circulatingSupply = this.circulatingSupply.getAndRequireEquals()

        const newCirculatingSupply = circulatingSupply.sub(amount)

        this.token.burn({
            address: burner,
            amount,
        })

        this.circulatingSupply.set(newCirculatingSupply)
    }

    @method transfer(
        senderAddress: PublicKey,
        receiverAddress: PublicKey,
        amount: UInt64,
        callback: Experimental.Callback<any>
    ) {
        const senderAccountUpdate = this.approve(callback, AccountUpdate.Layout.AnyChildren)
        const negativeAmount = Int64.fromObject(senderAccountUpdate.body.balanceChange)
        negativeAmount.assertEquals(Int64.from(amount).neg())
        const tokenId = this.token.id
        senderAccountUpdate.body.tokenId.assertEquals(tokenId)
        senderAccountUpdate.body.publicKey.assertEquals(senderAddress)
        const receiverAccountUpdate = Experimental.createChildAccountUpdate(this.self, receiverAddress, tokenId)
        receiverAccountUpdate.balance.addInPlace(amount)
    }
}

class ZkAppB extends SmartContract {
    @method approveSend(amount: UInt64) {
        this.balance.subInPlace(amount)
    }
}

class ZkAppC extends SmartContract {
    @method approveSend(amount: UInt64) {
        this.balance.subInPlace(amount)
    }
}

const Local = Mina.LocalBlockchain()
Mina.setActiveInstance(Local)

const feePayer = Local.testAccounts[0].privateKey
const feePayerAddress = Local.testAccounts[0].publicKey
const initialBalance = 10_000_000

const tokenZkAppKey = Local.testAccounts[9].privateKey
const tokenZkAppAddress = Local.testAccounts[9].publicKey

const zkAppCKey = PrivateKey.random()
const zkAppCAddress = zkAppCKey.toPublicKey()

const zkAppBKey = PrivateKey.random()
const zkAppBAddress = zkAppBKey.toPublicKey()

const tokenAccount1Key = Local.testAccounts[1].privateKey
const tokenAccount1 = tokenAccount1Key.toPublicKey()

const tokenZkApp = new TokenContract(tokenZkAppAddress)
const tokenId = tokenZkApp.token.id

const zkAppB = new ZkAppB(zkAppBAddress, tokenId)
const zkAppC = new ZkAppC(zkAppCAddress, tokenId)
let tx

console.log('tokenZkAppAddress', tokenZkAppAddress.toBase58())
console.log('zkAppB', zkAppBAddress.toBase58())
console.log('zkAppC', zkAppCAddress.toBase58())
console.log('receiverAddress', tokenAccount1.toBase58())
console.log('feePayer', feePayer.toPublicKey().toBase58())
console.log('-------------------------------------------')

console.log('compile (TokenContract)')
await TokenContract.compile()
console.log('compile (ZkAppB)')
await ZkAppB.compile()
console.log('compile (ZkAppC)')
await ZkAppC.compile()

console.log('deploy tokenZkApp')
tx = await Mina.transaction(feePayerAddress, () => {
    tokenZkApp.deploy({ zkappKey: tokenZkAppKey })
})
tx.sign([feePayer, tokenZkAppKey])
await tx.send()

console.log('deploy zkAppB')
tx = await Mina.transaction(feePayerAddress, () => {
    AccountUpdate.fundNewAccount(feePayerAddress)
    tokenZkApp.tokenDeploy(zkAppBAddress, ZkAppB._verificationKey!)
})
await tx.prove()
tx.sign([feePayer, tokenZkAppKey, zkAppBKey])
await tx.send()

console.log('deploy zkAppC')
tx = await Mina.transaction(feePayerAddress, () => {
    AccountUpdate.fundNewAccount(feePayerAddress)
    tokenZkApp.tokenDeploy(zkAppCAddress, ZkAppC._verificationKey!)
})
console.log('deploy zkAppC (proof)')
await tx.prove()
tx.sign([feePayer, tokenZkAppKey, zkAppCKey])

await tx.send()

console.log('mint token to zkAppB')
tx = await Mina.transaction(feePayerAddress, () => {
    tokenZkApp.mint(zkAppBAddress, UInt64.from(1_000_000))
})
await tx.prove()
tx.sign([feePayer, tokenZkAppKey])
await tx.send()

console.log(
    `zkAppB's balance for tokenId: ${TokenId.toBase58(tokenId)}\n`,
    Mina.getBalance(zkAppBAddress, tokenId).value.toBigInt()
)

console.log('approve send from zkAppB')
tx = await Mina.transaction(feePayerAddress, () => {
    const approveSendingCallback = Experimental.Callback.create(zkAppB, 'approveSend', [UInt64.from(500)])
    // we call the token contract with the callback
    tokenZkApp.transfer(zkAppBAddress, zkAppCAddress, UInt64.from(500), approveSendingCallback)
})
console.log('approve send (proof)')
await tx.prove()
tx.sign([feePayer, tokenZkAppKey])
await tx.send()

console.log(
    `zkAppB's updated balance for tokenId: ${TokenId.toBase58(tokenId)}\n`,
    Mina.getBalance(zkAppBAddress, tokenId).value.toBigInt()
)

console.log(
    `zkAppC's balance for tokenId: ${TokenId.toBase58(tokenId)}\n`,
    Mina.getBalance(zkAppCAddress, tokenId).value.toBigInt()
)

console.log('approve send from zkAppC')
tx = await Mina.transaction(feePayerAddress, () => {
    // Pay for tokenAccount1's account creation
    AccountUpdate.fundNewAccount(feePayerAddress)
    const approveSendingCallback = Experimental.Callback.create(zkAppC, 'approveSend', [UInt64.from(400)])
    // we call the token contract with the callback
    tokenZkApp.transfer(zkAppCAddress, tokenAccount1, UInt64.from(400), approveSendingCallback)
})
console.log('approve send (proof)')
await tx.prove()
tx.sign([feePayer, tokenZkAppKey])
await tx.send()

console.log(
    `zkAppC's updated balance for tokenId: ${TokenId.toBase58(tokenId)}\n`,
    Mina.getBalance(zkAppCAddress, tokenId).value.toBigInt()
)

console.log(
    `accoun1's updated balance for tokenId: ${TokenId.toBase58(tokenId)}\n`,
    Mina.getBalance(tokenAccount1, tokenId).value.toBigInt()
)

it('ok', () => {
    console.log('done')
})
