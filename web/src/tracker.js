// "Mắt" của app: MediaPipe dò bàn tay + người ngay trong trình duyệt (không gửi hình đi đâu).
// Dùng đúng 2 model mà ai/ đã dùng khi train, nên con số khớp với lúc AI học.
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision'
import { frameFeatures } from './features.js'

const BASE = `${import.meta.env.BASE_URL}mediapipe`

// Thử trên máy: ?delegate=CPU để so với lúc train (Python chạy CPU)
const ORDER = import.meta.env.DEV && new URLSearchParams(location.search).get('delegate') === 'CPU' ? ['CPU'] : ['GPU', 'CPU']

async function create(Cls, fileset, file, extra) {
  for (const delegate of ORDER) {
    try {
      return await Cls.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${BASE}/${file}`, delegate },
        runningMode: 'VIDEO',
        ...extra,
      })
    } catch (err) {
      if (delegate === 'CPU') throw err // máy không có GPU thì thử CPU, CPU cũng lỗi mới báo
    }
  }
}

export async function createTracker() {
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}/wasm`)
  const hand = await create(HandLandmarker, fileset, 'hand_landmarker.task', { numHands: 2 })
  const pose = await create(PoseLandmarker, fileset, 'pose_landmarker_lite.task', { numPoses: 1 })
  let state = {}
  let lastTs = -1

  return {
    reset() { state = {} },
    // video: thẻ <video> đang chạy; ts: mili-giây, phải tăng dần
    detect(video, ts) {
      ts = Math.max(Math.round(ts), lastTs + 1)
      lastTs = ts
      const hr = hand.detectForVideo(video, ts)
      const pr = pose.detectForVideo(video, ts)
      const poseLm = pr.landmarks?.[0] ?? null
      const hands = hr.landmarks.map(h => h.map(l => [l.x, l.y, l.z]))
      const frame = frameFeatures(poseLm && poseLm.map(l => [l.x, l.y, l.z]), hands, video.videoWidth / video.videoHeight, state)
      return { frame, hands: hands.length, landmarks: { hands: hr.landmarks, pose: poseLm } }
    },
  }
}
