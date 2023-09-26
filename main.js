const canvas = document.getElementById("canvas")
let screenWidth, screenHeight
const mouse = { x : 0, y : 0, down : false, click : false, rightClick: false, over: null }
const canvasScale = 2

Arrangement.init()
Notation.init()
Arrangement.loadArmy(Engine.blackArmy)

Engine.reset()
WindowManager.init()
RecordPlayer.init()

document.getElementById('cargar').addEventListener('input', Gungi.load, false)
    
window.onresize = () => {
    screenWidth  = window.innerWidth
    screenHeight = window.innerHeight
    Renderer.resize()
    RecordPlayer.resize()
}

canvas.onmousemove = e => {
    mouse.x = e.pageX * canvasScale
    mouse.y = e.pageY * canvasScale
}

canvas.onclick = () => {
    mouse.click = true
}

canvas.oncontextmenu = e => {
    e.preventDefault()
    mouse.rightClick = true
}

Renderer.onLoad = () => {
    Renderer.draw()
    loop(0)
}

Renderer.init(canvas)

let lastTime = 0
function loop (time) {
    const deltaTime = (time - lastTime) * .001
    lastTime = time


    if (Engine.isArrangementPhase) {
        Arrangement.update()
    } else {
        Arrangement.mouseOver = false
        Arrangement.doneButton.mouseOver = false
        Board.update()
        if (!(PlayerAction.action === DropAction)) {
            if (Engine.currentPlayer.isBelow)
                LowerHand.update()
            else
                UpperHand.update()
        }
        SquareActions.update()
    }

    AnimationManager.update(deltaTime)

    if (mouse.click) {
        ButtonManager.onClick()
        mouse.click = false
    }

    if (mouse.rightClick) {
        ButtonManager.onRightClick()
        mouse.rightClick = false
    }

    if (WindowManager.player.isOpen)
        RecordPlayer.draw()
    else
        Renderer.draw()
	
    requestAnimationFrame(loop)
}


function test() {
    Engine.whiteArmy.piecesInHand.length = 0
    Engine.blackArmy.piecesInHand.length = 0
    Arrangement.onDoneClick()
}
