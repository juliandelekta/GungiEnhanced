const AI = {
    white: false,
    black: false,
    responseDelay: 20,

    clear() {
        this.white = this.black = false
    },

    play() {
        if (!this.armyIsAI(Engine.currentPlayer)) return
        Renderer.hideAllEffects()
        if (Engine.isArrangementPhase) {
            let actions;
            do {
                actions = PutAction.getPossibles().filter(action => action.isLegal)
                if (actions.length) {
                    actions[~~(Math.random() * actions.length)].execute()
                    Engine.currentPlayer.fillPromotion()
                }
            } while(actions.length)
            Arrangement.load()
        } else {
            const actions = (Gungi.phase === "action" ? Action.getOfPhaseAction() : Action.getOfPhaseFinal()).filter(a => a.isLegal)
            const action = actions[~~(Math.random() * actions.length)]
            if (!action) {
                console.error("No hay accionActual.", actions, Gungi.phase, "'" + Engine.currentPlayer.recruited + "'", "'" + Engine.currentPlayer.relocated + "'", "'" + Engine.currentPlayer.recovered + "'", "'" + Engine.currentPlayer.crown + "'");
                console.trace();
                if (Engine.currentPlayer.recruited) { 
                    console.log("DO RecruitAction")
                    // accionActual = {accion: Accion.RECLUTAR, destino: 0};
                    // Engine.acciones.realizarAccion(accionActual);
                    // finalizarFase();
                } else if (Engine.currentPlayer.crown) {
                    console.log("CORONA SIN LEGAL");
                }
            } else {
                PlayerAction.action = action
                Renderer.actionAnimation.setAction(action, () => Gungi.endPhase())
                action.execute()
            }
        }
    },

    armyIsAI(army) {
        return army === Engine.whiteArmy && this.white || army === Engine.blackArmy && this.black
    }
}
