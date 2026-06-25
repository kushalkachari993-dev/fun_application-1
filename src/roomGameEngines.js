import { Ludo } from '@ayshrj/ludo.js'
import { Chess } from 'chess.js'

export const ludoColors = ['blue', 'red', 'green', 'yellow']

function orderedPlayerIds(players, hostId) {
  const ids = Object.keys(players || {})
  return hostId
    ? [hostId, ...ids.filter((playerId) => playerId !== hostId)]
    : ids
}

export function createChessState(players, hostId) {
  const playerIds = orderedPlayerIds(players, hostId)
  const chess = new Chess()

  return {
    fen: chess.fen(),
    seats: {
      w: playerIds[0] || '',
      b: playerIds[1] || '',
    },
    lastMove: null,
  }
}

export function createLudoState(playerCount, players, hostId) {
  const count = Math.min(4, Math.max(2, playerCount))
  const ludo = new Ludo(count)
  const playerIds = orderedPlayerIds(players, hostId)
  const seats = Object.fromEntries(
    ludo.players.map((color, index) => [color, playerIds[index] || '']),
  )

  return serializeLudo(ludo, seats)
}

export function restoreLudo(state) {
  const ludo = new Ludo(state.players.length)
  ludo.players = [...state.players]
  ludo.reset()
  ludo.currentPiece = state.turn
  ludo.tokenPositions = Object.fromEntries(
    Object.entries(state.tokenPositions).map(([color, positions]) => [color, [...positions]]),
  )
  ludo.ranking = [...state.ranking]
  ludo.currentDiceRoll = state.diceRoll
  ludo.lastDiceRoll = state.lastDiceRoll
  ludo.validTokenIndices = [...(state.validTokenIndices || [])]
  ludo.currentConsecutiveSixes = state.currentConsecutiveSixes || 0
  ludo.currentBoardStatus = state.boardStatus || ''
  ludo.gameState = state.gameState
  return ludo
}

export function serializeLudo(ludo, seats = {}) {
  const state = ludo.getCurrentState()

  return {
    ...state,
    tokenPositions: Object.fromEntries(
      Object.entries(state.tokenPositions).map(([color, positions]) => [color, [...positions]]),
    ),
    ranking: [...state.ranking],
    players: [...state.players],
    validTokenIndices: [...ludo.validTokenIndices],
    currentConsecutiveSixes: ludo.currentConsecutiveSixes,
    seats: { ...seats },
  }
}

export function chessStatus(chess) {
  if (chess.isCheckmate()) {
    return `${chess.turn() === 'w' ? 'Black' : 'White'} wins by checkmate`
  }
  if (chess.isStalemate()) return 'Draw by stalemate'
  if (chess.isThreefoldRepetition()) return 'Draw by repetition'
  if (chess.isInsufficientMaterial()) return 'Draw by insufficient material'
  if (chess.isDraw()) return 'Draw'
  if (chess.isCheck()) return `${chess.turn() === 'w' ? 'White' : 'Black'} is in check`
  return `${chess.turn() === 'w' ? 'White' : 'Black'} to move`
}
