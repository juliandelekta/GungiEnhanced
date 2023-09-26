class RoundButton {
    mouseOver = false
    enabled = true
    x = 0
    y = 0
    z = 0
    r = 1

    update() {
        const dy = mouse.y - this.y,
			dx = mouse.x - this.x
        this.mouseOver = this.enabled && (dy * dy + dx * dx <= this.r * this.r)
    }

    setPos(x, y) {
        this.x = Math.floor(x)
        this.y = Math.floor(y)
    }

    onClick() {
        console.log("Button clicked", this)
    }

}

class SquareButton {
    mouseOver = false
    enabled = true
    x = 0
    y = 0
    z = 0
    w = 1
    h = 1

    update() {
        this.mouseOver = this.enabled && mouse.x > this.x && mouse.x < (this.x + this.w) && mouse.y > this.y && mouse.y < (this.y + this.h)
    }

    onClick() {
        console.log("Button clicked", this)
    }
}


const ButtonManager = {
    buttons: [],

    addButton(button) {
        this.buttons.push(button)
    },

    removeButton(button) {
        this.buttons.splice(this.buttons.indexOf(button), 1)
    },

    onClick() {
        const btn = this.buttons.filter(button => button.mouseOver).sort((a, b) => b.z - a.z)[0]
        btn && btn.onClick()
    },

    onRightClick() {
        const btn = this.buttons.filter(button => button.mouseOver && button.onRightClick).sort((a, b) => b.z - a.z)[0]
        btn && btn.onRightClick()
    }
}
