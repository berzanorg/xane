"use client"

import { type Remote, wrap } from "comlink";
import type { WebWorker } from "./web_worker";

export const webWorker = wrap<WebWorker>(new Worker(new URL('./web_worker.ts', import.meta.url)))
