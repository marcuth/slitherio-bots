export enum EventType {
    // Respostas de Inicialização e Setup
    PreInitResponse = "6", // Pre-init response (Desafio anti-bot)
    InitialSetup = "a",    // Initial setup (Constantes do jogo)

    // Movimento e Rotação da Cobra
    SnakeRotationCCW1 = "e", // Snake rotation counterclockwise (?dir ang ?wang ?sp)
    SnakeRotationCCW2 = "E", // Snake rotation counterclockwise (dir wang ?sp)
    SnakeRotationCCW3 = "3", // Snake rotation counterclockwise (dir ang wang | sp)
    SnakeRotationCW1 = "4",  // Snake rotation clockwise (dir ang? wang ?sp)
    SnakeRotationCW2 = "5",  // Snake rotation clockwise (dir ang wang)
    MoveSnake1 = "g",        // Move snake
    MoveSnake2 = "G",        // Move snake
    IncreaseSnake1 = "n",    // Increase snake (com update de fam)
    IncreaseSnake2 = "N",    // Increase snake (com update de fam)
    UpdateSnakeFullness = "h", // Update snake last body part fullness (fam)
    RemoveSnakePart = "r",   // Remove snake part

    // Gerenciamento de Entidades
    AddOrRemoveSnake = "s", // Add/remove Snake (Outras cobras)
    AddFood1 = "F",         // Add Food (existia antes, entra no range)
    AddFood2 = "b",         // Add Food (criada no range, turbo/morte)
    AddFood3 = "f",         // Add Food (natural, spawna no range)
    FoodEaten = "c",        // Food eaten
    UpdatePrey = "j",       // Update Prey ("flying particles")
    AddOrRemovePrey = "y",  // Add/remove Prey

    // Mapa e Ranking
    Leaderboard = "l",     // Leaderboard
    AddSector = "W",       // Add Sector
    RemoveSector = "w",    // Remove Sector
    GlobalHighscore = "m", // Global highscore
    UpdateMinimap = "u",   // Update minimap

    // Status do Jogador e Verificação
    DeadOrDisconnect = "v",      // dead/disconnect packet
    Pong = "p",                  // Pong (Resposta ao Ping do cliente)
    VerifyCodeResponse = "o",    // Verify code response
    Kill = "k",                  // Kill (Não utilizado no código original do jogo)
}