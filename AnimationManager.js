class Animation {
    isPlaying = false

    start(onTick, onFinish, duration) {
        this.onTick = onTick
        this.onFinish = onFinish
        this.duration = duration
        this.invDuration = 1 / duration
        this.isPlaying = true
        this.startTime = AnimationManager.time
    }

    stop() {
        this.isPlaying = false
    }

    update(time) {
        if (!this.isPlaying) return
        const t = (time - this.startTime) * this.invDuration
        if (t > 1) {
            this.isPlaying = false
            this.onFinish()
        } else {
            this.onTick(t)
        }
    }
}

const AnimationManager = {
    animations: Array(4).fill(0).map(() => new Animation()),
    length: 0,
    time: 0,

    update(deltaTime) {
        this.time += deltaTime
        for (let i = 0; i < this.length; i++) {
            const animation = this.animations[i]
            animation.update(this.time)

            if (!animation.isPlaying) {
                const tmp = this.animations[--this.length]
                this.animations[this.length] = animation
                this.animations[i] = tmp
                i--
            }
        }
    },

    playAnimation(onTick, onFinish, duration) {
        const animation = this.animations[this.length++]
        animation.start(onTick, onFinish, duration)
        return animation
    },

    easing: {
        inOutCubic: t => (t *= 2) < 1 ? .5*t*t*t : .5*((t-=2)*t*t + 2),
        bezierCurve (t) {
            const a = 1 - t
            return 3*0.7*a*a*t+3*0.3*a*t*t+t*t*t
        }
    }
}
var Vista = (function () {
    
    let accionAnimacion = {
        animando: false,
        piezas: [], // piezas que se mueven a la vez
        canvas: null, // para el tablero
        ctx: null
    };
    
    function drawTableroAnimacion (ctx) {
        let {x, marco, z, width, height, DIM} = Tablero.medidas;
        ctx.drawImage(images.get("tablero"), x, 0, width, height);

        let casillaX = x + marco, casillaY = marco;
        for (let f = 0, pos = 12; f < 9; f++, casillaY += DIM, pos+=2, casillaX = x + marco) {
            for (let c = 0; c < 9; c++, casillaX += DIM, pos++) {
                let casilla = Engine.tablero[pos];
                
                for (let pieza of accionAnimacion.piezas) {
                    if (pieza.pos === pos) {
                        if (accionActual.accion === Accion.CAPTURAR_EN_TORRE)
                            casilla = casilla.replaceAt(accionActual.nivel, "");
                        else // sustitución 
                            casilla = casilla.replaceAt(accionActual.nivel, " ");
                    }
                }
                
                // Dibuja las piezas sobre el tablero
                if (casilla.length) {
                    if (casilla[0] !== " ")
                        ctx.drawImage(images.get(casilla[0]), casillaX, casillaY, DIM, DIM);
                    if (casilla.length > 1) {
                        if (casilla[1] !== " ")
                            ctx.drawImage(images.get(casilla[1]), casillaX, casillaY - z, DIM, DIM);
                        if (casilla.length === 3 && casilla[2] !== " ") {
                            ctx.drawImage(images.get(casilla[2]), casillaX, casillaY - z - z, DIM, DIM);
                        }
                    }
                }
            }
        }
    }

    function drawAccionAnimacion (ctx) {
        if (accionAnimacion.animando) {
            let {x, marco, z, width, height, DIM} = Tablero.medidas;
            ctx.drawImage(accionAnimacion.canvas, 0, 0, screenWidth, screenHeight);

            for (let pieza of accionAnimacion.piezas) {
                ctx.drawImage(images.get(pieza.pieza), pieza.x, pieza.y, DIM, DIM);
            }
        }
    }

    const easeInOutCubic = (t, d) => (t /= d/2) < 1 ? .5*t*t*t : .5*((t-=2)*t*t + 2);

    let animaciones = {

        SHOW_TORRE: function ({duracion}) {
            let t = 0,
                d = duracion;
            torreView.f = .1;
            
            let frame = function () {
                torreView.f = .1 + easeInOutCubic(t,d) * .7;
                t += 30;
                if (t > d) {
                    clearInterval(clock);
                    torreView.f = .8;
                }
            }

            let clock = setInterval(frame, 30);
        }
    };

    function startAnimation (animacion, opciones) {
        animacion(opciones);
    }

    function mostrarEfecto (efecto) {
        document.getElementById(efecto).style.opacity = 1;
    }

    function ocultarEfecto (efecto) {
        document.getElementById(efecto).style.opacity = 0;
    }

    function ocultarEfectos () {
        for (let efecto of ["reubicacion", "recuperacion", "corona", "traicion", "reclutamiento"])
            ocultarEfecto(efecto);
    }

    
    
    function animarAccion (accion) {
        let a = 0;
        let {x, marco, z, width, height, DIM} = Tablero.medidas;
        accionAnimacion.animando = true;
        accionAnimacion.piezas = [];
        switch (accion.accion) {
            case Accion.MOVER:
            case Accion.SALTAR_ENCIMA: {
                let nivel = Engine.tablero[accion.origen].length - 1,
                    nivelDestino = Engine.tablero[accion.destino].length;
                let pieza = {
                    pieza: Engine.tablero[accion.origen].slice(-1),
                    origen: Tablero.casilla2Coor(accion.origen),
                    destino: Tablero.casilla2Coor(accion.destino),
                    pos: accion.origen,
                    nivel
                };
                pieza.origen.y -= nivel * z;
                pieza.destino.y -= nivelDestino * z;
                pieza.x = pieza.origen.x;
                pieza.y = pieza.origen.y;
                accionAnimacion.piezas.push(pieza);
            }
            break;
            
            case Accion.CAPTURAR: {
                let nivel = Engine.tablero[accion.origen].length - 1,
                    nivelDestino = Engine.tablero[accion.destino].length - 1;
                let aliada = {
                    pieza: Engine.tablero[accion.origen].slice(-1),
                    origen: Tablero.casilla2Coor(accion.origen),
                    destino: Tablero.casilla2Coor(accion.destino),
                    nivel,
                    pos: accion.origen
                };
                aliada.origen.y -= nivel * z;
                aliada.destino.y -= nivelDestino * z;
                aliada.x = aliada.origen.x;
                aliada.y = aliada.origen.y;

                let enemiga = {
                    pieza: Engine.tablero[accion.destino].slice(-1),
                    origen: Tablero.casilla2Coor(accion.destino),
                    destino: {x: aliada.destino.x, y: Engine.ejercitoDeTurno.abajo ? screenHeight + DIM : - DIM},
                    nivel: nivelDestino,
                    pos: accion.destino
                };
                enemiga.origen.y -= nivelDestino * z;
                enemiga.x = enemiga.origen.x;
                enemiga.y = enemiga.origen.y;

                accionAnimacion.piezas.push(aliada);
                accionAnimacion.piezas.push(enemiga);
            }
            break;
            
            case Accion.CAPTURAR_EN_TORRE: {
                let destino = Tablero.casilla2Coor(accion.destino);
                let casilla = Engine.tablero[accion.destino];
                let enemiga = {
                    pieza: casilla[accion.nivel],
                    origen: Tablero.casilla2Coor(accion.destino),
                    destino: {x: destino.x, y: Engine.ejercitoDeTurno.abajo ? screenHeight + DIM : - DIM},
                    nivel: accion.nivel,
                    pos: accion.destino
                };
                enemiga.origen.y -= accion.nivel * z;
                enemiga.x = enemiga.origen.x;
                enemiga.y = enemiga.origen.y;

                accionAnimacion.piezas.push(enemiga);

                for (let i = accion.nivel + 1; i < casilla.length; i++) {
                    let pieza = {
                        pieza: casilla[i],
                        origen: Tablero.casilla2Coor(accion.destino),
                        nivel: accion.nivel,
                        pos: accion.destino
                    };
                    pieza.origen.y -= i * z;
                    pieza.destino = {x: pieza.origen.x, y: pieza.origen.y + z};
                    pieza.x = pieza.origen.x;
                    pieza.y = pieza.origen.y;

                    accionAnimacion.piezas.push(pieza);
                }
            }
            break;

            case Accion.PERMUTAR: {
                let arriba = {
                    pieza: Engine.tablero[accion.destino][2],
                    origen: Tablero.casilla2Coor(accion.destino),
                    destino: Tablero.casilla2Coor(accion.destino),
                    pos: accion.destino,
                    nivel: 0,
                    dir: -1
                };
                arriba.origen.y -= 2 * z;
                arriba.x = arriba.origen.x;
                arriba.y = arriba.origen.y;

                let medio = {
                    pieza: Engine.tablero[accion.destino][1],
                    origen: Tablero.casilla2Coor(accion.destino),
                    destino: Tablero.casilla2Coor(accion.destino),
                    pos: accion.destino,
                    nivel: 0,
                    dir: 0
                };
                medio.origen.y -= z;
                medio.destino.y -= z;
                medio.x = medio.origen.x;
                medio.y = medio.origen.y;

                let abajo = {
                    pieza: Engine.tablero[accion.destino][0],
                    origen: Tablero.casilla2Coor(accion.destino),
                    destino: Tablero.casilla2Coor(accion.destino),
                    pos: accion.destino,
                    nivel: 0,
                    dir: 1
                };
                abajo.destino.y -= 2 * z;
                abajo.x = abajo.origen.x;
                abajo.y = abajo.origen.y;
                accionAnimacion.piezas.push(abajo);
                accionAnimacion.piezas.push(medio);
                accionAnimacion.piezas.push(arriba);
            }
            break;

            case Accion.SACRIFICAR: {
                let nivel = Engine.tablero[accion.origen].length - 1,
                    nivelDestino = Engine.tablero[accion.destino].length - 1;
                let pieza = {
                    pieza: Engine.tablero[accion.origen].slice(-1),
                    origen: Tablero.casilla2Coor(accion.origen),
                    destino: Tablero.casilla2Coor(accion.destino),
                    pos: accion.origen,
                    nivel
                };
                pieza.origen.y -= nivel * z;
                pieza.destino.y -= nivelDestino * z;
                let otra = {
                    pieza: Engine.tablero[accion.destino].slice(-1),
                    origen: pieza.destino,
                    destino: pieza.origen,
                    pos: accion.destino,
                    nivel: nivelDestino
                };
                pieza.x = pieza.origen.x;
                pieza.y = pieza.origen.y;
                otra.x = otra.origen.x;
                otra.y = otra.origen.y;
                accionAnimacion.piezas.push(pieza);
                accionAnimacion.piezas.push(otra);
            }
            break;

            case Accion.MONTAR: {
                for (let i = 0; i < Engine.tablero[accion.origen].length; i++) {
                    let pieza = {
                        pieza: Engine.tablero[accion.origen][i],
                        origen: Tablero.casilla2Coor(accion.origen),
                        destino: Tablero.casilla2Coor(accion.destino),
                        pos: accion.origen,
                        nivel: 0
                    };
                    pieza.origen.y -= i * z;
                    pieza.destino.y -= i * z;
                    pieza.x = pieza.origen.x;
                    pieza.y = pieza.origen.y;
                    accionAnimacion.piezas.push(pieza);
                }
            }
            break;

            case Accion.SUSTITUIR: {
                let pieza = {
                    pieza: Engine.tablero[accion.destino][accion.nivel],
                    origen: Tablero.casilla2Coor(accion.destino),
                    destino: {x: Tablero.casilla2Coor(accion.destino).x, y:Engine.ejercitoDeTurno.abajo ? screenHeight + DIM : - DIM},
                    pos: accion.destino,
                    nivel: accion.nivel
                };
                pieza.origen.y -= accion.nivel * z;
                let otra = {
                    pieza: accion.pieza,
                    origen: pieza.destino,
                    destino: pieza.origen,
                };
                otra.x = otra.origen.x;
                otra.y = otra.origen.y;
                pieza.x = pieza.origen.x;
                pieza.y = pieza.origen.y;
                accionAnimacion.piezas.push(pieza);
                accionAnimacion.piezas.push(otra);
            }
            break;

            default: { // Recuperación forzada
                let nivel = Engine.tablero[accion.destino].length;
                let pieza = {
                    pieza: accion.pieza,
                    origen: Tablero.casilla2Coor(accion.destino),
                    destino: {x: Tablero.casilla2Coor(accion.destino).x, y:accion.abajo ? screenHeight + DIM : - DIM},
                    pos: accion.destino,
                    nivel
                };
                pieza.origen.y -= nivel * z;
                pieza.x = pieza.origen.x;
                pieza.y = pieza.origen.y;
                accionAnimacion.piezas.push(pieza);
            }
            break;
        }
        drawTableroAnimacion(accionAnimacion.ctx);
        let reversed = false; // para PERMUTAR
        let frame = function () {
            a += 30;
            if (accion.accion !== Accion.PERMUTAR) {
                for (let pieza of accionAnimacion.piezas) {
                    let t = a*a/(ACCION_MS*ACCION_MS);
                    pieza.x = pieza.origen.x + t * (pieza.destino.x - pieza.origen.x);
                    pieza.y = pieza.origen.y + t * (pieza.destino.y - pieza.origen.y);
                }
            } else {
                if (!reversed && a > ACCION_MS * .5) {
                    reversed = true;
                    accionAnimacion.piezas.reverse();
                }
                for (let pieza of accionAnimacion.piezas) {
                    if (pieza.dir) {
                    let t = (a/ACCION_MS) * Math.PI + Math.PI * .5 * pieza.dir;
                    pieza.y = (pieza.destino.y + pieza.origen.y) * .5 + Math.sin(t) * z;
                    pieza.x = (pieza.destino.x + pieza.origen.x) * .5 + Math.cos(t) * DIM;
                    }
                }
            }

            if (a > ACCION_MS - 30) {
                clearInterval(clock);
                accionAnimacion.animando = false;
            }
        };
        let clock = setInterval(frame, 30);
    }
})();
