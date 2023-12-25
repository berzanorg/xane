// import { createResource } from 'solid-js'
// import { client } from '../lib/client'
// import { store } from '../lib/store'

// const getMinaBalance = async () => {
//     if (!store.address) return
//     return await client.getBalance({
//         address: store.address,
//     })
// }

export default function Balances() {
    // const [balance] = createResource(store.address, getMinaBalance)

    return <div>{/* <div>{balance()?.toString()}</div> */}</div>
}
