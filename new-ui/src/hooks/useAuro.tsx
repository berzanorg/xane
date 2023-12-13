import { useStore } from "@/lib/store"
import { useEffect, useState } from "react"

export default function useAuro() {
    const setAddress = useStore(state => state.setAddress)
    const [isAuroWalletFound, setAuroWalletFound] = useState(false)

    useEffect(() => {
        if (window.mina) setAuroWalletFound(true)
    }, [])

    return {
        isAuroWalletFound,
        connect: async () => {
            if (!window.mina) return
            try {
                const [address] = await window.mina.requestAccounts()

                setAddress(address)
    
                window.mina?.on('accountsChanged', (addresses) => {
                    if (addresses.length === 0) {
                        setAddress(undefined)
                    } else {
                        setAddress(addresses[0])
                    }
                })
            } catch (error) {
                if (error.code === 1002) return
                console.error(error)
            }
        },
        disconnect: () => {
            setAddress(undefined)
            window.mina?.removeAllListeners()
        },
        signTransaction: async (txAsJSON: string) => {
            await window.mina?.sendTransaction({
                transaction: txAsJSON,
            })
        }
    }
}
