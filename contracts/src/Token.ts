import {
    DeployArgs,
    Field,
    Permissions,
    PublicKey,
    SmartContract,
    State,
    UInt64,
    method,
    state
} from "o1js"

interface CustomDeployArgs {
    symbol: Field
    fixedSupply: UInt64
}

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
 * // Deploy it with given symbol and supply.
 * token.deploy({ verificationKey, zkappKey, symbol, fixedSupply })
 * 
 * // Transfer tokens.
 * token.transfer(receiver, amount)
 * 
 * ```
 * 
 */
export class Token extends SmartContract {
    @state(Field) symbol = State<Field>()

    @state(UInt64) fixedSupply = State<UInt64>()

    deploy(args: DeployArgs & CustomDeployArgs) {
        super.deploy(args)

        this.account.permissions.set({
            ...Permissions.default(),
            editState: Permissions.proof(),
            setTokenSymbol: Permissions.proof(),
            send: Permissions.proof(),
            receive: Permissions.proof(),
        })

        this.symbol.set(args.symbol)

        this.token.mint({
            address: this.sender,
            amount: args.fixedSupply
        })
        
        this.fixedSupply.set(args.fixedSupply)
    }

    @method transfer(from: PublicKey, to: PublicKey, amount: UInt64) {
        this.token.send({
            from,
            to,
            amount
        })
    }
}

