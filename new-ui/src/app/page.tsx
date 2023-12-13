"use client"

import { webWorker } from "@/lib/web_worker_client"
import { useEffect } from "react"

export default function Home() {

  useEffect(() => {
    (async () => {

      console.log(await webWorker.getBitcoinPrice())

    })()
  }, [])

  return (
    <main>
      hello
    </main>
  )
}
