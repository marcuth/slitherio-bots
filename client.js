const WebSocket = require("ws");


function decodeSecret(secret) {
    // Os bytes do Packet "6" são interpretados como caracteres Unicode
    // e o cálculo é feito em cima do valor charCode.

    const result = Buffer.alloc(24)
    let globalValue = 0

    for (let i = 0; i < 24; i++) {
        let value1 = secret[17 + i * 2]
        if (value1 <= 96) {
            value1 += 32
        }
        value1 = (value1 - 98 - i * 34) % 26
        if (value1 < 0) {
            value1 += 26
        }

        let value2 = secret[18 + i * 2]
        if (value2 <= 96) {
            value2 += 32
        }
        value2 = (value2 - 115 - i * 34) % 26
        if (value2 < 0) {
            value2 += 26
        }

        let interimResult = (value1 << 4) | value2
        let offset = interimResult >= 97 ? 97 : 65
        interimResult -= offset

        if (i === 0) {
            globalValue = 2 + interimResult
        }

        result[i] = (interimResult + globalValue) % 26 + offset
        globalValue += 3 + interimResult
    }

    return result
}

class SlitherClient {
    constructor({ server = "ws://213.159.5.171:444", nickname = "ChatGPT", skin = 15 } = {}) {
        this.server = server;
        this.nickname = nickname;
        this.skin = skin;
        this.ws = null;
        this.protocolVersion = 11;
        this.pingInterval = null;
    }

    connect() {
        this.ws = new WebSocket(this.server, {
            headers: {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
                "cache-control": "no-cache",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "en-US,en;q=0.9",
                "pragma": "no-cache",
                "origin": "http://slither.io"
            }
        });

        this.ws.on("open", () => {
            console.log("🟢 Conectado ao servidor:", this.server);
            this.sendLoginStart();
        });

        this.ws.on("message", (data) => this.handleMessage(new Uint8Array(data)));
        this.ws.on("close", () => console.log("🔴 Conexão encerrada"));
        this.ws.on("error", (err) => console.error("⚠️ Erro:", err));
    }

    // Etapa 1: iniciar login ('c')
    sendLoginStart() {
        this.ws.send(new Uint8Array([0x63])); // 'c'
        console.log("➡️ Enviado pacote StartLogin ('c')");
    }

    // Etapa 2: tratar mensagens recebidas
    handleMessage(data) {
        const type = String.fromCharCode(data[2] || 0);

        switch (type) {
            case "6":
                console.log("📜 Recebido pacote 6 (Pre-init response)");
                this.handlePreInit(data);
                break;

            case "a":
                console.log("✅ Spawn completo! Recebido Initial setup");
                break;

            case "p":
                console.log("🏓 Pong recebido!");
                break;

            default:
                break;
        }
    }

    // Etapa 3: resolver o riddle e enviar resposta
    handlePreInit(data) {
        // pegar bytes a partir do índice 3 (encoded JavaScript secret)
        const secret = Array.from(data).slice(3);
        const answer = decodeSecret(secret);
        this.ws.send(answer);
        console.log("🧩 Enviado segredo decodificado (resposta ao pacote 6)");

        // Agora enviar nickname e skin
        this.sendUsernameAndSkin();
    }

    // Etapa 4: enviar username + skin
    sendUsernameAndSkin() {
        const nickBuf = Buffer.from(this.nickname, "utf8");
        const packet = Buffer.concat([
            Buffer.from([
                0x73, // 's'
                this.protocolVersion - 1, // version - 1
                this.skin,
                nickBuf.length
            ]),
            nickBuf
        ]);

        this.ws.send(packet);
        console.log(`👤 Enviado pacote SetUsernameAndSkin (nick=${this.nickname})`);

        // Começar a enviar pings regulares
        this.startPing();
    }

    // Etapa 5: ping
    startPing() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
            this.ws.send(Buffer.from([0xFB]));
        }, 250);
        console.log("⏱️ Ping loop iniciado");
    }

    // Etapa 6: mover o jogador
    move(angleDegrees) {
        // converter ângulo [0, 360] → valor 0–250
        const value = Math.round((angleDegrees % 360) / 360 * 250);
        this.ws.send(Buffer.from([value]));
    }

    boost(on = true) {
        this.ws.send(Buffer.from([on ? 253 : 254]));
    }
}

// export default SlitherClient;

; (async () => {
    const client = new SlitherClient()

    client.connect()
})();