declare module "@paper-design/shaders-react" {
  import type { ComponentType } from "react"

  export type DitheringProps = {
    colorBack?: string
    colorFront?: string
    shape?: "warp" | string
    type?: "4x4" | string
    speed?: number
    className?: string
    minPixelRatio?: number
  }

  export const Dithering: ComponentType<DitheringProps>
}
