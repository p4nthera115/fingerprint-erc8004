/// <reference types="vite/client" />

// GLSL shader imports (via vite-plugin-glsl)
declare module '*.vert' {
  const src: string
  export default src
}
declare module '*.frag' {
  const src: string
  export default src
}
declare module '*.glsl' {
  const src: string
  export default src
}
