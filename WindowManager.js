const WindowManager = {
	init() {
		this.menu.init()
		this.victory.init()
		this.leave.init()
		this.player.init()
		this.manual.init()
		this.settings.init()
        this.hud.init()
	},

	menu: {
		init() {
			this.element = document.getElementById("w_menu")
		},

		open() {
			this.element.style.display = "block"
            AI.clear()
			setTimeout(() => {this.element.style.top = 0}, 30)
		},

		close() {
			this.element.style.top = -window.innerHeight -20 + "px";
			setTimeout(() => {this.element.style.display = "none"}, 700);
		}		
	},

	victory: {

		init() {
			this.element = document.getElementById("w_victoria")
			for (const w of "cortina conGanador sinGanador ganador motivo".split(" "))
				this[w] = document.getElementById("w_" + w)
		},

		resize() {
			this.element.style.height = window.innerHeight - 200 + "px"
			this.element.style.top = window.innerHeight/2 - this.element.offsetHeight/2 + "px"
			this.element.style.width = this.element.offsetHeight*1.6 + "px"
			this.element.style.left = window.innerWidth/2 - this.element.offsetWidth/2 + "px"
		},

		open(winner, reason) {
			if (winner) {
				this.ganador.innerText = winner
				this.conGanador.style.display = "table-cell"
				this.sinGanador.style.display = "none"
			} else {
				this.sinGanador.style.display = "table-cell"
				this.conGanador.style.display = "none"
			}
	
			this.motivo.innerText = reason
			this.element.style.display = "table"
			this.resize()
			this.cortina.style.display = "block"
			document.getElementById("registro-victoria").value = Notation.record//.replace(/\n/g, "<br>").replace(/\//g, "/<br>");
			setTimeout(() => {this.element.style.opacity = this.cortina.style.opacity = 1;}, 100)
		},

		close() {
			this.element.style.opacity = 0
			this.cortina.style.opacity = 0
			setTimeout( () => {this.element.style.display = "none"; this.cortina.style.display = "none";}, 300)
		}
	},

	leave: {
		init() {
			this.element = document.getElementById("w_abandonar")
			this.cortina = document.getElementById("w_cortina")
		},

		open() {
			this.element.style.display = this.cortina.style.display = "block"
			setTimeout(() => {this.element.style.opacity = this.cortina.style.opacity = 1;}, 100)
		},

		close() {
			this.element.style.opacity = this.cortina.style.opacity = 0
			setTimeout(() => {this.element.style.display = this.cortina.style.display = "none";}, 300)
		}
	},

	player: {
        isOpen: false,

		init() {
			this.element = document.getElementById("w_reproductor")
		},

		open() {
			this.element.style.display = "flex"
            this.isOpen = true
			if (this.element.offsetTop > 0) { // si está cerrado
				setTimeout(() => {this.element.style.top = 0; RecordPlayer.resize()}, 60)
				setTimeout(() => WindowManager.menu.close(), 110)
			}
		},

		close() {
			WindowManager.menu.open()
            this.isOpen = false
			setTimeout(() => {this.element.style.top = window.innerHeight + "px";}, 50);
			setTimeout(() => {this.element.style.display = "none"}, 700);
		}
	},

	manual: {
		init() {
			this.element = document.getElementById("w_manual")

		},

		open() {
			this.element.style.display = "block"
			setTimeout(() => {this.element.style.top = 0;}, 60)
			setTimeout(() => WindowManager.menu.close(), 110)
		},

		close() {
			WindowManager.menu.open()
			setTimeout(() => {this.element.style.top = window.innerHeight + "px";}, 50)
			setTimeout(() => {this.element.style.display = "none";}, 700)
		}
	},

	settings: {
		init() {
			this.element = document.getElementById("w_opciones")
            this.groupL = document.getElementById("group-izq")
            this.groupR = document.getElementById("group-der")
		},

		open() {
			this.element.style.display = "block"
			setTimeout(() => {this.element.style.opacity = 1; this.groupL.style.opacity = this.groupR.style.opacity = 0}, 100)
		},

		close() {
			this.element.style.opacity = 0
            this.groupL.style.opacity = this.groupR.style.opacity = 1
			setTimeout(() => {this.element.style.display = "none";}, 700)
		}
	},

    hud: {
        init() {
            this.panel = document.getElementById("panel")
            this.register = document.getElementById("registro")
            this.deco = document.getElementById("decoracion")
        },

        sendBack() {
            this.panel.style.zIndex = this.register.style.zIndex = this.deco.style.zIndex = "-10"
        },

        sendFront() {
            this.panel.style.zIndex = this.register.style.zIndex = this.deco.style.zIndex = "10"
        }
    }
}
