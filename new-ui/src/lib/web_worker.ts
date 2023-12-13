import { expose } from 'comlink'
// import { Token, Exchange } from 'xane-contracts'
import { Encoding } from 'o1js'


console.log('hello')

const webWorker = {
    async getBitcoinPrice() {
        // console.log(Token, Exchange, Encoding.stringToFields('hello'))
    }
}

expose(webWorker)

export type WebWorker = typeof webWorker
