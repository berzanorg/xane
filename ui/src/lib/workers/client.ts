import type { WorkerAddListener, WorkerRequest, WorkerResponse, WorkerResponseHandlers } from './worker'


export class WorkerClient {
    worker: Worker
    handlers: WorkerResponseHandlers

    static async create() {
        const MyWorker = await import('$lib/workers/worker?worker')
        const worker = new MyWorker.default()

        return new WorkerClient(worker)
    }

    constructor(worker: Worker) {
        this.worker = worker

        const emptyListener = {
            ok: async () => { },
            err: () => { }
        }

        this.handlers = {
            loadContract: emptyListener,
            compileContract: emptyListener,
            deployContract: emptyListener,
            ready: emptyListener
        }

        this.worker.addEventListener('error', (e) => {
            console.error('worker error')
            console.error(e)
        })

        this.worker.addEventListener('message', async (event: MessageEvent<WorkerResponse>) => {
            console.log('Message from worker is received', JSON.stringify(event.data))
            if (event.data.args === undefined) {
                this.handlers[event.data.kind].err()
            } else {
                await (event.data.args === null ? this.handlers[event.data.kind].ok() : this.handlers[event.data.kind].ok(event.data.args))
            }
        })
    }

    send(request: WorkerRequest) {
        this.worker.postMessage(request)
    }

    on: WorkerAddListener = (kind, { ok, err }) => {
        this.handlers[kind].ok = ok
        this.handlers[kind].err = err
    }
}
