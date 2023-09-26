const Parser = (() => {

    class ParserError {
        constructor(msg, i) {
            this.msg = msg
            this.i = i
        }
    }

    class ParserResult {
        constructor(res, i) {
            this.res = res
            this.i = i
        }
    }

    const or = (...fns) => (str, i) => {
        while (/\s/.test(str[i])) i++
        let res = null
        for (const f of fns) {
            res = f(str, i)
            if (res instanceof ParserResult)
                return res
        }
        return res
    }
    
    const and = (...fns) => (str, i) => {
        while (/\s/.test(str[i])) i++
        const res = []
        for (const f of fns) {
            const r = f(str, i)
            if (r instanceof ParserResult) {
                res.push(r.res)
                i = r.i
            } else {
                return r
            }
        }

        return new ParserResult(res, i)
    }

    const zeroOrMore = fn => (str, i) => {
        while (/\s/.test(str[i])) i++
        const res = []
        let r = fn(str, i)
        while (r instanceof ParserResult) {
            res.push(r.res)
            i = r.i
            r = fn(str, i)
        }

        return new ParserResult(res, i)
    }

    const oneOrMore = fn => (str, i) => {
        while (/\s/.test(str[i])) i++
        const res = []
        let r = fn(str, i)

        if (r instanceof ParserError)
            return r

        while (r instanceof ParserResult) {
            res.push(r.res)
            i = r.i
            r = fn(str, i)
        }

        return new ParserResult(res, i)
    }

    const apply = (parser, fn) => (str, i) => {
        const res = parser(str, i)
        if (res instanceof ParserResult) res.res = fn(res.res)
        return res
    }

    const lit = txt => (str, i) => {
        const r = str.slice(i, i + txt.length)
        return r === txt ? new ParserResult(r, i + txt.length) : new ParserError(`"${txt}" expected, got: "${r}"`, i)
    }

    const digit = (str, i) => {
        const num = parseInt(str[i])
        return isNaN(num) ? new ParserError(`Number expected, got: "${num}"`) : new ParserResult(num, i+1)
    }

    const pieces = "RrSsPpYyIiAaLlUuQqTtFfNnzZbBmMjJcCdDxXeEoOgGwW"
    const Piece = (str, i) => {
        const piece = str[i]
        return pieces.includes(piece) ? new ParserResult(piece, i+1) : new ParserError(`Piece expected, got: "${piece}"`)
    }

    const UntilSemicolon = (str, i) => {
        const res = str.substr(i, str.slice(i).indexOf(";"))
        return new ParserResult(res, i+res.length)
    }

    const Square = (str, i) => {
        const chars = str[i] + str[i+1]
        return (!chars || !chars.match(/[a-i][1-9]/))
            ? new ParserError(`Square expected, got: "${chars}"`)
            : new ParserResult((chars.charCodeAt(1) - 49) * 27 + (chars.charCodeAt(0) - 97) * 3, i+2)
    }

    const Squares = apply(
        oneOrMore( or(
            apply( and( lit("("), Piece, Piece, lit(")") ), res => res[1] + res[2] ),
            apply( and( lit("("), Piece, Piece, Piece, lit(")") ), res => res[1] + res[2] + res[3] ),
            digit,
            Piece
        ) ),
        res => res.reduce((acc, r) => acc + (isNaN(r) ? (r + "..").slice(0, 3) : "".padEnd(r*3, ".")), "")
    )

    const Row = apply( and( Squares, lit("/") ), res => res[0] )
    const Board = apply( and( Row, Row, Row, Row, Row, Row, Row, Row, Row ), res => res.reduce((acc, r) => acc + r, "") )
    const Num = apply( oneOrMore( digit ), res => res.reduce((acc, d) => acc * 10 + d, 0) )
    const Comment = zeroOrMore( apply( and( lit(";"), UntilSemicolon, lit(";") ), res => res[1] ) )
    const InitialEffect = apply(
        zeroOrMore( apply( and(lit(",("), Square, lit(")")), res => ({ initialRelocation: res[1] }) ) ),
        res => res.reduce((acc, r) => Object.assign(acc, r), {})
    )
    const ActionParser = or(
        apply(
            and(Square, lit("-"), Square),
            res => ({ origin: res[0], target: res[2], actionHandler: RecordPlayer.actionHandlers.move}) 
        ),
        apply(
            and(Square, lit("x"), Square),
            res => ({ origin: res[0], target: res[2], actionHandler: RecordPlayer.actionHandlers.capture}) 
        ),
        apply(
            and(Square, lit("="), Square),
            res => ({ origin: res[0], target: res[2], actionHandler: RecordPlayer.actionHandlers.sacrifice}) 
        ),
        apply(
            and(Square, lit("~"), Square),
            res => ({ origin: res[0], target: res[2], actionHandler: RecordPlayer.actionHandlers.mount}) 
        ),
        apply(
            and(Piece, lit("*"), Square),
            res => ({ piece: res[0], target: res[2], actionHandler: RecordPlayer.actionHandlers.drop}) 
        ),
        apply(
            and(lit(":"), Square),
            res => ({ target: res[1], actionHandler: RecordPlayer.actionHandlers.switch}) 
        ),
        apply(
            and(digit, lit("x"), Square),
            res => ({ tier: res[0] - 1, target: res[2], actionHandler: RecordPlayer.actionHandlers.captureInTower}) 
        ),
        apply(
            and(Square, lit("<>"), Piece),
            res => ({ piece: res[2], target: res[0], actionHandler: RecordPlayer.actionHandlers.substitute}) 
        )
    )
    const FinalEffect = apply(
        zeroOrMore( or(
            apply( lit("+"), () => ({ inCheck: true }) ),
            apply( lit("^"), () => ({ recover: true }) ),
            apply( lit("$"), () => ({ betrayal: true }) ),
            apply( and( lit("("), Square, lit(")") ), res => ({ relocation: res[1] }) ),
            apply( and( lit("{"), or(Piece, lit("0")), lit("}") ), res => ({ crown: res[1] }) ),
        ) ),
        res => res.reduce((acc, r) => Object.assign(acc, r), {})
    )
    const Evaluation = or(lit("!!"), lit("!"), lit("??"), lit("?"), lit(""))

    const Move = apply(
        and( Comment, InitialEffect, ActionParser, FinalEffect, Evaluation ),
        res => {
            const obj = {}
            if (res[0].length) obj.comments = res[0]
            if (res[1]) Object.assign(obj, res[1])
            Object.assign(obj, res[2])
            if (res[3]) Object.assign(obj, res[3])
            if (res[4]) obj.evaluation = res[4]
            return obj
        }
    )
    const Turn = or(
        apply( and(Num, lit("."), Move, Move), res => [ res[2], res[3] ] ),
        apply( and(Num, lit("."), Move), res => [ res[2] ] )
    )
    const ListTurns = zeroOrMore(Turn)
    const Victory = or(
        apply( and( lit("#"), Comment ), res => ({ reason: res[1][0] }) ),
        lit("")
    )
    const Record = apply(
        and( Board, ListTurns, Victory ),
        res => (res[2] ? { board: res[0], moves: res[1], victory: res[2] } : { board: res[0], moves: res[1] })
    )

    return {
        parse(str) {
            return Record(str, 0)
        },

        ParserError,
        ParserResult
    }
})()
