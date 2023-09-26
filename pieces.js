class MoveSet {
    constructor(move, slides = "") {
        this.move = move.replace(/\s/g, "").split("").map(c => c === "#" ? true : false)
        this.slides = new Set(slides.split(" "))
    }

    slide(r0, c0, dr, dc, board) {
        for (let r = r0, c = c0; r >= 0 && c >= 0 && r < 9 && c < 9; r += dr, c += dc) {
            board[r * 9 + c] = true
            if (!Engine.board[r * 9 + c].isEmpty())
                break
        }
    }

    setBoard(pos, board, flip) {
        const i0 = flip ? 24 : 0, di = flip ? -1 : 1
        const column = pos % 9, row = ~~(pos / 9)
        for (let r = row - 2, i = i0; r <= row + 2; r++) {
            for (let c = column - 2; c <= column + 2; c++, i+=di) {
                if (this.move[i] && c >= 0 && c < 9 && r >= 0 && r < 9)
                    board[r * 9 + c] = true
            }
        }
        if (!flip && this.slides.has("N") || flip && this.slides.has("S"))
            this.slide(row-1, column, -1, 0, board)
        if (!flip && this.slides.has("S") || flip && this.slides.has("N"))
            this.slide(row+1, column, 1, 0, board)
        if (!flip && this.slides.has("E") || flip && this.slides.has("W"))
            this.slide(row, column+1, 0, 1, board)
        if (!flip && this.slides.has("W") || flip && this.slides.has("E"))
            this.slide(row, column-1, 0, -1, board)

        if (!flip && this.slides.has("NE") || flip && this.slides.has("SW"))
            this.slide(row-1, column+1, -1, 1, board)
        if (!flip && this.slides.has("NW") || flip && this.slides.has("SE"))
            this.slide(row-1, column-1, -1, -1, board)
        if (!flip && this.slides.has("SE") || flip && this.slides.has("NW"))
            this.slide(row+1, column+1, 1, 1, board)
        if (!flip && this.slides.has("SW") || flip && this.slides.has("NE"))
            this.slide(row+1, column-1, 1, -1, board)
    }
}

class Piece {
    position = -1

    constructor(letter, canPromote, otherSideType, isFrontalPiece) {
        this.letter = letter
        this.canPromote = canPromote
        this.otherSideType = otherSideType
        this.isFrontalPiece = isFrontalPiece
        if (isFrontalPiece && otherSideType) {
            this.otherSide = new otherSideType()
            this.otherSide.otherSide = this
        }
    }

    flip() {
        if (!this.moveSet) return
        this.moveSet.forEach(moveSet => moveSet.flip())
    }

    hasSameKind(piece) {
        return this.constructor === piece.constructor
    }

    hasLimitedDropAt() {
        return false
    }

    toText() {
        return this.army === Engine.whiteArmy ? this.letter.toLowerCase() : this.letter.toUpperCase()
    }
}

class King extends Piece {
    constructor(){
        super("R", true, null, true)
        this.moveSet = Array(3).fill(new MoveSet(`
        .....
        .###.
        .#.#.
        .###.
        .....
        `))
    }
}

class Swordsman extends Piece {
    constructor(){
        super("S", true, Lanceman, true)
        this.moveSet = [new MoveSet(`
        .....
        .###.
        .#.#.
        ..#..
        .....
        `), new MoveSet(`
        ..#..
        .#.#.
        .#.#.
        .....
        ..#..
        `)]
        this.moveSet[2] = this.moveSet[1]
    }
}

class Lanceman extends Piece {
    constructor(){
        super("Z", true, Swordsman, false)
        this.moveSet = Array(3).fill(new MoveSet(`
        ..#..
        ..#..
        .#.#.
        ..#..
        .....
        `))
    }
}

class Pawn extends Piece {

    constructor(letter, otherSideType){
        super(letter, true, otherSideType, true)
        this.moveSet = [new MoveSet(`
        .....
        ..#..
        .....
        .....
        .....
        `), new MoveSet(`
        .....
        ..#..
        #...#
        .....
        .....
        `), new MoveSet(`
        .....
        .#.#.
        #...#
        .....
        .....
        `)]
    }

    hasSameKind(piece) {
        return piece instanceof Pawn
    }
    
    hasLimitedDropAt(square, tier) {
        tier = tier === undefined ? square.getTier() : tier
        return tier === 0 && square.row == (this.army.isBelow ? 0 : 8)
    }
}

class PawnOfJoker extends Pawn {
    constructor(){
        super("P", Joker)
    }
}

class PawnOfMajor extends Pawn {
    constructor(){
        super("Y", Major)
    }
}

class PawnOfPig extends Pawn {
    constructor(){
        super("I", WildPig)
    }
}

class Joker extends Piece {
    constructor(){
        super("B", true, PawnOfJoker, false)
        this.moveSet = Array(3).fill(new MoveSet(`
        .....
        .....
        .#.#.
        .....
        .....
        `))
    }
}

class Major extends Piece {
    constructor(){
        super("M", true, PawnOfMajor, false)
        this.moveSet = Array(3).fill(new MoveSet(`
        .....
        .###.
        .#.#.
        ..#..
        .....
        `))
    }
}

class WildPig extends Piece {
    hasMount = true

    constructor(){
        super("J", true, PawnOfPig, false)
        this.moveSet = [new MoveSet(`
        .....
        ..#..
        .#.#.
        ..#..
        .....
        `), new MoveSet(`
        .....
        .#.#.
        .....
        .#.#.
        .....
        `)]
        this.moveSet[2] = this.moveSet[1]
        this.mountMoveSet = new MoveSet(`
        .....
        .#.#.
        .....
        .#.#.
        .....
        `)
    }
}

class Assassin extends Piece {
    hasFoundation = true

    constructor(){
        super("A", true, Horse, true)
        this.moveSet = [new MoveSet(`
        .#.#.
        .....
        .....
        .....
        .....
        `), new MoveSet(`
        .#.#.
        .#.#.
        .....
        .....
        .....
        `)]
        this.moveSet[2] = this.moveSet[1]
    }

    hasLimitedDropAt(square, tier) {
        tier = tier === undefined ? square.getTier() : tier
        if (tier === 0)
            return this.army.isBelow ? (square.row === 0 || square.row === 1) : (square.row === 7 || square.row === 8)
        return square.row === (this.army.isBelow ? 0 : 8)
    }
}

class Horse extends Piece {
    hasFoundation = true

    constructor(){
        super("C", true, Assassin, false)
        this.moveSet = [new MoveSet(`
        .#.#.
        .....
        .....
        ..#..
        .....
        `), new MoveSet(`
        .#.#.
        .#.#.
        .....
        ..#..
        .....
        `), new MoveSet(`
        .#.#.
        .#.#.
        .....
        .....
        ##.##
        `)]
    }
}

class Cannon extends Piece {
    hasFoundation = true

    constructor(){
        super("N", true, GriffinOfCannon, true)
        this.moveSet = noMoveSet
    }

    fillBoardPromotion() {
        if (Engine.board[this.position].pieces.length === 2)
            this.army.promotionBoard[this.position] = true
        if (this.army.isBelow) {
            for (let p = this.position - 9; p > 0; p -= 9)
                this.army.promotionBoard[p] = true
        } else {
            for (let p = this.position + 9; p < 81; p += 9)
                this.army.promotionBoard[p] = true
        }
    }
}

class Griffin extends Piece {
    hasImitation = true

    constructor(letter, otherSideType){
        super(letter, true, otherSideType, false)
        this.moveSet = [new MoveSet(`
        .....
        .....
        .....
        .....
        .....
        `, "N"), new MoveSet(`
        .....
        .#.#.
        .....
        .#.#.
        .....
        `)]
        this.moveSet[2] = this.moveSet[1]
    }

    hasSameKind(piece) {
        return piece instanceof Griffin
    }
    
    hasLimitedDropAt(square, tier) {
        tier = tier === undefined ? square.getTier() : tier
        return tier === 0 && square.row == (this.army.isBelow ? 0 : 8)
    }
}

class GriffinOfFortress extends Griffin {
    constructor(){
        super("G", Fortress)
    }
}

class GriffinOfCannon extends Griffin {
    constructor(){
        super("W", Cannon)
    }
}

class Fortress extends Piece {
    hasFoundation = true

    constructor(){
        super("F", true, GriffinOfFortress, true)
        this.moveSet = noMoveSet
    }

    insideDiamond(pos) {
        const cc = (this.position % 9) - (pos % 9), ff = Math.round((pos - this.position) / 9)
        const a = cc + ff, b = -cc + ff
       return a >= -2 && a <= 2 && b >= -2 && b <= 2
    }

    fillBoardPromotion() {
        if (this.army.isBelow) {            
            for (let p = 6 * 9; p < 81; p ++)
                this.army.promotionBoard[p] ||= this.insideDiamond(p)
        } else {
            for (let p = 0; p < 3 * 9; p ++)
                this.army.promotionBoard[p] ||= this.insideDiamond(p)
        }
        if (Engine.board[this.position].pieces.length === 2)
            this.army.promotionBoard[this.position] = true
    }
}

class Lion extends Piece {
    constructor(){
        super("L", false, Dragon, true)
        this.moveSet = [new MoveSet(`
        .....
        .....
        .....
        .....
        .....
        `, "N W E S"), new MoveSet(`
        .....
        .#.#.
        .....
        .#.#.
        .....
        `)]
        this.moveSet[2] = this.moveSet[1]
    }
}

class Dragon extends Piece {
    constructor(){
        super("D", false, Lion, false)
        this.moveSet = [new MoveSet(`
        .....
        .#.#.
        .....
        .#.#.
        .....
        `, "N W E S"), new MoveSet(`
        .....
        .#.#.
        .....
        .#.#.
        .....
        `)]
        this.moveSet[2] = this.moveSet[1]
    }
}

class Unicorn extends Piece {
    hasMount = true

    constructor(){
        super("U", false, Phoenix, true)
        this.moveSet = [new MoveSet(`
        .....
        .....
        .....
        .....
        .....
        `, "NW NE SW SE"), new MoveSet(`
        .....
        ..#..
        .#.#.
        ..#..
        .....
        `)]
        this.moveSet[2] = this.moveSet[1]
        this.mountMoveSet = new MoveSet(`
        .###.
        .###.
        .....
        .....
        .....
        `)
    }
}

class Phoenix extends Piece {
    constructor(){
        super("X", false, Unicorn, false)
        this.moveSet = [new MoveSet(`
        .....
        ..#..
        .#.#.
        ..#..
        .....
        `, "NW NE SW SE"), new MoveSet(`
        .....
        ..#..
        .#.#.
        ..#..
        .....
        `)]
        this.moveSet[2] = this.moveSet[1]
    }
}

class Archer extends Piece {
    constructor(){
        super("Q", true, Elephant, true)
        this.moveSet = [new MoveSet(`
        ..#..
        .....
        #...#
        .....
        .....
        `), new MoveSet(`
        #...#
        ..#..
        .....
        ..#..
        .....
        `), new MoveSet(`
        #...#
        .....
        #...#
        .....
        ..#..
        `)]
    }
}

class Elephant extends Piece {
    hasMount = true

    constructor(){
        super("E", true, Archer, false)
        this.moveSet = [new MoveSet(`
        .....
        ..#..
        .....
        .###.
        .....
        `), new MoveSet(`
        .....
        ..#..
        .....
        ..#..
        #...#
        `), new MoveSet(`
        .....
        ..#..
        .....
        .###.
        #...#
        `)]
        this.mountMoveSet = new MoveSet(`
        .....
        .###.
        .....
        ..#..
        .....
        `)
    }
}

class Captain extends Piece {
    constructor(){
        super("T", true, Bear, true)
        this.moveSet = [new MoveSet(`
        .....
        .###.
        .....
        .#.#.
        .....
        `), new MoveSet(`
        .....
        .###.
        .....
        .###.
        .....
        `), new MoveSet(`
        .....
        .#.#.
        #...#
        .#.#.
        #...#
        `)]
    }
}

class Bear extends Piece {
    hasMount = true

    constructor(){
        super("O", true, Captain, false)
        this.moveSet = [new MoveSet(`
        .....
        .#.#.
        .....
        .#.#.
        .....
        `), new MoveSet(`
        .....
        ..#..
        .#.#.
        ..#..
        .....
        `)]
        this.moveSet[2] = this.moveSet[1]
        this.mountMoveSet = new MoveSet(`
        .....
        ..#..
        .#.#.
        ..#..
        .....
        `)
    }
}

// Move Set of Major
const defaultMoveSet = new MoveSet(`
.....
.###.
.#.#.
..#..
.....
`)

const noMoveSet = Array(3).fill(0).map(() => new MoveSet(`
.....
.....
.....
.....
.....
`))

const otherSideOfPiece = piece =>
		"--zZbBmMjJcCdDxXeEoOgGwWSsPpYyIiAaLlUuQqTtFfNn"["RrSsPpYyIiAaLlUuQqTtFfNnzZbBmMjJcCdDxXeEoOgGwW".indexOf(piece)]
