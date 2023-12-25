import { wrap } from "comlink";
import type { XaneWorker } from "./worker";


export const client = wrap<XaneWorker>(new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }))