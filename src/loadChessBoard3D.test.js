import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const chessBoard3DModuleLoaded = vi.hoisted(() => vi.fn())

vi.mock('./ChessBoard3D', () => {
  chessBoard3DModuleLoaded()

  return {
    default: () => createElement('div', null, '3D board'),
  }
})

describe('3D chess board loading', () => {
  beforeEach(() => {
    chessBoard3DModuleLoaded.mockClear()
  })

  it('keeps the default 2D render from requesting the 3D module', async () => {
    const [{ ChessGame }, { createChessState }] = await Promise.all([
      import('./BoardGames'),
      import('./roomGameEngines'),
    ])
    const players = { host: { name: 'Host' } }
    const markup = renderToStaticMarkup(createElement(ChessGame, {
      chessState: createChessState(players, 'host'),
      currentPlayerId: 'host',
      hostId: 'host',
      players,
      canReset: true,
      matchActive: true,
      onClaimSeat: vi.fn(),
      onMove: vi.fn(),
      onReset: vi.fn(),
    }))

    expect(markup).toContain('aria-label="Chess board"')
    expect(markup).toContain('aria-pressed="false">3D</button>')
    expect(chessBoard3DModuleLoaded).not.toHaveBeenCalled()
  })

  it('requests the 3D module only when the lazy loader is invoked', async () => {
    const { loadChessBoard3D } = await import('./loadChessBoard3D')

    expect(chessBoard3DModuleLoaded).not.toHaveBeenCalled()
    await loadChessBoard3D()
    expect(chessBoard3DModuleLoaded).toHaveBeenCalledOnce()
  })

  it('keeps the 2D board available with retry and fallback actions after a load failure', async () => {
    const { ChessBoard3DErrorFallback } = await import('./BoardGames')
    const markup = renderToStaticMarkup(createElement(ChessBoard3DErrorFallback, {
      squares: [{
        isLight: true,
        isSelected: false,
        isTarget: false,
        piece: null,
        square: 'a1',
      }],
      onRetry: vi.fn(),
      onSelectSquare: vi.fn(),
      onUse2D: vi.fn(),
    }))

    expect(markup).toContain('role="alert"')
    expect(markup).toContain('Retry 3D')
    expect(markup).toContain('Use 2D board')
    expect(markup).toContain('aria-label="Chess board"')
  })
})
