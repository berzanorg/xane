import { Show, createSignal } from 'solid-js'
import { store } from '../lib/store'

const [isOpen, setOpen] = createSignal(false)
const [tokenId, setTokenId] = createSignal<bigint>()

export const showMintDialog = (tokenId: bigint) => {
    setTokenId(tokenId)
    setOpen(true)
}

export default function DialogMint() {
    const onSubmit = async () => {}

    const token = () => store.tokenBalances.find(({ id }) => id === tokenId()!)!

    return (
        <Show when={isOpen()}>
            <div class="fixed top-0 left-0 w-full min-h-screen flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                <div class="p-4 bg-slate-800 rounded-3xl w-full max-w-xs flex flex-col gap-2.5">
                    <p class="font-semibold text-2xl text-center">Mint {token().symbol}</p>
                    <form class="flex flex-col gap-4" onSubmit={onSubmit}>
                        <input
                            placeholder="Amount"
                            class="bg-slate-900 duration-75 h-9 rounded-full outline-none text-white px-5 text-lg font-medium placeholder:text-slate-600"
                            type="number"
                            required
                        />
                        <div class="flex  justify-between">
                            <button
                                class="h-9 px-5 bg-slate-600 hover:bg-slate-500 duration-75 text-white rounded-full font-semibold text-lg"
                                type="button"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                class="h-9 px-5 bg-blue-500 hover:bg-blue-400 duration-75 text-white rounded-full font-semibold text-lg"
                                type="submit"
                            >
                                Mint
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Show>
    )
}
