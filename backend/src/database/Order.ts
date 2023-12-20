import { Field, Poseidon, PublicKey } from 'o1js'

export class Order {
    maker: string
    amount: number
    price: number

    constructor(maker: string, amount: number, price: number) {
        this.maker = maker
        this.amount = amount
        this.price = price
    }

    _GetHash(): Field {
        const maker = PublicKey.fromBase58(this.maker)
        const amount = new Field(this.amount)
        const price = new Field(this.price)

        const hash = Poseidon.hash([...maker.toFields(), ...amount.toFields(), ...price.toFields()])

        return hash
    }
}
