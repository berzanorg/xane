"use client"

import useAuro from "@/hooks/useAuro";
import { useStore } from "@/lib/store";
import Link from "next/link";

export default function Header() {
    const { connect, disconnect, isAuroWalletFound } = useAuro()
    const address = useStore(state => state.address)
    
    return (
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b sm:px-6 border-slate-800 bg-slate-900/70 backdrop-blur-lg">
            <Link href="/" className="text-2xl font-bold">Xane</Link>
            <button
                disabled={!isAuroWalletFound}
                onClick={address ? disconnect : connect}
                className="h-10 px-6 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-400 disabled:cursor-not-allowed">
                {address ? 'Disconnect' : 'Connect'}
            </button>
        </header>
    )
}