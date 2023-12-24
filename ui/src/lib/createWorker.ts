import { wrap } from 'comlink'
import type { XaneWorker } from './worker'

export const createWorker = () => {
    const worker = wrap<XaneWorker>(new Worker(new URL('./worker.ts', import.meta.url)))

    return worker
}
