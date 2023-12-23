import {
    AccountUpdate,
    DeployArgs,
    Experimental,
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

const createRandomAccount = () => {
    const privateKey = PrivateKey.random()
    const publicKey = privateKey.toPublicKey()
    return {
        publicKey,
        privateKey,
    }
}

class Token extends SmartContract {
    @state(UInt64) decimals = State<UInt64>()
    @state(UInt64) maxSupply = State<UInt64>()
    @state(UInt64) circulatingSupply = State<UInt64>()

    deploy(args: DeployArgs) {
        super.deploy(args)

        this.account.permissions.set({
            ...Permissions.default(),
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

    @method transferViaCallback(
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

    @method transfer(senderAddress: PublicKey, receiverAddress: PublicKey, amount: UInt64) {
        this.token.send({ from: senderAddress, to: receiverAddress, amount })
    }

    @method approveUpdateAndTransfer(zkappUpdate: AccountUpdate, to: PublicKey, amount: UInt64) {
        // TODO: THIS IS INSECURE. The proper version has a prover error (compile != prove) that must be fixed
        this.approve(zkappUpdate, AccountUpdate.Layout.AnyChildren)

        // THIS IS HOW IT SHOULD BE DONE:
        // // approve a layout of two grandchildren, both of which can't inherit the token permission
        // let { StaticChildren, AnyChildren } = AccountUpdate.Layout;
        // this.approve(zkappUpdate, StaticChildren(AnyChildren, AnyChildren));
        // zkappUpdate.body.mayUseToken.parentsOwnToken.assertTrue();
        // let [grandchild1, grandchild2] = zkappUpdate.children.accountUpdates;
        // grandchild1.body.mayUseToken.inheritFromParent.assertFalse();
        // grandchild2.body.mayUseToken.inheritFromParent.assertFalse();

        // see if balance change cancels the amount sent
        const balanceChange = Int64.fromObject(zkappUpdate.body.balanceChange)
        balanceChange.assertEquals(Int64.from(amount).neg())

        const receiverAccountUpdate = Experimental.createChildAccountUpdate(this.self, to, this.token.id)
        receiverAccountUpdate.balance.addInPlace(amount)
    }

    @method approveUpdate(zkappUpdate: AccountUpdate) {
        this.approve(zkappUpdate)
        const balanceChange = Int64.fromObject(zkappUpdate.body.balanceChange)
        balanceChange.assertEquals(Int64.from(0))
    }

    @method deployZkapp(address: PublicKey, verificationKey: VerificationKey) {
        let tokenId = this.token.id
        let zkapp = AccountUpdate.create(address, tokenId)
        zkapp.account.permissions.set(Permissions.default())
        zkapp.account.verificationKey.set(verificationKey)
        zkapp.requireSignature()
    }
}

class Vault extends SmartContract {
    @method reduceBalance(amount: UInt64) {
        this.balance.subInPlace(amount)
    }
}

class Dex extends SmartContract {
    @method deposit(tokenAddr: PublicKey, amount: UInt64) {
        const token = new Token(tokenAddr)
        const vault = new Vault(this.address, token.token.id)
        token.transfer(this.sender, vault.address, amount)
    }

    @method withdraw(tokenAddr: PublicKey, amount: UInt64) {
        const token = new Token(tokenAddr)
        const vault = new Vault(this.address, token.token.id)
        vault.reduceBalance(amount)
        token.approveUpdateAndTransfer(vault.self, this.sender, amount)
    }
}

const Local = Mina.LocalBlockchain()
Mina.setActiveInstance(Local)

const accounts = {
    dex: createRandomAccount(),
    token: createRandomAccount(),
    feePayer: Local.testAccounts[0],
    user: Local.testAccounts[1],
}

const zkapps = {
    token: new Token(accounts.token.publicKey),
    dex: new Dex(accounts.dex.publicKey),
}

const amounts = {
    mint: UInt64.from(100),
    deposit: UInt64.from(50),
    withdraw: UInt64.from(30),
}

const [
    { verificationKey: verificationKeyOfDex },
    { verificationKey: verificationKeyOfVault },
    { verificationKey: verificationKeyOfToken },
] = await Promise.all([Dex.compile(), Vault.compile(), Token.compile()])

it('can deploy token', async () => {
    const tx = await Mina.transaction(accounts.feePayer.publicKey, () => {
        const feePayerUpdate = AccountUpdate.fundNewAccount(accounts.feePayer.publicKey)

        const accountCreationFee = Mina.accountCreationFee()
        feePayerUpdate.send({ to: accounts.token.publicKey, amount: accountCreationFee.mul(2) })

        zkapps.token.deploy({ verificationKey: verificationKeyOfToken })
    })

    await tx.prove()

    tx.sign([accounts.feePayer.privateKey, accounts.token.privateKey])

    await tx.send()
})

it('can deploy dex', async () => {
    const tx = await Mina.transaction(accounts.feePayer.publicKey, () => {
        AccountUpdate.fundNewAccount(accounts.feePayer.publicKey)
        zkapps.dex.deploy({ verificationKey: verificationKeyOfDex })
    })

    await tx.prove()

    tx.sign([accounts.feePayer.privateKey, accounts.dex.privateKey])

    await tx.send()
})

it('can deploy vault', async () => {
    const tx = await Mina.transaction(accounts.feePayer.publicKey, () => {
        const vault = new Vault(zkapps.dex.address, zkapps.token.token.id)
        AccountUpdate.fundNewAccount(accounts.feePayer.publicKey)
        vault.deploy({ verificationKey: verificationKeyOfVault })
        zkapps.token.approveUpdate(vault.self)
    })

    await tx.prove()

    tx.sign([accounts.feePayer.privateKey, accounts.dex.privateKey])

    await tx.send()
})

it('can mint token', async () => {
    const tx = await Mina.transaction(accounts.feePayer.publicKey, () => {
        AccountUpdate.fundNewAccount(accounts.feePayer.publicKey)
        zkapps.token.mint(accounts.user.publicKey, amounts.mint)
    })

    await tx.prove()

    tx.sign([accounts.feePayer.privateKey, accounts.token.privateKey])

    await tx.send()

    Mina.getBalance(accounts.user.publicKey, zkapps.token.token.id).assertEquals(amounts.mint)
})

it('can deposit token', async () => {
    const tx = await Mina.transaction(accounts.user.publicKey, () => {
        zkapps.dex.deposit(zkapps.token.address, amounts.deposit)
    })

    await tx.prove()

    tx.sign([accounts.user.privateKey])

    await tx.send()

    Mina.getBalance(zkapps.dex.address, zkapps.token.token.id).assertEquals(amounts.deposit)
})

it('can withdraw token', async () => {
    const tx = await Mina.transaction(accounts.user.publicKey, () => {
        zkapps.dex.withdraw(zkapps.token.address, amounts.withdraw)
    })

    await tx.prove()

    tx.sign([accounts.user.privateKey])

    await tx.send()

    Mina.getBalance(zkapps.dex.address, zkapps.token.token.id).assertEquals(amounts.deposit.sub(amounts.withdraw))
    Mina.getBalance(accounts.user.publicKey, zkapps.token.token.id).assertEquals(
        amounts.mint.sub(amounts.deposit).add(amounts.withdraw)
    )
})
