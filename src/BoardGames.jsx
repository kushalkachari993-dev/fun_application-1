import { lazy, Suspense, useState } from 'react'
import { Chess } from 'chess.js'
import { Dice5, RotateCcw } from 'lucide-react'
import { chessStatus, restoreLudo } from './roomGameEngines'

const ChessBoard3D = lazy(() => import('./ChessBoard3D'))

const chessPieces = {
  w: {
    k: '\u2654',
    q: '\u2655',
    r: '\u2656',
    b: '\u2657',
    n: '\u2658',
    p: '\u2659',
  },
  b: {
    k: '\u265A',
    q: '\u265B',
    r: '\u265C',
    b: '\u265D',
    n: '\u265E',
    p: '\u265F',
  },
}

const ludoHomePositions = {
  red: [[1, 1], [1, 4], [4, 1], [4, 4]],
  green: [[1, 10], [1, 13], [4, 10], [4, 13]],
  blue: [[10, 1], [10, 4], [13, 1], [13, 4]],
  yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
}

function playerName(players, playerId) {
  return players[playerId]?.name || 'Open seat'
}

export function ChessGame({
  chessState,
  currentPlayerId,
  hostId,
  players,
  canReset,
  matchActive,
  onClaimSeat,
  onMove,
  onReset,
}) {
  const [selection, setSelection] = useState(null)
  const [boardMode, setBoardMode] = useState('2d')
  const chess = new Chess(chessState.fen)
  const selectedSquare = selection?.fen === chessState.fen ? selection.square : null
  const currentColor = chess.turn()
  const currentSeat = chessState.seats[currentColor]
  const canPlayTurn = matchActive && (
    currentSeat === currentPlayerId
      || (!currentSeat && hostId === currentPlayerId)
      || (Object.keys(players).length === 1 && hostId === currentPlayerId)
  )
  const legalTargets = selectedSquare
    ? new Set(chess.moves({ square: selectedSquare, verbose: true }).map((move) => move.to))
    : new Set()
  const isBlackView = chessState.seats.b === currentPlayerId
  const board = chess.board()
  const rows = isBlackView
    ? [...board].reverse().map((row) => [...row].reverse())
    : board
  const squares = rows.flat().map((piece, index) => {
    const visualRow = Math.floor(index / 8)
    const visualColumn = index % 8
    const rank = isBlackView ? visualRow + 1 : 8 - visualRow
    const fileIndex = isBlackView ? 7 - visualColumn : visualColumn
    const square = `${String.fromCharCode(97 + fileIndex)}${rank}`

    return {
      isLight: (fileIndex + rank) % 2 === 0,
      isSelected: selectedSquare === square,
      isTarget: legalTargets.has(square),
      piece,
      square,
    }
  })

  function chooseSquare(square) {
    const piece = chess.get(square)

    if (!selectedSquare) {
      if (canPlayTurn && piece?.color === currentColor) {
        setSelection({ square, fen: chessState.fen })
      }
      return
    }

    if (piece?.color === currentColor) {
      setSelection({ square, fen: chessState.fen })
      return
    }

    if (legalTargets.has(square)) {
      onMove(selectedSquare, square)
    }
    setSelection(null)
  }

  return (
    <div className="board-game chess-game">
      <div className="board-game-toolbar">
        <div>
          <span className="mini-label">Chess duel</span>
          <h3>{chessStatus(chess)}</h3>
        </div>
        <div className="chess-toolbar-actions">
          <div className="board-mode-toggle" role="group" aria-label="Chess board view">
            <button className={boardMode === '2d' ? 'active' : ''} type="button" aria-pressed={boardMode === '2d'} onClick={() => setBoardMode('2d')}>
              2D
            </button>
            <button className={boardMode === '3d' ? 'active' : ''} type="button" aria-pressed={boardMode === '3d'} onClick={() => setBoardMode('3d')}>
              3D
            </button>
          </div>
          <button className="secondary-button" type="button" disabled={!canReset} onClick={onReset}>
            <RotateCcw size={16} />
            Reset board
          </button>
        </div>
      </div>

      <div className="seat-row">
        {[
          ['w', 'White'],
          ['b', 'Black'],
        ].map(([color, label]) => {
          const seatId = chessState.seats[color]
          return (
            <button
              className={`seat-button ${seatId === currentPlayerId ? 'mine' : ''}`}
              type="button"
              key={color}
              disabled={Boolean(seatId && seatId !== currentPlayerId)}
              title={seatId === currentPlayerId ? 'Release seat' : `Claim ${label}`}
              onClick={() => onClaimSeat(color)}
            >
              <span>{label}</span>
              <strong>{playerName(players, seatId)}</strong>
            </button>
          )
        })}
      </div>

      {boardMode === '2d' ? (
        <div className="chess-board" aria-label="Chess board">
          {squares.map(({ isLight, isSelected, isTarget, piece, square }) => (
            <button
              className={`chess-square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isTarget ? 'target' : ''}`}
              type="button"
              key={square}
              onClick={() => chooseSquare(square)}
              aria-label={`${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`}
            >
              {piece && (
                <span className={`chess-piece ${piece.color}`}>
                  {chessPieces[piece.color][piece.type]}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <Suspense fallback={<div className="chess-3d-loading" role="status">Loading the 3D board…</div>}>
          <ChessBoard3D
            squares={squares}
            isBlackView={isBlackView}
            onSelectSquare={chooseSquare}
            onUse2D={() => setBoardMode('2d')}
          />
        </Suspense>
      )}

      <div className="game-footnote">
        <span>{!matchActive ? 'Start the match to move pieces' : canPlayTurn ? 'Your move' : `Waiting for ${playerName(players, currentSeat)}`}</span>
        <span>{chessState.lastMove ? `Last move: ${chessState.lastMove.san}` : 'Select a piece, then a highlighted square'}</span>
      </div>
    </div>
  )
}

export function LudoGame({
  currentPlayerId,
  hostId,
  ludoState,
  players,
  canReset,
  matchActive,
  onClaimSeat,
  onMoveToken,
  onReset,
  onRoll,
}) {
  const ludo = restoreLudo(ludoState)
  const currentSeat = ludoState.seats[ludoState.turn]
  const canPlayTurn = matchActive && (
    currentSeat === currentPlayerId
      || (!currentSeat && hostId === currentPlayerId)
      || (Object.keys(players).length === 1 && hostId === currentPlayerId)
  )
  const tokensBySquare = new Map()

  for (const color of ludoState.players) {
    ludoState.tokenPositions[color].forEach((position, tokenIndex) => {
      const coordinates = position === -1
        ? ludoHomePositions[color][tokenIndex]
        : ludo.colorPaths[color][position]
      const key = coordinates.join('-')
      const tokens = tokensBySquare.get(key) || []
      tokens.push({ color, tokenIndex })
      tokensBySquare.set(key, tokens)
    })
  }

  return (
    <div className="board-game ludo-game">
      <div className="board-game-toolbar">
        <div>
          <span className="mini-label">Ludo race</span>
          <h3>{ludoState.gameState === 'gameFinished' ? 'Race complete' : `${ludoState.turn} to play`}</h3>
        </div>
        <div className="ludo-reset-options" aria-label="Ludo player count">
          {[2, 3, 4].map((count) => (
            <button
              className={ludoState.players.length === count ? 'active' : ''}
              type="button"
              key={count}
              disabled={!canReset}
              onClick={() => onReset(count)}
            >
              {count}P
            </button>
          ))}
        </div>
      </div>

      <div className="ludo-seats">
        {ludoState.players.map((color) => {
          const seatId = ludoState.seats[color]
          return (
            <button
              className={`ludo-seat ${color} ${seatId === currentPlayerId ? 'mine' : ''}`}
              type="button"
              key={color}
              disabled={Boolean(seatId && seatId !== currentPlayerId)}
              title={seatId === currentPlayerId ? 'Release seat' : `Claim ${color}`}
              onClick={() => onClaimSeat(color)}
            >
              <span>{color}</span>
              <strong>{playerName(players, seatId)}</strong>
            </button>
          )
        })}
      </div>

      <div className="ludo-board" aria-label="Ludo board">
        {ludo.board.flatMap((row, rowIndex) => row.map((cell, columnIndex) => {
          const squareTokens = tokensBySquare.get(`${rowIndex}-${columnIndex}`) || []
          const homeColor = cell?.isHome
          const pathColor = cell?.isOnPathToFinalPosition
            || cell?.isStartingPosition
            || cell?.isFinalPosition
          const zoneColor = rowIndex <= 5 && columnIndex <= 5
            ? 'red'
            : rowIndex <= 5 && columnIndex >= 9
              ? 'green'
              : rowIndex >= 9 && columnIndex <= 5
                ? 'blue'
                : rowIndex >= 9 && columnIndex >= 9
                  ? 'yellow'
                  : ''
          const isCenter = rowIndex >= 6 && rowIndex <= 8
            && columnIndex >= 6 && columnIndex <= 8
          const classes = [
            'ludo-cell',
            zoneColor ? `zone ${zoneColor}` : '',
            isCenter ? 'center' : '',
            homeColor ? `home ${homeColor}` : '',
            pathColor ? `path ${pathColor}` : '',
            cell?.isSafeZone ? 'safe' : '',
          ].filter(Boolean).join(' ')

          return (
            <div className={classes} key={`${rowIndex}-${columnIndex}`}>
              {squareTokens.map(({ color, tokenIndex }) => {
                const isValid = color === ludoState.turn
                  && ludoState.validTokenIndices.includes(tokenIndex)
                  && canPlayTurn

                return (
                  <button
                    className={`ludo-token ${color} ${isValid ? 'valid' : ''}`}
                    type="button"
                    key={`${color}-${tokenIndex}`}
                    disabled={!isValid}
                    onClick={() => onMoveToken(tokenIndex)}
                    aria-label={`${color} token ${tokenIndex + 1}`}
                  >
                    {tokenIndex + 1}
                  </button>
                )
              })}
            </div>
          )
        }))}
      </div>

      <div className="ludo-controls">
        <div className={`dice-face ${ludoState.turn}`}>
          {ludoState.lastDiceRoll || '?'}
        </div>
        <div>
          <strong>{ludoState.boardStatus || 'Roll the dice to begin.'}</strong>
          <span>
            {!matchActive
              ? 'Start the match to roll'
              : canPlayTurn
              ? ludoState.gameState === 'playerHasToSelectAPosition'
                ? 'Choose a glowing token'
                : 'It is your turn'
              : `Waiting for ${playerName(players, currentSeat)}`}
          </span>
        </div>
        <button
          type="button"
          disabled={!canPlayTurn || ludoState.gameState !== 'playerHasToRollADice'}
          onClick={onRoll}
        >
          <Dice5 size={17} />
          Roll Dice
        </button>
      </div>

      {ludoState.ranking.length > 0 && (
        <div className="ludo-ranking">
          <span className="mini-label">Finish order</span>
          <strong>{ludoState.ranking.join(' / ')}</strong>
        </div>
      )}
    </div>
  )
}
