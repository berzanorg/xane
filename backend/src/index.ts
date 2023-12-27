import { App } from '@tinyhttp/app'
import { Field, PrivateKey, PublicKey, Signature, UInt64 } from 'o1js'
import { AUTHORITY_PRIVATE_KEY, Database, Exchange } from 'xane'

const SAMPLE_PUBLIC_KEY = PrivateKey.random().toPublicKey()

const tokens: {
    id: string
    pubkey: string
}[] = []

const db = new Database()

const app = new App()

const contract = new Exchange(SAMPLE_PUBLIC_KEY)

app.post('/create-token', (req, res) => {
    try {
        const id = Field(req.query.id).toString()
        const pubkey = Field(req.query.pubkey).toString()

        if (!tokens.find((a) => a.id === id)) {
            tokens.push({
                id,
                pubkey,
            })
        }
        res.sendStatus(200)
    } catch (error) {
        console.error(`/create-token`)
        console.error(JSON.stringify(req))
        console.error(error)
        res.sendStatus(400)
    }
})

app.post('/create-pair', (req, res) => {
    try {
        const baseCurrency = PublicKey.fromBase58(req.query.baseCurrency)
        const quoteCurrency = PublicKey.fromBase58(req.query.quoteCurrency)
        db.addPair({
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
        })

        const pairWitness = db.getPairWitness({
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
        })

        const authoritySignature = Signature.create(AUTHORITY_PRIVATE_KEY, [
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            ...pairWitness.toFields(),
        ])

        res.send({
            pairWitness: pairWitness.toJSON(),
            authoritySignature: authoritySignature.toJSON(),
        })
    } catch (error) {
        console.error(`/create-pair`)
        console.error(JSON.stringify(req))
        console.error(error)
        res.sendStatus(400)
    }
})

app.post('/place-order', (req, res) => {
    try {
        const baseCurrency = PublicKey.fromBase58(req.query.baseCurrency)
        const quoteCurrency = PublicKey.fromBase58(req.query.quoteCurrency)
        const maker = PublicKey.fromBase58(req.query.maker)
        const price = UInt64.from(req.query.price)
        const amount = UInt64.from(req.query.amount)
        const side = req.query.side === 'BUY' ? 'BUY' : 'SELL'


        const pairWitness = db.getPairWitness({
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
        })

        const orderIndex = db.addOrder({
            side,
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
            maker: maker.toBase58(),
            amount: amount.toBigInt(),
            price: price.toBigInt(),
        })

        const orderWitness = db.getOrderWitness({
            side,
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
            orderIndex,
        })

        const ordersRoot = db.getOrdersRoot({
            side: side === 'BUY' ? 'SELL' : 'BUY',
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
        })

        const authoritySignature = Signature.create(AUTHORITY_PRIVATE_KEY, [
            ...amount.toFields(),
            ...price.toFields(),
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            ...ordersRoot.toFields(),
            ...orderWitness.toFields(),
            ...pairWitness.toFields(),
        ])

        res.send({
            ordersRoot: ordersRoot.toJSON(),
            orderWitness: orderWitness.toJSON(),
            pairWitness: pairWitness.toJSON(),
            authoritySignature: authoritySignature.toJSON(),
        })
    } catch (error) {
        console.error(`/place-order`)
        console.error(JSON.stringify(req))
        console.error(error)
        res.sendStatus(400)
    }
})

app.post('/cancel-order', (req, res) => {
    try {
        const baseCurrency = PublicKey.fromBase58(req.query.baseCurrency)
        const quoteCurrency = PublicKey.fromBase58(req.query.quoteCurrency)
        const price = UInt64.from(req.query.price)
        const amount = UInt64.from(req.query.amount)
        const orderIndex = parseInt(req.query.index)
        const side = req.query.side === 'BUY' ? 'BUY' : 'SELL'

        const pairWitness = db.getPairWitness({
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
        })

        const orderWitness = db.getOrderWitness({
            side,
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
            orderIndex,
        })

        db.removeOrder({
            side,
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
            orderIndex,
        })

        const ordersRoot = db.getOrdersRoot({
            side: side === 'BUY' ? 'SELL' : 'BUY',
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
        })

        const authoritySignature = Signature.create(AUTHORITY_PRIVATE_KEY, [
            ...amount.toFields(),
            ...price.toFields(),
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            ...ordersRoot.toFields(),
            ...orderWitness.toFields(),
            ...pairWitness.toFields(),
        ])

        res.send({
            ordersRoot: ordersRoot.toJSON(),
            orderWitness: orderWitness.toJSON(),
            pairWitness: pairWitness.toJSON(),
            authoritySignature: authoritySignature.toJSON(),
        })
    } catch (error) {
        console.error(`/cancel-order`)
        console.error(JSON.stringify(req))
        console.error(error)
        res.sendStatus(400)
    }
})

app.post('/execute-order', (req, res) => {
    try {
        const baseCurrency = PublicKey.fromBase58(req.query.baseCurrency)
        const quoteCurrency = PublicKey.fromBase58(req.query.quoteCurrency)
        const maker = PublicKey.fromBase58(req.query.maker)
        const price = UInt64.from(req.query.price)
        const amount = UInt64.from(req.query.amount)
        const orderIndex = parseInt(req.query.index)
        const side = req.query.side === 'BUY' ? 'BUY' : 'SELL'

        const pairWitness = db.getPairWitness({
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
        })

        const ordersRoot = db.getOrdersRoot({
            side: side === 'BUY' ? 'SELL' : 'BUY',
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
        })

        const orderWitness = db.getOrderWitness({
            side,
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
            orderIndex,
        })

        db.removeOrder({
            side,
            baseCurrency: baseCurrency.toBase58(),
            quoteCurrency: quoteCurrency.toBase58(),
            orderIndex,
        })

        const authoritySignature = Signature.create(AUTHORITY_PRIVATE_KEY, [
            ...maker.toFields(),
            ...amount.toFields(),
            ...price.toFields(),
            ...baseCurrency.toFields(),
            ...quoteCurrency.toFields(),
            ...ordersRoot.toFields(),
            ...orderWitness.toFields(),
            ...pairWitness.toFields(),
        ])

        res.send({
            ordersRoot: ordersRoot.toJSON(),
            orderWitness: orderWitness.toJSON(),
            pairWitness: pairWitness.toJSON(),
            authoritySignature: authoritySignature.toJSON()
        })
    } catch (error) {
        console.error(`/execute-order`)
        console.error(JSON.stringify(req))
        console.error(error)
        res.sendStatus(400)
    }
})

app.get('/order-book', (_req, res) => {
    res.send(db.data())
})

app.listen(3000, () => console.log('Started on http://localhost:3000'))
