import { App } from '@tinyhttp/app'
import { PrivateKey } from 'o1js'
import { Exchange } from 'xane'
import { Database } from './database'

const SAMPLE_PUBLIC_KEY = PrivateKey.random().toPublicKey()

const db = new Database()

const app = new App()

const contract = new Exchange(SAMPLE_PUBLIC_KEY)

app.post('/create-pair', (_req, res) => {
    // todo
})

app.post('/place-order', (_req, res) => {
    // todo
})

app.post('/cancel-order', (_req, res) => {
    // todo
})

app.post('/execute-order', (_req, res) => {
    // todo
})

app.get('/order-book', (_req, res) => {
    // todo
})

app.listen(3000, () => console.log('Started on http://localhost:3000'))
