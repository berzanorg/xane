import { expose } from 'comlink'
import { Token, Exchange } from 'xane'
import { Encoding } from 'o1js'

const w = {
    async getBitcoinPrice() {


    }
}

expose(w)

export type XaneWorker = typeof w
