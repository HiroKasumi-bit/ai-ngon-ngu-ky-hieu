// Logo 3D thật cho trang giới thiệu: đôi tay chụm (xanh ngọc) nâng bong bóng lời nói (vàng) có ba chấm.
// Dựng giống hệt bản render của poster (poster/3d/logo3d.html): một đèn chính trên-trái,
// ánh sáng môi trường dịu, bóng mềm rơi lên một "bức tường" vô hình phía sau.
//
// Logo luôn đứng yên ở gốc toạ độ. Muốn đặt logo ở chỗ nào, cỡ bao nhiêu trên màn hình thì dời
// khung nhìn của camera (view.x, view.y, view.size, tính bằng px). Nhờ vậy bóng đổ luôn rơi đúng chỗ.
import * as THREE from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// Cùng đường nét với web/public/logo.svg
const PATH = {
  left: 'M96 214 C90 182 110 160 138 158 C152 158 160 170 154 184 C146 206 150 232 162 254 C188 304 222 328 246 332 L246 424 C172 420 114 360 96 214Z',
  right: 'M416 214 C422 182 402 160 374 158 C360 158 352 170 358 184 C366 206 362 232 350 254 C324 304 290 328 266 332 L266 424 C340 420 398 360 416 214Z',
  bubble: 'M256 168 C298 168 330 196 330 234 C330 272 298 298 258 298 C246 298 236 296 228 292 L196 304 L208 278 C192 266 182 250 182 234 C182 196 214 168 256 168Z',
}
const LOGO_H = 266 // chiều cao logo theo đơn vị SVG (y từ 158 tới 424)
const FOV = 26
const TILT = { x: -0.08, y: -0.34, z: 0.02 } // góc nghiêng 3/4 giống poster

const shapeOf = d => SVGLoader.createShapes(new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`).paths[0])
const extrude = (d, depth, bev) => new THREE.ExtrudeGeometry(shapeOf(d), {
  depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.6, bevelSegments: 12, curveSegments: 64,
})
// Đưa tâm hình về gốc rồi đặt mesh vào đúng chỗ cũ: mỗi phần xoay, phóng quanh tâm của chính nó (để lắp ráp).
function centered(geo, material) {
  geo.computeBoundingBox()
  const c = geo.boundingBox.getCenter(new THREE.Vector3())
  geo.translate(-c.x, -c.y, -c.z)
  const mesh = new THREE.Mesh(geo, material)
  mesh.position.copy(c)
  mesh.castShadow = mesh.receiveShadow = true
  return mesh
}

/** Trả về null nếu máy không chạy được WebGL (trang sẽ dùng ảnh tĩnh thay thế). */
export function createLogo3D(canvas) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.VSMShadowMap

  const scene = new THREE.Scene()
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.62

  const mat = (color, roughness = 0.42) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.35 })
  const teal = mat('#179C90'), sun = mat('#FFC431', 0.38), navy = mat('#18265A', 0.45)

  const left = centered(extrude(PATH.left, 34, 12), teal)
  const right = centered(extrude(PATH.right, 34, 12), teal)
  const bubble = centered(extrude(PATH.bubble, 26, 14), sun)
  bubble.position.z += 34
  const dotZ = 34 + 26 + 14 + 2 - bubble.position.z // nằm sát mặt trước bong bóng
  const dots = [228, 256, 284].map(x => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(11, 48, 32), navy)
    d.scale.z = 0.45
    d.position.set(x - bubble.position.x, 234 - bubble.position.y, dotZ)
    d.castShadow = true
    bubble.add(d)
    return d
  })
  const dotY = dots[0].position.y

  const logo = new THREE.Group()
  logo.add(left, right, bubble)
  logo.scale.set(1, -1, 1) // SVG có trục y hướng xuống
  logo.position.set(-256, 291, 0)
  const pivot = new THREE.Group()
  pivot.add(logo)
  pivot.rotation.set(TILT.x, TILT.y, TILT.z)
  scene.add(pivot)

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.ShadowMaterial({ color: 0x06302C, opacity: 0.28 }))
  wall.position.z = -30
  wall.receiveShadow = true
  scene.add(wall)

  const key = new THREE.DirectionalLight(0xffffff, 1.8)
  key.position.set(-260, 420, 520)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, { left: -560, right: 560, top: 560, bottom: -560, near: 10, far: 2000 })
  key.shadow.radius = 18
  key.shadow.blurSamples = 24
  key.shadow.bias = -0.0004
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xEAFBF8, 0.5)
  fill.position.set(400, 60, 300)
  scene.add(fill)

  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 8000)
  const view = { x: 0, y: 0, size: 300 } // tâm logo (px) và chiều cao logo (px) trên canvas
  let w = 1, h = 1
  function aim() {
    const dist = LOGO_H * h / (2 * Math.tan(FOV * Math.PI / 360) * Math.max(view.size, 1))
    camera.position.set(0, 0, dist)
    camera.aspect = w / h
    camera.setViewOffset(w, h, w / 2 - view.x, h / 2 - view.y, w, h)
    camera.updateProjectionMatrix()
  }

  const pointer = { x: 0, y: 0 }
  const api = {
    parts: { left, right, bubble, dots, pivot },
    view,
    typing: false, // ba chấm nhấp nhô như đang gõ
    setPointer(nx, ny) { pointer.x = nx; pointer.y = ny },
    resize(width, height) { w = width; h = height; renderer.setSize(w, h, false) },
    renderOnce() { aim(); renderer.render(scene, camera) },
    start() { if (!raf) raf = requestAnimationFrame(frame) },
    stop() { cancelAnimationFrame(raf); raf = 0 },
  }

  let raf = 0
  const clock = new THREE.Clock()
  function frame() {
    raf = requestAnimationFrame(frame)
    const t = clock.getElapsedTime()
    // nghiêng theo chuột, chậm và êm; thêm nhịp thở rất nhẹ cho logo không đứng chết
    pivot.rotation.y += (TILT.y + pointer.x * 0.16 + Math.sin(t * 0.6) * 0.025 - pivot.rotation.y) * 0.06
    pivot.rotation.x += (TILT.x + pointer.y * 0.1 - pivot.rotation.x) * 0.06
    dots.forEach((d, i) => {
      const lift = api.typing ? Math.max(0, Math.sin(t * 5.2 - i * 0.85)) * 6 : 0
      d.position.y = dotY - lift // trong hệ đã lật trục y: trừ là đi lên
    })
    api.renderOnce()
  }
  return api
}
