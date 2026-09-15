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
})
