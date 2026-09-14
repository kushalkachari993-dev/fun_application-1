import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RotateCcw } from 'lucide-react'

const lightSquare = 0xe9e1cf
const darkSquare = 0x52766e
const selectedSquare = 0xe2a33b
const targetSquare = 0x65a796

function addPart(group, geometry, material, position, rotation) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...position)
  if (rotation) mesh.rotation.set(...rotation)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

function createPieceModel(piece) {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({
    color: piece.color === 'w' ? 0xf4ead8 : 0x243039,
    roughness: 0.62,
    metalness: 0.08,
  })
  const accent = new THREE.MeshStandardMaterial({
    color: piece.color === 'w' ? 0xd8c9af : 0x10181d,
    roughness: 0.7,
  })

  addPart(group, new THREE.CylinderGeometry(0.31, 0.36, 0.12, 24), accent, [0, 0.06, 0])
  addPart(group, new THREE.CylinderGeometry(0.24, 0.3, 0.12, 24), material, [0, 0.18, 0])

  if (piece.type === 'p') {
    addPart(group, new THREE.CylinderGeometry(0.1, 0.19, 0.36, 20), material, [0, 0.41, 0])
    addPart(group, new THREE.SphereGeometry(0.18, 20, 16), material, [0, 0.69, 0])
  } else if (piece.type === 'r') {
    addPart(group, new THREE.CylinderGeometry(0.21, 0.25, 0.48, 20), material, [0, 0.46, 0])
    addPart(group, new THREE.CylinderGeometry(0.29, 0.23, 0.18, 8), material, [0, 0.76, 0])
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2
      addPart(
        group,
        new THREE.BoxGeometry(0.14, 0.16, 0.14),
        material,
        [Math.cos(angle) * 0.2, 0.91, Math.sin(angle) * 0.2],
      )
    }
  } else if (piece.type === 'n') {
    addPart(group, new THREE.CylinderGeometry(0.13, 0.23, 0.34, 20), material, [0, 0.4, 0])
    addPart(group, new THREE.BoxGeometry(0.28, 0.44, 0.2), material, [0, 0.68, -0.04], [-0.35, 0, 0])
    addPart(group, new THREE.ConeGeometry(0.12, 0.25, 4), accent, [-0.1, 0.96, -0.02], [0, 0, -0.18])
  } else if (piece.type === 'b') {
    addPart(group, new THREE.CylinderGeometry(0.1, 0.22, 0.45, 20), material, [0, 0.45, 0])
    addPart(group, new THREE.ConeGeometry(0.2, 0.34, 24), material, [0, 0.78, 0])
    addPart(group, new THREE.SphereGeometry(0.09, 16, 12), accent, [0, 1.0, 0])
  } else if (piece.type === 'q') {
    addPart(group, new THREE.CylinderGeometry(0.12, 0.24, 0.5, 24), material, [0, 0.47, 0])
    addPart(group, new THREE.CylinderGeometry(0.25, 0.14, 0.16, 8), material, [0, 0.79, 0])
    for (let index = 0; index < 5; index += 1) {
      const angle = index * Math.PI * 2 / 5
      addPart(group, new THREE.SphereGeometry(0.065, 12, 10), accent, [Math.cos(angle) * 0.2, 0.94, Math.sin(angle) * 0.2])
    }
  } else {
    addPart(group, new THREE.CylinderGeometry(0.12, 0.24, 0.55, 24), material, [0, 0.49, 0])
    addPart(group, new THREE.SphereGeometry(0.16, 18, 14), material, [0, 0.83, 0])
    addPart(group, new THREE.BoxGeometry(0.09, 0.3, 0.09), accent, [0, 1.05, 0])
    addPart(group, new THREE.BoxGeometry(0.25, 0.08, 0.08), accent, [0, 1.08, 0])
  }

  group.scale.setScalar(0.78)
  return group
}

function squarePosition(square, isBlackView) {
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1])
  return {
    x: isBlackView ? 3.5 - file : file - 3.5,
    z: isBlackView ? rank - 4.5 : 4.5 - rank,
  }
}

function disposeGroup(group) {
  group.traverse((object) => {
    object.geometry?.dispose()
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose())
    } else {
      object.material?.dispose()
    }
  })
  group.clear()
}

export default function ChessBoard3D({ squares, isBlackView, onSelectSquare, onUse2D }) {
  const mountRef = useRef(null)
  const sceneStateRef = useRef(null)
  const selectSquareRef = useRef(onSelectSquare)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    selectSquareRef.current = onSelectSquare
  }, [onSelectSquare])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    let renderer
    try {
      const isMobile = window.matchMedia('(max-width: 640px)').matches
      renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: true,
        powerPreference: isMobile ? 'low-power' : 'high-performance',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.75))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.shadowMap.enabled = !isMobile
      renderer.shadowMap.type = THREE.PCFShadowMap

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf7f9f9)
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
      camera.position.set(0, 8.2, 8.6)

      const boardRoot = new THREE.Group()
      const pieceRoot = new THREE.Group()
      scene.add(boardRoot, pieceRoot)

      scene.add(new THREE.HemisphereLight(0xffffff, 0x59666d, isMobile ? 2.1 : 1.65))
      if (!isMobile) {
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
        keyLight.position.set(-4, 9, 6)
        keyLight.castShadow = true
        keyLight.shadow.mapSize.set(1024, 1024)
        scene.add(keyLight)
      }

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(0, 0, 0)
      controls.enablePan = false
      controls.minDistance = 7
      controls.maxDistance = 24
      controls.minPolarAngle = 0.35
      controls.maxPolarAngle = 1.35
      controls.update()

      const renderScene = () => renderer.render(scene, camera)
      controls.addEventListener('change', renderScene)
      mount.appendChild(renderer.domElement)

      let compactCamera = null
      const resize = () => {
        const width = Math.max(1, mount.clientWidth)
        const height = Math.max(1, mount.clientHeight)
        const useCompactCamera = width / height < 0.95
        if (compactCamera !== useCompactCamera) {
          const distanceScale = useCompactCamera ? 1.5 : 1
          camera.position.set(0, 8.2 * distanceScale, 8.6 * distanceScale)
          controls.target.set(0, 0, 0)
          controls.update()
          controls.saveState()
          compactCamera = useCompactCamera
        }
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderScene()
      }
      const resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(mount)

      const raycaster = new THREE.Raycaster()
      const pointer = new THREE.Vector2()
      let pointerStart = null

      const handlePointerDown = (event) => {
        pointerStart = { x: event.clientX, y: event.clientY }
      }
      const handlePointerUp = (event) => {
        if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) {
          pointerStart = null
          return
        }
        pointerStart = null
        const bounds = renderer.domElement.getBoundingClientRect()
        pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
        pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
        raycaster.setFromCamera(pointer, camera)
        const hit = raycaster.intersectObjects(sceneStateRef.current?.squareMeshes || [], false)[0]
        if (hit?.object.userData.square) selectSquareRef.current(hit.object.userData.square)
      }
      renderer.domElement.addEventListener('pointerdown', handlePointerDown)
      renderer.domElement.addEventListener('pointerup', handlePointerUp)

      sceneStateRef.current = {
        boardRoot,
        camera,
        controls,
        pieceRoot,
        renderScene,
        renderer,
        squareMeshes: [],
      }
      resize()

      return () => {
        resizeObserver.disconnect()
        controls.removeEventListener('change', renderScene)
        controls.dispose()
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
        renderer.domElement.removeEventListener('pointerup', handlePointerUp)
        disposeGroup(boardRoot)
        disposeGroup(pieceRoot)
        renderer.dispose()
        renderer.domElement.remove()
        sceneStateRef.current = null
      }
    } catch {
      renderer?.dispose()
      queueMicrotask(() => setUnavailable(true))
      return undefined
    }
  }, [])

  useEffect(() => {
    const state = sceneStateRef.current
    if (!state) return

    disposeGroup(state.boardRoot)
    disposeGroup(state.pieceRoot)
    state.squareMeshes = []

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(8.45, 0.28, 8.45),
      new THREE.MeshStandardMaterial({ color: 0x25343a, roughness: 0.75 }),
    )
    base.position.y = -0.18
    base.receiveShadow = true
    state.boardRoot.add(base)

    squares.forEach(({ isLight, isSelected, isTarget, piece, square }) => {
      const { x, z } = squarePosition(square, isBlackView)
      const color = isSelected ? selectedSquare : isTarget ? targetSquare : isLight ? lightSquare : darkSquare
      const squareMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.99, 0.1, 0.99),
        new THREE.MeshStandardMaterial({ color, roughness: 0.78 }),
      )
      squareMesh.position.set(x, 0, z)
      squareMesh.receiveShadow = true
      squareMesh.userData.square = square
      state.squareMeshes.push(squareMesh)
      state.boardRoot.add(squareMesh)

      if (isTarget) {
        const marker = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 0.025, 24),
          new THREE.MeshBasicMaterial({ color: 0x173c38, transparent: true, opacity: 0.7 }),
        )
        marker.position.set(x, 0.07, z)
        state.boardRoot.add(marker)
      }

      if (piece) {
        const model = createPieceModel(piece)
        model.position.set(x, 0.06, z)
        if (piece.color === 'b') model.rotation.y = Math.PI
        state.pieceRoot.add(model)
      }
    })

    state.renderScene()
  }, [isBlackView, squares])

  if (unavailable) {
    return (
      <div className="chess-3d-unavailable" role="status">
        <strong>3D is unavailable on this device.</strong>
        <span>The regular board will work everywhere.</span>
        <button type="button" onClick={onUse2D}>Use 2D board</button>
      </div>
    )
  }

  function resetView() {
    const state = sceneStateRef.current
    if (!state) return
    state.controls.reset()
    state.controls.update()
    state.renderScene()
  }

  return (
    <div className="chess-3d-shell">
      <div
        className="chess-3d-canvas"
        ref={mountRef}
        role="application"
        aria-label="Interactive 3D chess board. Tap a piece and then a highlighted square. Drag to rotate the camera."
      />
      <button className="chess-view-reset" type="button" onClick={resetView}>
        <RotateCcw size={15} />
        Reset view
      </button>
      <span className="chess-3d-hint">Tap to move · Drag to rotate · Pinch to zoom</span>
    </div>
  )
}
