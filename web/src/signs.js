// Các ngôn ngữ ký hiệu app hiểu. Mỗi ngôn ngữ: danh sách từ (do ai/train.py xuất, khớp với model)
// và tên hiển thị tiếng Việt / tiếng Anh cho từng từ (names), cùng vài từ gợi ý để thử.
import vslWords from './words/vsl.json' with { type: 'json' }
import vslNames from './words/vsl.names.json' with { type: 'json' }
import aslWords from './words/asl.json' with { type: 'json' }
import aslNames from './words/asl.names.json' with { type: 'json' }
import { wordLabel } from './sentence.js'

export const SIGNS = {
  vsl: { words: vslWords, names: vslNames, examples: ['khẩu_trang', 'điện_thoại', 'đúng', 'sai'] },
  asl: { words: aslWords, names: aslNames, examples: ['thankyou', 'drink', 'water', 'sleep'] },
}

// Tên một từ theo ngôn ngữ giao diện; không có bản dịch thì dùng nhãn gốc (bỏ dấu gạch dưới).
export const wordName = (sign, label, ui) => SIGNS[sign]?.names[label]?.[ui] ?? wordLabel(label)
