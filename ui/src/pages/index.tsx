import useWorker from "@/hooks/useWorker"

export default function Home() {
    const { worker } = useWorker()

    return (
        <main>
            <button onClick={async () => {
                const a = await worker.current?.getBitcoinPrice()
                console.log()
            }}>hey</button>
        </main>
    )
}
