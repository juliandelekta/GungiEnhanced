/**
 * Módulo encargado del reproductor de partidas
 * 
 * Estado=
 *  move: movimiento realizado
 *  board: estado del tablero luego de realizar el movimiento
 *  ally: estado de la reserva correspondiente al ejército que está jugando luego de realizar el movimiento
 *  enemy: estado de la reserva correspondiente al adversario
 * 
 * Las reservas son una cadena de texto con el siguiente formato:
 * 012345XXXXX....
 * 01 son los dos caracteres reservados a piezas recuperadas aliadas
 * 23 son otros dos caracteres reservados a piezas a reintegrar a la reserva
 * 45 son los dos caracteres reservados a piezas recuperadas enemigas
 * XXX... son las piezas de la reserva
 * En un cambio de turno 2345 se reintegran a XXX..., 01 pasan a 23 y 01 son reemplazados por ..
 */
const RecordPlayer = {
    states: [], // Conjunto de Estado ordenados cronológicamente {board, move, hands:{ally, enemy}}
    currentState: null, // Estado seleccionado actualmente

    dimensions: {
        x: 0,
        border: 0,
        width: 0, height: 0,
        DIM: 0, // Side of a square
        z: 0, // Y offset per tier
    },

    showingTower: null,

    animation: {
		show: false
	},

    lastMove: null,
    moveSelected: null,
    clock: null,
    clockOn: false,
    
    init() {
		this.canvas = document.getElementById("rep-canvas")
		this.ctx = this.canvas.getContext("2d")
		this.movesElement= document.getElementById("movis")
        this.commentsElement = document.getElementById("comentarios")
        this.inputFile = document.getElementById("cargarRep")
		document.getElementById("rep-ant").onclick = () => this.previousMove()
		document.getElementById("rep-sig").onclick = () => this.nextMove()
        this.canvas.onclick = e => this.onClick(e)
		this.canvas.onmousemove = e => this.update(e)

        document.addEventListener("keydown", e => {
            if (!WindowManager.player.isOpen)
				return
            if (e.code === "ArrowRight")
                this.nextMove()
            else if (e.code === "ArrowLeft")
                this.previousMove()
        }, false)
		
		this.inputFile.addEventListener('input', e => this.openRegisterFile(e), false)
		
		this.reset()
	},
    
    draw() {
        const ctx = this.ctx
        const animation = this.animation
        const { x, width, height, border, DIM, z } = this.dimensions
		ctx.drawImage(Renderer.images.board, x, 0, width, height)
		ctx.save()
		ctx.translate(x + border, border)
		if (animation.show) {
			if (animation.move) {
				ctx.fillStyle = "rgba(62, 171, 229, 0.58)"
				ctx.fillRect(animation.x * DIM, animation.y * DIM , DIM, DIM)
			} else if (animation.drop) {
				ctx.fillStyle = "rgba(229, 229, 62, 0.58)"
				ctx.fillRect(animation.x * DIM, animation.y * DIM , DIM, DIM)
			} else if (animation.mount) {
				ctx.fillStyle = "rgba(147, 73, 231, 0.63)"
				ctx.fillRect(animation.x * DIM, animation.y * DIM , DIM, DIM)
			}
		}
		for (let i = 0; i < 3; i++) {
			let pos = i;
			for (let row = 0; row < 9; row++) {
				for (let col = 0; col < 9; col++, pos+=3)
					if (this.currentState.board[pos] !== ".") {
						ctx.drawImage(Renderer.images[this.currentState.board[pos]], col * DIM, row * DIM, DIM, DIM)
						if (animation.show) {
							let pos = row * 27 + col * 3 + i
							if (animation.origin === pos) {
								ctx.drawImage(Renderer.images.selection, col * DIM, row * DIM, DIM, DIM)
							}
							else if (animation.target === pos) {
								ctx.drawImage(animation.img, col * DIM, row * DIM, DIM, DIM)
							}
						}
					}
			}
			ctx.translate(0, -z)
		}
		ctx.translate(0, z*3)
		if (this.showingTower) {
			ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
			ctx.fillRect(this.showingTower.x - DIM * 0.2, this.showingTower.y, DIM * 1.328, DIM * 3.16)
			const offset = this.showingTower.pieces.length === 2
			for (let i = this.showingTower.pieces.length; i--;) {
				const piece = this.showingTower.pieces[i]
				ctx.drawImage(Renderer.images[piece], this.showingTower.x, this.showingTower.y + DIM * (i + offset) * .8 + DIM * .3, DIM, DIM)
			}
		}
		ctx.restore()
	},

    update(e) {
        if (!this.showingTower) return
        const {x, border} = this.dimensions
        const mouseX = e.pageX * 2 - x - border,
            mouseY = (e.pageY - this.canvas.offsetTop) * 2 - border
        if (mouseX < this.showingTower.x || mouseY < this.showingTower.y || mouseY > this.showingTower.bottom || mouseX > this.showingTower.right)
            this.showingTower = null
	},
	
	resize() {
		this.canvas.width   = this.canvas.offsetWidth * 2
		this.canvas.height  = this.canvas.offsetHeight * 2
		this.dimensions.height = this.dimensions.width = this.canvas.offsetHeight < this.canvas.offsetWidth ? this.canvas.height : this.canvas.width
		this.dimensions.x = this.canvas.width / 2  - this.dimensions.width / 2
		this.dimensions.DIM = this.dimensions.height / 10
		this.dimensions.border = this.dimensions.DIM / 2
		this.dimensions.z = this.dimensions.border / 5
			
		this.showingTower = null // para evitar errores visuales
	},
	
	onClick(e) {
        const {x, border, height, width, DIM} = this.dimensions
        let mouseX = e.pageX * 2,
            mouseY = (e.pageY - this.canvas.offsetTop) * 2 // * 2 por el reescalado
		if (mouseX >= (x + border) && mouseY >= border && mouseY <= (height - border) && mouseX <= (x - border + width)) {
			const col = Math.floor((mouseX - border - x) / DIM),
				row = Math.floor((mouseY - border) / DIM)
			const pieces = this.currentState.board.substr(row * 27 + col * 3, 3).split("").filter(x=>x!==".").reverse()
			if (pieces.length > 1) {
				this.showingTower = {
					x : col * DIM,
					right : col * DIM + DIM,
					y : (row - 2) * DIM >= 0 ? (row - 2) * DIM : row * DIM,
					bottom : row * DIM + DIM,
					pieces
				}
			}
		}
	},
    
    nextMove() {
		if (this.moveSelected.next) {
			this.moveSelected.next.click()
			this.moveSelected.scrollIntoViewIfNeeded()
		}
	},
	
	previousMove() {
		if (this.moveSelected.previous) {
			this.moveSelected.previous.click()
			this.moveSelected.scrollIntoViewIfNeeded()
		}
	},

    getTop(board, pos) {
        return board[pos] === "." ? pos : board[pos+1] === "." ? pos + 1: board[pos+2] === "." ? pos + 2 : pos + 3
    },

    actionHandlers: {
        move: {
            animate(animation, action) {
                if (RecordPlayer.currentState.board[action.target] === ".") {
                    animation.move = true
                    animation.x = (action.target / 3) % 9
                    animation.y = Math.floor(action.target / 27)
                } else {
                    animation.img = Renderer.images.jump
                    animation.target--
                }
            },

            toText(action) {
                return RecordPlayer.toSquareTxt(action.origin) + "-" + RecordPlayer.toSquareTxt(action.target)
            },

            execute(state) {
                const origin = RecordPlayer.getTop(state.board, state.action.origin) - 1,
                    target = RecordPlayer.getTop(state.board, state.action.target);
                const piece = state.board[origin]

                state.action.originTier = origin % 3;
                state.action.targetTier = target % 3;

                if (state.action.recover) {
                    state.board = stringReplaceAt(state.board, origin, ".")
                    state.hands.ally = stringReplaceAt(state.hands.ally, 0, piece)
                }
                else {
                    state.board = stringReplaceAt(state.board, origin, ".")
                    state.board = stringReplaceAt(state.board, target, piece)
                }
            }
        },

        capture: {
            animate(animation) {
                animation.img = Renderer.images.capture
            },

            toText(action) {
                return RecordPlayer.toSquareTxt(action.origin) + "x" + RecordPlayer.toSquareTxt(action.target)
            },

            execute(state) {
                const origin = RecordPlayer.getTop(state.board, state.action.origin) - 1,
                    target = RecordPlayer.getTop(state.board, state.action.target) - 1;
                const piece = state.board[origin],
                    captured = otherSideOfPiece(state.board[target])
                let relocated = null
                const crownRelocated = (state.action.crown && !"FfNn".includes(captured)) && state.action.relocation // si hay Corona y la pieza capturada no es la que se va a reubicar entonces es la que está debajo

                state.board = stringReplaceAt(state.board, origin, ".")

                state.action.originTier = origin % 3
                state.action.targetTier = target % 3

                if (state.action.relocation !== undefined) {
                    const posToRelocate = RecordPlayer.getTop(state.board, state.action.relocation)

                    if (crownRelocated) {
                        state.hands.ally += captured
                        relocated = otherSideOfPiece(state.board[target - 1]);
                        state.board = stringReplaceAt(state.board,posToRelocate, relocated)
                    } else
                        state.board = stringReplaceAt(state.board, posToRelocate, captured)
                }
                else
                    state.hands.ally += captured;

                if (state.action.recover) {
                    state.hands.enemy = stringReplaceAt(state.hands.enemy, 5, otherSideOfPiece(piece))
                    state.board = stringReplaceAt(state.board, target, ".")
                } else
                    state.board = stringReplaceAt(state.board, target, piece)

                if (state.action.betrayal)
                    for (let i = target - 1; i >= target - target % 3; i--)
                        if (!"GgWw".includes(state.board[i]))
                            state.board = stringReplaceAt(state.board, i, otherSideOfPiece(state.board[i]))

                if (state.action.crown) {
                    let crown = piece === "r" ? state.action.crown.toLowerCase() : state.action.crown.toUpperCase();
                    if (otherSideOfPiece(state.board[target - 1]) !== relocated)
                        state.hands.ally += otherSideOfPiece(state.board[target - 1]);
                    if (crownRelocated && "FfNn".includes(crown)) {
                        state.board = stringReplaceAt(state.board, target - 1, state.board[target]) // baja la de arriba
                        state.board = stringReplaceAt(state.board, target, ".")
                    } else {
                        state.board = stringReplaceAt(state.board, target - 1, crown)
                    }
                    if (relocated !== crown)
                        state.hands.ally = stringReplaceAt(state.hands.ally, state.hands.ally.lastIndexOf(crown), "")
                }
            }
        },

        captureInTower: {
            animate(animation, action) {
                animation.target = action.target + action.tier
                animation.img = Renderer.images.capture
            },

            toText(action) {
                return (action.tier + 1) + "x" + RecordPlayer.toSquareTxt(action.target)
            },

            execute(state) {
                const pos = state.action.target + state.action.tier
                const captured = otherSideOfPiece(state.board[pos])

                for (let i = pos, end = state.action.target + 2; i < end; i++) {
                    state.board = stringReplaceAt(state.board, i, state.board[i + 1])
                    state.board = stringReplaceAt(state.board, i + 1, ".")
                }
                state.board = stringReplaceAt(state.board, state.action.target + 2, ".")

                if (state.action.relocation !== undefined) {
                    const posToRelocate = RecordPlayer.getTop(state.board, state.action.relocation)

                    state.board = stringReplaceAt(state.board, posToRelocate, captured)
                }
                else
                    state.hands.ally += captured

                if (state.action.recover) {
                    if (!state.action.tier) { // la del nivel 2 se recupera sea la cima o no
                        state.hands.enemy = stringReplaceAt(state.hands.enemy, 5, otherSideOfPiece(state.board[pos]))

                        state.board = stringReplaceAt(state.board, pos, state.board[pos + 1]) // baja la de arriba
                        state.board = stringReplaceAt(state.board, pos + 1, ".")
                    } else {
                        const top = RecordPlayer.getTop(state.board, pos) - 1;
                        state.hands.enemy = stringReplaceAt(state.hands.enemy, 5, otherSideOfPiece(state.board[top]))
                        state.board = stringReplaceAt(state.board, top, ".")
                    }
                }
            }
        },

        sacrifice: {
            animate(animation) {
                animation.img = Renderer.images.selection
            },

            toText(action) {
                return RecordPlayer.toSquareTxt(action.origin) + "=" + RecordPlayer.toSquareTxt(action.target)
            },

            execute(state) {
                const king = RecordPlayer.getTop(state.board, state.action.origin) - 1

                state.action.originTier = king % 3
                state.action.targetTier = 0

                state.board = stringReplaceAt(state.board, state.action.target, state.board[king])
                state.board = stringReplaceAt(state.board, king, state.board[state.action.target])
            }
        },

        switch: {
            animate(animation, action) {
                animation.origin = action.target
                animation.target = action.target + 2
                animation.img = Renderer.images.selection
            },

            toText(action) {
                return ":" + RecordPlayer.toSquareTxt(action.target)
            },

            execute(state) {
                const [a, _, c] = state.board.slice(state.action.target, state.action.target + 3)
                state.board = stringReplaceAt(state.board, state.action.target, c)
                state.board = stringReplaceAt(state.board, state.action.target + 2, a)
            }
        },

        drop: {
            animate(animation, action) {
                animation.drop = true;
                animation.x = (action.target / 3) % 9
                animation.y = Math.floor(action.target / 27)

                document.getElementById(action.side).children[action.drop].style.background = "rgb(229, 229, 62)"
            },

            toText(action) {
                return action.piece.toUpperCase() + "*" + RecordPlayer.toSquareTxt(action.target)
            },

            execute(state) {
                const piece = /[a-z]/.test(state.hands.ally) ? state.action.piece.toLowerCase() : state.action.piece.toUpperCase() // si la reserva tiene piezas minúsculas busca en minúscula sino en mayúscula

                state.action.drop = state.hands.ally.lastIndexOf(piece) - 6 // el desplazamiento es para el efecto visual

                state.board = stringReplaceAt(state.board, RecordPlayer.getTop(state.board, state.action.target), piece)
                state.hands.ally = stringReplaceAt(state.hands.ally, state.action.drop + 6, "")
            }
        },

        mount: {
            animate(animation, action) {
                animation.mount = true
                animation.x = (action.target / 3) % 9
                animation.y = Math.floor(action.target / 27)
            },

            toText(action) {
                return RecordPlayer.toSquareTxt(action.origin) + "~" + RecordPlayer.toSquareTxt(action.target)
            },

            execute(state) {
                const origin = RecordPlayer.getTop(state.board, state.action.origin) - 1,
                    target = RecordPlayer.getTop(state.board, state.action.target);
                const pieces = state.board.substr(state.action.origin, 3);
                const mount = state.board[state.action.origin];

                state.board = stringReplaceAt(state.board, state.action.origin, ".")
                state.board = stringReplaceAt(state.board, state.action.origin + 1, ".")
                state.board = stringReplaceAt(state.board, state.action.origin + 2, ".")

                state.action.originTier = origin % 3;
                state.action.targetTier = target % 3;

                if (state.action.recover) {
                    let pieceToRecover;
                    if (pieces[2] === ".") {
                        state.board = stringReplaceAt(state.board, state.action.target, pieces[0])
                        pieceToRecover = pieces[1];
                    } else {
                        state.board = stringReplaceAt(state.board, state.action.target, pieces[0])
                        state.board = stringReplaceAt(state.board, state.action.target + 1, pieces[1])
                        pieceToRecover = pieces[2];
                    }

                    if (/[a-z]/.test(mount) && /[a-z]/.test(pieceToRecover) || /[A-Z]/.test(mount) && /[A-Z]/.test(pieceToRecover)) // se compara la pieza a recuperar con la montura a ver si son aliadas
                        state.hands.ally = stringReplaceAt(state.hands.ally, 0, pieceToRecover)
                    else
                        state.hands.enemy = stringReplaceAt(state.hands.enemy, 4, pieceToRecover)

                } else {
                    state.board = stringReplaceAt(state.board, state.action.target, pieces[0])
                    state.board = stringReplaceAt(state.board, state.action.target + 1, pieces[1])
                    state.board = stringReplaceAt(state.board, state.action.target + 2, pieces[2])
                }
            }
        },

        substitute: {
            animate(animation, action) {
                animation.substitute = true
                animation.x = (action.target / 3) % 9
                animation.y = Math.floor(action.target / 27)

                animation.target = action.target + 2
                while (RecordPlayer.currentState.board[animation.target] === ".")
                    animation.target--

                animation.img = Renderer.images.selection

                document.getElementById(action.side).children[action.drop].style.background = "#8aad53"
            },
            
            toText(action) {
			    return RecordPlayer.toSquareTxt(action.target) + "<>" + action.piece.toUpperCase()
            },

            execute(state) {
                const piece = /[a-z]/.test(state.hands.ally) ? state.action.piece.toLowerCase() : state.action.piece.toUpperCase() // si la reserva tiene piezas minúsculas busca en minúscula sino en mayúscula
                state.action.drop = state.hands.ally.lastIndexOf(piece) - 6
                state.board = stringReplaceAt(state.board, RecordPlayer.getTop(state.board, state.action.target) - 1, piece)
                state.hands.ally = stringReplaceAt(state.hands.ally, state.action.drop + 6, /[a-z]/.test(state.hands.ally) ? "z" : "Z")
            }
        },

        executeInitialEffect(previous, state) {
			if (state.action.initialRelocation !== undefined) {
				let target = getCima(previous.board, state.action.initialRelocation);
				state.board = stringReplaceAt(previous.board, target, previous.hands.enemy[5]) // las piezas a reubicar están en la posición 5, que son las recuperadas por captura
				state.hands.ally = stringReplaceAt(previous.hands.enemy, 5, ".") // quito la pieza reubicada
			} else {
				state.board = previous.board;
				state.hands.ally = previous.hands.enemy;
			}
			state.hands.enemy = previous.hands.ally; // porque la reserva aliada está como enemiga en el movimiento anterior y viceversa
        }

    },

	executeMove(e) {
		if (e.target === this.moveSelected)
			return;
		this.showingTower = null;
		let action;
		if (e.target.state > 0) {
			this.setState(e.target.state - 1)
			action = this.states[e.target.state].action
			this.animation = {
				origin: action.origin + action.originTier,
				target: action.target + action.targetTier
			};
            action.actionHandler.animate(this.animation, action)

			if (this.clockOn) { // Si había otra animación antes la termina
				this.clockOn = false
				clearTimeout(this.clock)
			}

			this.animation.show = true
			this.clock = setTimeout(() => this.setState(e.target.state), 800)
			this.clockOn = true
		} else {
			this.setState(e.target.state)
			action = {actionHandler: {comments: null}}
		}
		
		this.commentsElement.innerText = ""
		if (action.comments)
			for (const comment of action.comments)
				this.commentsElement.innerText += comment[0].toUpperCase() + comment.slice(1) + "\n\n"
		this.moveSelected.className = "movimiento"
		this.moveSelected = e.target
		this.moveSelected.className = "movSelected"
	},

	setState(stateIndex) {
		const specials = {P: "B", Y: "M", I: "J", G: "F", W: "N" }

		let upperHand, lowerHand
		
		this.currentState = this.states[stateIndex]

		if (this.firstBelow && (stateIndex%2) || !this.firstBelow && !(stateIndex%2)) {
			upperHand = this.currentState.hands.enemy
			lowerHand = this.currentState.hands.ally
		} else {
			upperHand = this.currentState.hands.ally
			lowerHand = this.currentState.hands.enemy
		}

		this.animation.show = false;
		let hand = upperHand.slice(6),
			notInHand = upperHand.slice(0, 6);
		let div = document.getElementById("res-up");
		div.innerHTML = "";
		const h = div.offsetHeight - 20
		for (const piece of hand) {
			const img = document.createElement("img");
			img.style.width = img.style.height = h + "px"
			img.src = Renderer.images[piece].src
			div.appendChild(img);
			if (specials[piece.toUpperCase()])
				div.appendChild(document.createTextNode(specials[piece.toUpperCase()]))
		}
		for (const piece of notInHand) {
			if (piece === ".") continue
			const img = document.createElement("img");
			img.style.width = img.style.height = h + "px";
			img.style.background = "#de8d52";
			img.src = Renderer.images[piece].src
			div.appendChild(img);
			if (specials[piece.toUpperCase()])
				div.appendChild(document.createTextNode(specials[piece.toUpperCase()]))
		}

		hand = lowerHand.slice(6)
		notInHand = lowerHand.slice(0, 6)
		div = document.getElementById("res-down")
		div.innerHTML = ""
		for (const piece of hand) {
			const img = document.createElement("img");
			img.style.width = img.style.height = h + "px";
			img.src = Renderer.images[piece].src
			div.appendChild(img);
			if (specials[piece.toUpperCase()])
				div.appendChild(document.createTextNode(specials[piece.toUpperCase()]))
		}
		for (const piece of notInHand) {
			if (piece === ".") continue;
			const img = document.createElement("img");
			img.style.width = img.style.height = h + "px";
			img.style.background = "#de8d52";
			img.src = Renderer.images[piece].src
			div.appendChild(img);
			if (specials[piece.toUpperCase()])
				div.appendChild(document.createTextNode(specials[piece.toUpperCase()]))
		}
	},

    reset() {
		this.states = []
		document.getElementById("res-up").innerHTML = ""
		document.getElementById("res-down").innerHTML = ""
		this.movesElement.innerHTML = ""
		this.lastMove = null
		this.moveSelected = null
    },

    toSquareTxt(n) { return String.fromCharCode(~~(n/3) % 9 + 97) + (~~(n/27) + 1) },

	toText(action) {
		let txt = ""

		if (action.initialRelocation)
			txt += "(" + this.toSquareTxt(action.initialRelocation) + ")"
        txt += action.actionHandler.toText(action)

		if (action.recover)
			txt += "^"
		if (action.betrayal)
			txt += "$"
		if (action.relocation)
			txt += "(" + this.toSquareTxt(action.relocation) + ")"
		if (action.crown)
			txt += "{" + action.crown + "}"
		if (action.inCheck)
			txt += "+"
		if (action.evaluation)
			txt += action.evaluation
		
		return txt
	},

	loadRecord(record) {
		record = record.replace(new RegExp(String.fromCharCode(10), "g"), "").replace(new RegExp(String.fromCharCode(13), "g"), "");
		
		let game = Parser.parse(record)

        if (game instanceof Parser.ParserError) {
			alert("Error while loading record: " + game.msg)
			return false
        }

        this.reset()
        game = game.res

        this.states.push({board: game.board, hands: {ally: "......", enemy: "......"}, action: {comments: null}})

        const row = document.createElement("tr");
        const col = document.createElement("td");
        col.colSpan = 3;
        col.state = 0;
        col.onclick = e => this.executeMove(e)
        col.style.width = "240px";
        col.innerText = "Formación Inicial";
        col.className = "movSelected";

        let lastMove = col // etiqueta <TD> del último añadido

        this.moveSelected = col
        row.appendChild(col)
        this.movesElement.appendChild(row)

        let stateIndex = 1,
            stateCount = 1;
        // Crea las celdas de la tabla para cada movimiento
        for (const move of game.moves) {
            const row = document.createElement("tr");
            const number = document.createElement("td"),
                first = document.createElement("td");

            number.className = "numMov";
            number.innerText = stateIndex++;

            this.states.push({action: move[0], hands: {ally: "......", enemy: "......"}});

            first.className = "movimiento";
            first.state = stateCount++;
            first.onclick = e => this.executeMove(e)
            first.innerText = this.toText(move[0]);
            if (move[0].comments)
                first.style.borderColor = "#7184e4";
            first.previous = lastMove;
            lastMove.next = first;
            lastMove = first;

            row.appendChild(number);
            row.appendChild(first);

            if (move[1]) {
                const second = document.createElement("td")

                this.states.push({action: move[1], hands: {ally: "......", enemy: "......"}});

                second.className = "movimiento";
                second.state = stateCount++;
                second.onclick = e => this.executeMove(e)
                second.innerText = this.toText(move[1]);
                if (move[1].comments)
                    second.style.borderColor = "#7184e4";
                second.previous = first;
                first.next = second;
                lastMove = second;

                row.appendChild(second);
            }
            this.movesElement.appendChild(row);
        }

        if (game.victory) {
            lastMove.innerText += "#";
            const last = this.states.slice(-1)[0].action

            if (last.comments)
                last.comments.push(game.victory.reason)
            else
                last.comments = [game.victory.reason]
        }

        this.firstBelow = game.moves[0][0].origin > 159
        this.processStates()
        this.setState(0)
        this.movesElement.scrollTop = 0
        this.commentsElement.innerText = ""
        return true
	},

	processStates() {
		let previousState = this.states[0];
		for (let i = 1; i < this.states.length; i++) {
			const state = this.states[i];
            this.actionHandlers.executeInitialEffect(previousState, state)

            state.action.actionHandler.execute(state)

            if (state.action.actionHandler === this.actionHandlers.drop || state.action.actionHandler === this.actionHandlers.substitute)
                state.action.side = (this.firstBelow && (i%2) || !this.firstBelow && !(i%2)) ? "res-down" : "res-up"

			const r = state.hands.ally
			state.hands.ally = "..." + r.slice(0, 3) + r.slice(6) + r.slice(3, 6).split("").map(col=>col !== "." ? col : "").join("")
			previousState = state
		}
	},

    openRegisterFile(e) {
		const file = e.target.files[0]

		if (!file) return

		const reader = new FileReader()

		reader.onload = e => {
			if (this.loadRecord(e.target.result)) {
				WindowManager.player.open()
                this.resize()
            }

            this.movesElement.scrollTop = 0
        }
		reader.readAsText(file)
	},

    open() {
        this.inputFile.click()
    }
}

const stringReplaceAt = (string, index, char) => string.slice(0, index) + char + string.slice(index + 1)
