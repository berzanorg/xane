import { Show, createSignal } from 'solid-js'

const [isOpen, setOpen] = createSignal(false)

export const showOrderPlacingDialog = () => setOpen(true)

export default function DialogOrderPlacing() {
    const onSubmit = async () => {}

    return (
        <Show when={isOpen()}>
            <div class="fixed top-0 left-0 w-full min-h-screen flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                <div class="p-4 bg-slate-800 rounded-3xl w-full max-w-xs flex flex-col gap-2.5">
                    <p class="font-semibold text-2xl text-center">Place Order</p>
                    <form class="flex flex-col gap-4" onSubmit={onSubmit}>
                        <input
                            placeholder="Base Currency"
                            class="bg-slate-900 h-9 uppercase rounded-full outline-none text-white px-5 text-lg font-medium placeholder:text-slate-600"
                            type="text"
                            minLength={1}
                            maxLength={5}
                            required
                        />
                        <input
                            placeholder="Quote Currency"
                            class="bg-slate-900 h-9 uppercase rounded-full outline-none text-white px-5 text-lg font-medium placeholder:text-slate-600"
                            type="text"
                            minLength={1}
                            maxLength={5}
                            required
                        />
                        <input
                            placeholder="Amount"
                            class="bg-slate-900 duration-75 h-9 rounded-full outline-none text-white px-5 text-lg font-medium placeholder:text-slate-600"
                            type="number"
                            required
                        />
                        <input
                            placeholder="Price"
                            class="bg-slate-900 duration-75 h-9 rounded-full outline-none text-white px-5 text-lg font-medium placeholder:text-slate-600"
                            type="number"
                            required
                        />
                        <div class="flex justify-between">
                            <button
                                class="h-9 px-5 bg-slate-600 hover:bg-slate-500 duration-75 text-white rounded-full font-semibold text-lg"
                                type="button"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </button>
                            <div class="flex gap-4">
                                <button
                                    class="h-9 px-5 bg-rose-500 hover:bg-rose-400 duration-75 text-white rounded-full font-semibold text-lg"
                                    type="submit"
                                >
                                    Sell
                                </button>
                                <button
                                    class="h-9 px-5 bg-blue-500 hover:bg-blue-400 duration-75 text-white rounded-full font-semibold text-lg"
                                    type="submit"
                                >
                                    Buy
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </Show>
    )
}
