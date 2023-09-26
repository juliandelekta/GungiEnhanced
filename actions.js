class Action {
    static getOfPhaseAction() {
        return [].concat(
            MoveAction.getPossibles(),
            JumpOnAction.getPossibles(),
            CaptureAction.getPossibles(),
            CaptureInTowerAction.getPossibles(),
            DropAction.getPossibles(),
            SwitchAction.getPossibles(),
            SacrificeAction.getPossibles(),
            MountAction.getPossibles(),
            SubstituteAction.getPossibles()
        )
    }

    static getOfPhaseFinal() {
        return [].concat(
            RelocateAction.getPossibles(),
            RecruitAction.getPossibles(),
            CrownWithReplacementAction.getPossibles(),
            CrownWithoutReplacementAction.getPossibles()
        )
    }

    static getOfPhaseArrangement() {
        return [].concat(
            PutAction.getPossibles(),
            RemoveAction.getPossibles()
        )
    }

    constructor(name) {
        this.name = name
    }
}

class WithMovingAction extends Action {
    constructor(name) {
        super(name)
    }

    executeMoving(player) {
        if (this.target === player.lastSwitch)
            player.lastSwitch = null

        if (this.piece instanceof Joker) {
            player.jokers[this.origin.column] = false
            player.jokers[this.target.column] = false
        } else if (this.piece instanceof Pawn) {
            player.pawnsInColumn[this.origin.column]--
            player.pawnsInColumn[this.target.column]++
        }

        this.origin.pop()

        if (this.piece.hasLimitedDropAt(this.target)) {
            player.recover(this.piece)
            if (this.piece instanceof Pawn)
                player.pawnsInColumn[this.origin.column]--
        } else
            this.target.push(this.piece)
    }
}

class MoveAction extends WithMovingAction {
    static getPossibles() {
        const actions = []
        for (let from = 0; from < 81; from++) {
            const fromTop = Engine.board[from].pieceOnTop()
            if (!fromTop || Engine.isEnemy(fromTop)) continue
            Engine.loadPossibleMoves(from)
            for (let to = 0; to < 81; to++)
                if (Engine.possibleMoves[to] && Engine.board[to].isEmpty())
                    actions.push(new MoveAction(Engine.board[from], Engine.board[to]))
        }
        return actions
    }

    constructor(origin, target) {
        super("Move")
        this.origin = origin
        this.piece = origin.pieceOnTop()
        this.target = target
        this.checkRules()
    }

    checkRules() {
        const reasons = []
        if (this.piece instanceof Joker) {
            if (Engine.possibleEnemyCheck(this.piece, this.target, this.target.getTier()))
                reasons.push("Falta - Jaque por Bufón")
            if (Engine.currentPlayer.doubleJokerInPosition(this.target.position))
                reasons.push("Falta - Doble Bufón")
        }
        const aux = [...this.origin.pieces]
        this.origin.pieces = this.origin.pieces.slice(0, -1)
        if (Engine.possiblePlayerCheck(this.piece, this.target, 0, (this.piece instanceof King) ? this.target.position : Engine.currentPlayer.king.position))
            reasons.push(Engine.currentPlayer.isInCheck ? "El Rey sigue en Jaque" : "Se pondría al Rey en jaque")
        this.origin.pieces = aux

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    execute() {
        this.executeMoving(Engine.currentPlayer)
    }
}

class JumpOnAction extends WithMovingAction {
    static getPossibles() {
        const actions = []
        for (let from = 0; from < 81; from++) {
            const fromTop = Engine.board[from].pieceOnTop()
            if (!fromTop || Engine.isEnemy(fromTop)) continue
            Engine.loadPossibleMoves(from)
            for (let to = 0; to < 81; to++)
                if (Engine.possibleMoves[to] && !Engine.board[to].isEmpty() && Engine.isAlly(Engine.board[to].pieceOnTop()))
                    actions.push(new JumpOnAction(Engine.board[from], Engine.board[to]))
        }
        return actions
    }

    constructor(origin, target) {
        super("Jump_On")
        this.origin = origin
        this.piece = origin.pieceOnTop()
        this.target = target
        this.checkRules()
    }

    checkRules() {
        const reasons = []

        if (this.target.getTier() === 3) {
            reasons.push("Es una torre nivel 3")
        } else if (Engine.currentPlayer.isInCheck) {
            reasons.push(this.piece instanceof King
                ? "Rey en Jaque no salta encima"
                : "El Rey sigue en Jaque"
            )
        } else {
            if (this.target.hasPieceOfSameKind(this.piece))
                reasons.push("La Torre ya contiene este tipo de pieza")
            
            if (this.target.pieceOnTop() instanceof King)
                reasons.push("El Rey está en la cima")
            
            if (Engine.currentPlayer.promotionBoard[this.target.position])
                reasons.push("La Torre tiene Ascenso")
            
            if (this.piece instanceof Joker) {
                if (Engine.possibleEnemyCheck(this.piece, this.target, this.target.getTier()))
                    reasons.push("Falta - Jaque por Bufón")
                if (Engine.currentPlayer.doubleJokerInPosition(this.target.position))
                    reasons.push("Falta - Doble Bufón")
            }

            const aux = [...this.origin.pieces]
            if (Engine.possiblePlayerCheck(this.piece, this.target, 0, (this.piece instanceof King) ? this.target.position : Engine.currentPlayer.king.position))
                reasons.push("Se pondría al Rey en jaque")
            this.origin.pieces = aux
        }

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    execute() {
        this.executeMoving(Engine.currentPlayer)
    }
}

class CaptureAction extends WithMovingAction {
    static getPossibles() {
        const actions = []
        for (let from = 0; from < 81; from++) {
            const fromTop = Engine.board[from].pieceOnTop()
            if (!fromTop || Engine.isEnemy(fromTop)) continue
            Engine.loadPossibleMoves(from)
            for (let to = 0; to < 81; to++)
                if (Engine.possibleMoves[to] && !Engine.board[to].isEmpty() && Engine.isEnemy(Engine.board[to].pieceOnTop()))
                    actions.push(new CaptureAction(Engine.board[from], Engine.board[to]))
        }
        return actions
    }

    constructor(origin, target) {
        super("Capture")
        this.origin = origin
        this.piece = origin.pieceOnTop()
        this.target = target
        this.captured = target.pieceOnTop()
        this.checkRules()
    }

    checkRules() {
        const reasons = []

        if (this.target.hasPieceOfSameKind(this.piece))
            reasons.push("La Torre ya contiene esta pieza")

        if (this.piece instanceof Joker) {
            if (Engine.possibleEnemyCheck(this.piece, this.target, this.target.getTier()-1))
                reasons.push("Falta - Jaque por Bufón")
            if (Engine.currentPlayer.doubleJokerInPosition(this.target.position))
                reasons.push("Falta - Doble Bufón")
        }

        const aux = [...this.origin.pieces]
        if (Engine.possiblePlayerCheck(this.piece, this.target, this.target.getTier()-1, (this.piece instanceof King) ? this.target.position : Engine.currentPlayer.king.position))
            reasons.push(Engine.currentPlayer.isInCheck ? "El Rey sigue en Jaque" : "Se pondría al Rey en jaque")
        this.origin.pieces = aux

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    betrayalEffect() {
        const pieces = [...this.target.pieces]
        this.target.pieces.length = 0

        for (const piece of pieces) {
            if (piece instanceof Griffin) {
                // [Rule] - Griffin no flip
                this.target.push(piece)
                continue
            }

            if (piece instanceof Joker)
                piece.army.jokers[this.target.column] = false
            else if (piece instanceof Pawn)
                piece.army.pawnsInColumn[this.target.column]--

            const otherSide = piece.otherSide
            if (otherSide.hasSameKind(this.piece))
                Engine.setVictory(Engine.enemyPlayer, 'Misma pieza dentro de la torre')
            else if (otherSide instanceof Joker) {
                if (otherSide.army.jokers[this.target.column])
                    Engine.setVictory(otherSide.army.enemy, 'Doble "Bufón"')
                else
                    piece.army.jokers[this.target.column] = true
            } else if (otherSide instanceof Pawn)
                otherSide.army.pawnsInColumn[this.target.column]++

            this.target.push(otherSide)
        }
    }
    
    execute() {
        this.target.pop()
        this.captured.position = -1

        if (this.piece instanceof Joker && !this.target.isEmpty())
            this.betrayalEffect()

        this.executeMoving(Engine.currentPlayer)

        if (this.captured instanceof Pawn)
            Engine.enemyPlayer.pawnsInColumn[this.target.column]--
        else if (this.captured instanceof Joker)
            Engine.enemyPlayer.jokers[this.target.column] = false

        if (this.captured instanceof Griffin)
            Engine.currentPlayer.relocated = this.captured.otherSide
        else if (this.piece instanceof Captain)
            Engine.currentPlayer.recruited = this.captured.otherSide
        else {
            Engine.currentPlayer.piecesInHand.push(this.captured.otherSide)
            console.log(Engine.currentPlayer.name + " : " + this.captured.otherSide.letter + ", captura, reserva: [" + Engine.currentPlayer.piecesInHand.map(p => p.letter) + "]");
        }

        const recentlyRecovered = Engine.currentPlayer.pickRecentlyRecovered()
        if (recentlyRecovered) {
            if (recentlyRecovered instanceof Griffin)
                Engine.enemyPlayer.relocated = recentlyRecovered.otherSide
            else
                Engine.enemyPlayer.enemyRecovered = recentlyRecovered.otherSide
        }

        if (Engine.settings.withCrown && this.piece instanceof King && this.target.getTier() > 1 && Engine.isEnemy(this.target.pieceBelowTop()))
            Engine.currentPlayer.crown = this.target

        console.log("Tras captura " + Engine.currentPlayer.name + ": [" + Engine.currentPlayer.piecesInHand.map(p => p.letter) + "]");
    }
}

class CaptureInTowerAction extends Action {
    static getPossibles() {
        const actions = []

        Engine.board.filter(square => !square.isEmpty()).forEach(square => {
            if (square.pieces[1] && Engine.isEnemy(square.pieces[1]) && (Engine.isAlly(square.pieces[0]) || square.pieces[2] && Engine.isAlly(square.pieces[2])))
                actions.push(new CaptureInTowerAction(square, 1))

            if (square.pieces[1] && Engine.isAlly(square.pieces[1])) {
                if (Engine.isEnemy(square.pieces[0]))
                    actions.push(new CaptureInTowerAction(square, 0))
                if (square.pieces[2] && Engine.isEnemy(square.pieces[2]))
                    actions.push(new CaptureInTowerAction(square, 2))
            }
        })
        
        return actions
    }

    constructor(target, tier) {
        super("Capture_In_Tower")
        this.target = target
        this.tier = tier
        this.captured = target.pieces[tier]
        this.checkRules()
    }

    checkRules() {
        const reasons = []

        const piece = this.target.pieceOnTop()

        if (piece instanceof Joker && this.tier === this.target.getTier() - 1 && Engine.possibleEnemyCheck(piece, this.target, this.tier))
            reasons.push("Falta - Jaque por Bufón")

        const aux = [...this.target.pieces]
        this.target.pieces = this.target.pieces.filter((_, i) => i !== this.tier)
        if (Engine.possiblePlayerCheck(piece, this.target, null, Engine.currentPlayer.king.position))
            reasons.push(Engine.currentPlayer.isInCheck ? "El Rey sigue en Jaque" : "Se pondría al Rey en jaque")
        this.target.pieces = aux

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    execute() {
        if (this.tier === 1) {
            this.target.pieces.splice(1, 1)
        } else if (this.tier === 0) {
            const piece = this.target.pieces[1]
            if (piece.hasLimitedDropAt(this.target, 0)) {
                if (piece instanceof Griffin)
                    Engine.enemyPlayer.relocated = piece.otherSide
                else
                    Engine.enemyPlayer.enemyRecovered = piece.otherSide

                if (piece instanceof Pawn)
                    Engine.currentPlayer.pawnsInColumn[this.target.column]--
                this.target.pieces.splice(0, 2)
            } else
                this.target.pieces.splice(0, 1)
        } else 
            this.target.pop()

        this.captured.position = -1
        if (this.captured instanceof Pawn)
            this.captured.army.pawnsInColumn[this.target.column]--
        else if (this.captured instanceof Joker)
            this.captured.army.jokers[this.target.column] = false
        else if (this.captured instanceof Griffin)
            Engine.currentPlayer.relocated = this.captured.otherSide
        else {
            Engine.currentPlayer.piecesInHand.push(this.captured.otherSide)
            console.log(Engine.currentPlayer.name + " : " + this.captured.otherSide + ", captura en torre, reserva: [" + Engine.currentPlayer.piecesInHand.map(p => p.letter) + "]");
        }
    }
}

class WithDropingAction extends Action {
    constructor(name) {
        super(name)
    }

    execute() {
        if (this.piece instanceof Pawn)
            this.piece.army.pawnsInColumn[this.target.column]++
        else if (this.piece instanceof Joker)
            this.piece.army.jokers[this.target.column] = true
                
        this.piece.army.removeInHand(this.piece)
        this.target.push(this.piece)

        // console.log("Tras renovar '" + this.piece.letter + "' " + this.piece.army.name + ": [" + this.piece.army.piecesInHand.map(p => p.letter) + "]");
    }
}

class DropAction extends WithDropingAction {
    static getPossibles() {
        const actions = []

        for (const piece of Engine.currentPlayer.piecesInHand) {
            for (const square of Engine.board)
                actions.push(new DropAction(piece, square))
        }

       return actions
    }

    constructor(piece, target) {
        super("Drop")
        this.piece = piece
        this.target = target
        this.checkRules()
    }

    checkRules() {
        const reasons = []
        const targetTop = this.target.pieceOnTop()
        if (targetTop && Engine.isEnemy(targetTop))
            reasons.push("La cima es enemiga")

        if (targetTop && !targetTop.hasFoundation)
            reasons.push("La cima no tiene Cimiento")

        if (this.target.hasPieceOfSameKind(this.piece))
            reasons.push("La Torre ya contiene esta pieza")
        
        if (this.target.isFull()) {
            reasons.push("Es una torre nivel 3");
        } else {
            if (this.piece instanceof Joker) {
                if (Engine.possibleEnemyCheck(this.piece, this.target, this.target.getTier()))
                    reasons.push("Falta - Jaque por Bufón")
                if (Engine.currentPlayer.doubleJokerInPosition(this.target.position))
                    reasons.push("Falta - Doble Bufón")
            } else if (this.piece instanceof Pawn) {
                if (Engine.possibleEnemyCheck(this.piece, this.target, this.target.getTier()))
                    reasons.push("Falta - Jaque por Peón")
                if (Engine.currentPlayer.doublePawnInPosition(this.target.position))
                    reasons.push("Falta - Doble Peón")
            }

            if (this.piece.hasLimitedDropAt(this.target))
                reasons.push("Renovación Acotada")
            
            if (Engine.currentPlayer.isInCheck && Engine.possiblePlayerCheck(this.piece, this.target, this.target.getTier(), Engine.currentPlayer.king.position))
                reasons.push("El Rey sigue en Jaque")
        }

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }
}

class SwitchAction extends Action {
    static getPossibles() {
        return Engine.board
            .filter(square => square.getTier() === 3)
            .filter(square => Engine.isAlly(square.pieceOnBase()) && Engine.isAlly(square.pieceOnTop()))
            .filter(square => square.pieceOnBase() instanceof Captain || square.pieceOnTop() instanceof Captain)
            .map(square => new SwitchAction(square))
    }

    constructor(target) {
        super("Switch")
        this.target = target
        this.checkRules()
    }

    checkRules() {
        const reasons = []

        if (this.target === Engine.currentPlayer.lastSwitch)
            reasons.push("Ya se hizo permutación en esa casilla")
        
        if (this.target.pieceOnTop() instanceof King)
            reasons.push("La cima es un Rey")
        
        const base = this.target.pieceOnBase()
        if (base instanceof Fortress)
            reasons.push("La base es una Fortaleza");
        else if (base instanceof Cannon)
            reasons.push("La base es un Cañón");
        else if (base instanceof Joker) {
            if (Engine.possibleEnemyCheck(base, this.target, 2))
                reasons.push("Falta - Jaque por Bufón")
        }
        
        if (Engine.currentPlayer.isInCheck)
            reasons.push("El Rey sigue en Jaque")

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    execute() {
        Engine.currentPlayer.lastSwitch = this.target
        this.target.pieces.reverse()
    }
}

class SacrificeAction extends Action {
    static getPossibles() {
        const actions = []

        if (Engine.currentPlayer.isInCheck) {
            const kingSquare = Engine.board[Engine.currentPlayer.king.position]
            const sides = []
            if (kingSquare.column > 0) sides.push(Engine.board[Engine.currentPlayer.king.position-1])
            if (kingSquare.column < 8) sides.push(Engine.board[Engine.currentPlayer.king.position+1])
            if (kingSquare.row > 0) sides.push(Engine.board[Engine.currentPlayer.king.position-9])
            if (kingSquare.row < 8) sides.push(Engine.board[Engine.currentPlayer.king.position+9])
            for (const side of sides) {
                const top = side.pieceOnTop()
                if (top && Engine.isAlly(top) && top instanceof Swordsman)
                    actions.push(new SacrificeAction(Engine.board[Engine.currentPlayer.king.position], side))
            }
        }
        
        return actions
    }

    constructor(target, origin) {
        super("Sacrifice")
        this.origin = origin
        this.target = target
        this.checkRules()
    }

    checkRules() {
        const reasons = []
        const tier = this.origin.getTier()

        if (tier > 1)
            reasons.push("El Espadachín no está en el nivel 1")
        
        if (tier > 0 && this.target.hasPieceOfSameKind(this.origin.pieceOnTop()))
            reasons.push("Ya hay un Espadachín en esa Torre")
        
        if (Engine.possiblePlayerCheck(this.origin.pieceOnTop(), this.origin, tier - 1, this.origin.position))
            reasons.push("Se pondría al Rey en jaque")

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }
    
    execute() {
        const king = this.target.pop(), swordsman = this.origin.pop()
        this.origin.push(king)
        this.target.push(swordsman)
    }
}

class MountAction extends WithMovingAction {
    static getPossibles() {
        const actions = []

        Engine.board
            .filter(square => square.getTier() > 1)
            .filter(square => Engine.isAlly(square.pieceOnBase()))
            .filter(square => square.pieceOnBase().hasMount)
            .forEach(origin => {
                Engine.loadMountMoves(origin.position)
                for (let i = 0; i < 81; i++)
                    if (Engine.board[i].isEmpty() && Engine.possibleMoves[i])
                        actions.push(new MountAction(origin, Engine.board[i]))
            })
        
        return actions
    }

    constructor(origin, target) {
        super("Mount")
        this.origin = origin
        this.target = target
        this.checkRules()
    }

    checkRules() {
        const reasons = []

        const originTop = this.origin.pieceOnTop()

        if (originTop instanceof Joker && Engine.isAlly(originTop)) {
            if (Engine.possibleEnemyCheck(originTop, this.target, this.origin.getTier()-1))
                reasons.push("Falta - Jaque por Bufón")
            if (Engine.currentPlayer.doubleJokerInPosition(this.target.position))
                reasons.push("Falta - Doble Bufón")
        }

        const aux = [...this.origin.pieces]
        this.origin.pieces.length = 0
        this.target.pieces = aux

        const position = ((originTop instanceof King && Engine.isAlly(originTop)) ? this.target : Engine.currentPlayer.king).position
        if (Engine.currentPlayer.isInCheck) {
            if (Engine.possiblePlayerCheck(originTop, this.target, 0, position))
                reasons.push("El Rey sigue en Jaque")
        } else if (Engine.possiblePlayerCheck(originTop, this.target, null, position))
            reasons.push("Se pondría al Rey en jaque")
        this.origin.pieces = aux
        this.target.pieces = []

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    execute() {
        const pieces = this.origin.pieces
        this.origin.pieces = []
        for (const piece of pieces) {
            this.piece = piece
            this.origin.pieces.push(piece)
            this.executeMoving(Engine.isAlly(piece) ? Engine.currentPlayer : Engine.enemyPlayer)
        }
    }
}

class SubstituteAction extends Action {
    static getPossibles() {
        const actions = []

        Engine.board.forEach(square => {
            for (let tier = 0; tier < square.getTier(); tier++)
                if (Engine.isAlly(square.pieces[tier]) && square.pieces[tier] instanceof Lanceman)
                    for (const piece of Engine.currentPlayer.piecesInHand)
                        actions.push(new SubstituteAction(square, piece, tier))
        })
        
        return actions
    }

    constructor(target, piece, tier) {
        super("Substitute")
        this.target = target
        this.piece = piece
        this.tier = tier
        this.checkRules()
    }

    checkRules() {
        const reasons = []

        if (this.piece instanceof Joker) {
            if (Engine.possibleEnemyCheck(this.piece, this.target, this.target.getTier()-1))
                reasons.push("Falta - Jaque por Bufón")
            if (Engine.currentPlayer.doubleJokerInPosition(this.target.position))
                reasons.push("Falta - Doble Bufón")
        } else if (this.piece instanceof Pawn) {
            if (Engine.possibleEnemyCheck(this.piece, this.target, this.target.getTier()-1))
                reasons.push("Falta - Jaque por Peón")
        } else if (this.piece instanceof Lanceman)
            reasons.push("No se puede sustituir por otro Lancero")

        if (Engine.currentPlayer.isInCheck)
            reasons.push("El Rey sigue en Jaque")

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    execute() {
        if (this.piece instanceof Pawn)
            this.piece.army.pawnsInColumn[this.target.column]++
        else if (this.piece instanceof Joker)
            this.piece.army.jokers[this.target.column] = true
        
        this.piece.army.addInHand(this.target.pieces[this.tier])
        this.piece.army.removeInHand(this.piece)
        console.log(this.piece.army.name + " : " + this.target.pieces.map(p => p.letter) + ", sustitución, reserva: [" + this.piece.army.piecesInHand.map(p => p.letter) + "]");
        this.target.replaceAt(this.tier, this.piece)
    }
}

class RelocateAction extends Action {
    static getPossibles() {
        const actions = []

        if (Engine.currentPlayer.relocated)
            Engine.board.forEach(square => actions.push(new RelocateAction(square)))
        
        return actions
    }

    constructor(target) {
        super("Relocate")
        this.target = target
        this.checkRules()
    }

    checkRules() {
        const reasons = []

        if (Engine.currentPlayer.isBelow && this.target.position < 6 * 9 || !Engine.currentPlayer.isBelow && this.target.position > 3 * 9)
            reasons.push("Está fuera del Territorio")
        else if (!this.target.isEmpty())
            reasons.push("La casilla no está libre")

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    execute() {
        this.target.push(Engine.currentPlayer.relocated)
        Engine.currentPlayer.relocated = null
        console.log("Tras reubicar " + Engine.currentPlayer.name + ": [" + Engine.currentPlayer.piecesInHand.map(p => p.letter) + "]");
    }
}

class RecruitAction extends Action {
    static getPossibles() {
        const actions = []

        if (Engine.currentPlayer.recruited)
            Engine.board.forEach(square => actions.push(new RecruitAction(square)))
        
        return actions
    }

    constructor(target) {
        super("Recruit")
        this.target = target
        this.checkRules()
    }

    checkRules() {
        const reasons = []

        if (Engine.currentPlayer.isBelow && this.target.position < 6 * 9 || !Engine.currentPlayer.isBelow && this.target.position >= 3 * 9)
            reasons.push("Está fuera del Territorio")
        else {
            const recruited = Engine.currentPlayer.recruited
            if (!this.target.isEmpty()) {
                const top = this.target.pieceOnTop()
                if (Engine.isEnemy(top))
                    reasons.push("La cima es enemiga")
                else if (top instanceof King)
                    reasons.push("La cima es el Rey")
            }
            
            if (this.target.hasPieceOfSameKind(recruited))
                reasons.push("La Torre ya contiene esta pieza")
            
            if (this.target.getTier() === 3) {
                reasons.push("Es una torre nivel 3")
            } else {
                if (recruited instanceof Joker) {
                    if (Engine.possibleEnemyCheck(recruited, this.target, this.target.getTier()))
                        reasons.push("Falta - Jaque por Bufón")
                    if (Engine.currentPlayer.doubleJokerInPosition(this.target.position))
                        reasons.push("Falta - Doble Bufón")
                } else if (this.piece instanceof Pawn) {
                    if (Engine.possibleEnemyCheck(recruited, this.target, this.target.getTier()))
                        reasons.push("Falta - Jaque por Peón")
                    if (Engine.currentPlayer.doublePawnInPosition(this.target.position))
                        reasons.push("Falta - Doble Peón")
                }
            }
        }

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    execute() {
        const piece = Engine.currentPlayer.recruited
        if (this.target) {
            if (piece instanceof Pawn)
                piece.army.pawnsInColumn[this.target.column]++
            else if (piece instanceof Joker)
                piece.army.jokers[this.target.column] = true

            this.target.push(piece)
        } else
            piece.army.addInHand(piece)

        piece.army.recruited = null
    }
}

class CrownWithReplacementAction extends Action {
    static getPossibles() {
        const actions = []

        if (Engine.currentPlayer.crown)
            Engine.currentPlayer.piecesInHand.forEach(piece => actions.push(new CrownWithReplacementAction(Engine.currentPlayer.crown, piece)))
        
        return actions
    }

    constructor(target, piece) {
        super("Crown_With_Replacement")
        this.target = target
        this.piece = piece
        this.captured = target.pieceBelowTop()
        this.checkRules()
    }

    checkRules() {
        const reasons = []

        if (this.target.hasPieceOfSameKind(this.piece))
            reasons.push("La Torre ya contiene esta pieza")

        if (this.piece instanceof Joker)
            if (Engine.currentPlayer.doubleJokerInPosition(this.target.position))
                reasons.push("Falta - Doble Bufón")

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    execute() {
        if (this.captured instanceof Griffin)
            this.piece.army.relocated = this.captured.otherSide
        else {

            if (this.captured instanceof Pawn)
                this.captured.army.pawnsInColumn[this.target.column]--
            else if (this.captured instanceof Joker)
                this.captured.army.jokers[this.target.column] = false

            this.piece.army.addInHand(this.captured.otherSide)
            console.log(this.piece.army.name + " : " + this.captured.otherSide.letter + ", corona con reemplazo, reserva: [" + this.piece.army.piecesInHand.map(p => p.letter) + "]");
        }
        
        this.piece.army.removeInHand(this.piece)
        this.target.pieces[this.target.getTier()-2] = this.piece

        if (this.piece instanceof Pawn)
            this.piece.army.pawnsInColumn[this.target.column]++
        else if (this.piece instanceof Joker)
            this.piece.army.jokers[this.target.column] = true

        this.piece.army.crown = null
    }
}

class CrownWithoutReplacementAction extends Action {
    static getPossibles() {
        const actions = []

        if (Engine.currentPlayer.crown)
            actions.push(new CrownWithoutReplacementAction(Engine.currentPlayer.crown))
        
        return actions
    }

    constructor(target) {
        super("Crown_Without_Replacement")
        this.target = target
        this.captured = target.pieceBelowTop()
        this.piece = this.captured.otherSide
        this.checkRules()
    }

    checkRules() {
        const reasons = []

        if (this.target.hasPieceOfSameKind(this.piece))
            reasons.push("La Torre ya contiene esta pieza")

        if (this.piece instanceof Joker)
            if (Engine.currentPlayer.doubleJokerInPosition(this.target.position))
                reasons.push("Falta - Doble Bufón")

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    execute() {
        if (this.captured instanceof Griffin) {
            if (this.target.getTier() === 2) {
                this.target.replaceAt(0, this.piece)
            } else {
                const king = this.target.pop()
                this.target.pop()
                this.target.push(king)
                this.piece.army.relocated = this.piece
            }
        } else {
            if (this.captured instanceof Pawn)
                this.captured.army.pawnsInColumn[this.target.column]--
            else if (this.captured instanceof Joker)
                this.captured.army.jokers[this.target.column] = false
            this.target.replaceAt(this.target.getTier()-2, this.piece)
        }

        if (this.piece instanceof Pawn)
            this.piece.army.pawnsInColumn[this.target.column]++
        else if (this.piece instanceof Joker)
            this.piece.army.jokers[this.target.column] = true

        this.piece.army.crown = null
    }
}

class PutAction extends WithDropingAction {
    static getPossibles() {
        const actions = []

        for (const piece of Engine.currentPlayer.piecesInHand) {
            const from = Engine.currentPlayer.isBelow ? 6 * 9 : 0
            for (let pos = 0; pos < 27; pos++)
                actions.push(new PutAction(piece, Engine.board[from + pos]))
        }
        
        return actions
    }

    constructor(piece, target) {
        super("Put")
        this.piece = piece
        this.target = target
        this.checkRules()
    }

    checkRules() {
        const reasons = []

        if (!this.target.isEmpty()) {
            if (this.target.pieceOnTop() instanceof King)
                reasons.push("El Rey está en la cima")

            if (this.piece instanceof Fortress)
                reasons.push("La Fortaleza debe ir sobre una casilla vacía.")
            if (this.piece instanceof Cannon)
                reasons.push("El Cañón debe ir sobre una casilla vacía.")
        }

        if (this.target.hasPieceOfSameKind(this.piece))
            reasons.push("La Torre ya contiene esta pieza")

        if (this.target.getTier() === 3)
            reasons.push("Es una torre nivel 3")
        else if (this.piece instanceof Pawn && Engine.currentPlayer.doublePawnInPosition(this.target.position))
            reasons.push("Falta - Doble Peón")

        this.isLegal = reasons.length === 0
        if (reasons.length)
            this.reasons = reasons
    }

    execute() {
        super.execute()
        this.piece.army.fillPromotion()
    }
}

class RemoveAction extends Action {
    static getPossibles() {
        const [from, to] = Engine.currentPlayer.isBelow ? [6 * 9, 9 * 9] : [0, 3 * 9]
        return Engine.board.slice(from, to)
            .filter(square => !square.isEmpty())
            .map(square => new RemoveAction(square))
    }

    constructor(target) {
        super("Remove")
        this.target = target
    }

    execute() {
        const piece = this.target.pop()
        piece.army.addInHand(piece)
        piece.army.fillPromotion()

        if (piece instanceof Pawn)
            piece.army.pawnsInColumn[this.target.column]--
    }
}

class NoneAction extends Action{
    constructor() {
        super("None")
    }
}
