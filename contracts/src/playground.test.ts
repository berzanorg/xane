import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64, Encoding } from 'o1js'



describe('Playground', () => {
    it("works like a charm", async () => {
        // below are used to create a private and a public key for test authority
        const privateKey = PrivateKey.random()
        const publicKey = privateKey.toPublicKey()
        console.log(privateKey.toBase58())
        console.log(publicKey.toBase58())
    })
})
