
import { type Remote, wrap } from "comlink";
import type { XaneWorker } from "@/lib/worker";
import { useEffect, useRef } from "react";

export default function useWorker() {
    const worker = useRef<Remote<XaneWorker>>()

    useEffect(() => {
        if(worker.current) return
        worker.current = wrap<XaneWorker>(new Worker(new URL('@/lib/worker', import.meta.url)))
    }, [])

    return { worker }
}