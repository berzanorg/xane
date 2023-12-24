import { PublicKey, SmartContract, State, UInt64, method, state } from 'o1js'
import { Token } from './Token'

export class Vault extends SmartContract {
    @method decrementBalance(amount: UInt64) {
        this.balance.subInPlace(amount)
    }
}
