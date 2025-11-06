import { SlitherIoClient } from "./client"

async function main() {
    const servers = await SlitherIoClient.getServers()
    const firstServer = servers[0]
    
    const client = new SlitherIoClient({
        server: firstServer,
        nickname: "Marcuth",
        version: 333,
        skinId: 15
    })

    await client.connect()
}

main()
// ws://45.158.39.114:444/slither
// ws://45.158.39.114:444/slither