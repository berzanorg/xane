import {
    AccountUpdate,
    DeployArgs,
    Experimental,
    Field,
    Int64,
    Permissions,
    PublicKey,
    SmartContract,
    State,
    UInt64,
    method,
    state,
} from 'o1js'

/**
 *
 * # `Token` Smart Contract
 *
 * The smart contract for tokens on Xane.
 *
 * **Note:** `deploy` method requires two account funding.
 *
 * # Usage
 *
 * ```ts
 * // Import `Token` smart contract.
 * import { Token } from 'xane'
 *
 * // Create an instance of `Token` contract.
 * const token = new Token(zkAppPublicKey)
 *
 * // Deploy it.
 * token.deploy({ verificationKey, zkappKey })
 *
 *
 * ```
 *
 */
enum TokenError {
    MaxSupplyCannotBeExceeded = 'TOKEN: Max supply cannot be exceeded.',
}

export class Token extends SmartContract {
    @state(UInt64) symbol = State<Field>()
    @state(UInt64) decimals = State<UInt64>()
    @state(UInt64) maxSupply = State<UInt64>()
    @state(UInt64) circulatingSupply = State<UInt64>()

    deploy(args: DeployArgs) {
        super.deploy(args)

        this.account.permissions.set({
            ...Permissions.default(),
            editState: Permissions.proof(),
            send: Permissions.proof(),
            access: Permissions.proof(),
        })
    }

    @method initialize(symbol: Field, decimals: UInt64, maxSupply: UInt64) {
        this.symbol.set(symbol)
        this.decimals.set(decimals)
        this.maxSupply.set(maxSupply)
        this.circulatingSupply.set(UInt64.from(0))
    }

    @method mint(receiver: PublicKey, amount: UInt64) {
        const maxSupply = this.maxSupply.getAndRequireEquals()
        const circulatingSupply = this.circulatingSupply.getAndRequireEquals()

        const newCirculatingSupply = circulatingSupply.add(amount)

        newCirculatingSupply.assertLessThanOrEqual(maxSupply, TokenError.MaxSupplyCannotBeExceeded)

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

    @method transfer(sender: PublicKey, receiver: PublicKey, amount: UInt64) {
        this.token.send({ from: sender, to: receiver, amount })
    }

    @method transferWithCallback(
        sender: PublicKey,
        receiver: PublicKey,
        amount: UInt64,
        callback: Experimental.Callback<any>
    ) {
        const tokenId = this.token.id

        const senderAccountUpdate = this.approve(callback, AccountUpdate.Layout.AnyChildren)
        senderAccountUpdate.body.tokenId.assertEquals(tokenId)
        senderAccountUpdate.body.publicKey.assertEquals(sender)

        const negativeAmount = Int64.fromObject(senderAccountUpdate.body.balanceChange)
        negativeAmount.assertEquals(Int64.from(amount).neg())

        const receiverAccountUpdate = Experimental.createChildAccountUpdate(this.self, receiver, tokenId)
        receiverAccountUpdate.balance.addInPlace(amount)
    }
}
