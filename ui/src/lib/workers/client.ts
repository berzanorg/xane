import type { WorkerMethods, WorkerRequest, WorkerResponse, WorkerResponseHandlers, WorkerResponseListener } from './worker'

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
            ready: emptyListener,
            getBalance: emptyListener
        }

        this.worker.addEventListener('error', (e) => {
            console.error('worker error')
            console.error(e)
        })

        this.worker.addEventListener('message', async (event: MessageEvent<WorkerResponse>) => {
            if (event.data.args === undefined) {
                console.log('Message has Error', event.data.kind)
                this.handlers[event.data.kind].err()
            } else {
                if (event.data.args === null) {
                    await this.handlers[event.data.kind].ok()
                } else {
                    // We can disable typescript below because it must always work.
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    await this.handlers[event.data.kind].ok(event.data.args)
                }
            }
        })
    }

    send(request: WorkerRequest) {
        this.worker.postMessage(request)
    }

    on<T extends keyof WorkerMethods>(kind: T, handler: WorkerResponseListener<T>) {
        this.handlers[kind].ok = handler.ok
        this.handlers[kind].err = handler.err
    }
}
