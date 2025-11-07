import { SlitherClient } from "./client"

async function main() {
    const client = await SlitherClient.createWithFirstServer({
        nickname: "Marcuth",
        version: 333,
        skinId: 15
    })

    await client.connect()
}

main()
// ws://45.158.39.114:444/slither
// ws://45.158.39.114:444/slither