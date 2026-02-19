// Fingerprint fragment shader
// Procedural pattern + color based entirely on hash-derived uniforms.

uniform float uTime;

// Colors (passed as HSL-derived RGB)
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;

// Pattern
uniform int uPatternType;       // 0..7  maps to PatternType enum
uniform float uPatternFrequency;// 1..16
uniform float uPatternDensity;  // 0..1

// Border
uniform int uBorderStyle;       // 0=none 1=thin 2=thick 3=glow
uniform float uBorderWidth;     // 0..1

// Animation
uniform float uShimmerIntensity;// 0..0.6
uniform float uColorShift;      // 0..0.3
uniform float uPulseRate;       // 0.2..2.0

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

//
// Simplex noise (2D) — for pattern generation
//
vec2 mod289_2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289_3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute3(vec3 x) { return mod289_3(((x * 34.0) + 1.0) * x); }

float snoise2(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289_2(i);
  vec3 p = permute3(permute3(i.y + vec3(0.0, i1.y, 1.0))
                    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                           dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x * x0.x  + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Pseudo-random hash
float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Voronoi — returns distance to nearest point
float voronoi(vec2 uv) {
  vec2 i = floor(uv);
  vec2 f = fract(uv);
  float minDist = 1e10;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 n = vec2(float(x), float(y));
      vec2 r = n + vec2(hash21(i + n), hash21(i + n + 37.0)) - f;
      minDist = min(minDist, dot(r, r));
    }
  }
  return sqrt(minDist);
}

// Rings pattern
float rings(vec2 uv, float freq) {
  float d = length(uv - 0.5) * 2.0;
  return fract(d * freq);
}

// Grid pattern
float grid(vec2 uv, float freq) {
  vec2 g = fract(uv * freq);
  return min(g.x, g.y);
}

// Hexagonal tiling (approximate)
float hex(vec2 uv, float freq) {
  uv *= freq;
  vec2 r = vec2(1.0, 1.732);
  vec2 h = 0.5 * r;
  vec2 a = mod(uv, r) - h;
  vec2 b = mod(uv - h, r) - h;
  return min(dot(a, a), dot(b, b));
}

// Spiral pattern
float spiral(vec2 uv, float freq) {
  vec2 c = uv - 0.5;
  float angle = atan(c.y, c.x);
  float radius = length(c);
  return fract((angle / (2.0 * 3.14159) + radius) * freq);
}

// Stripes
float stripes(vec2 uv, float freq) {
  return fract(uv.x * freq + uv.y * freq * 0.3);
}

// Dots
float dots(vec2 uv, float freq) {
  vec2 g = fract(uv * freq) - 0.5;
  return length(g);
}

// Select pattern by type index
float getPattern(vec2 uv, int type, float freq) {
  if (type == 0) return voronoi(uv * freq);
  if (type == 1) return (snoise2(uv * freq) + 1.0) * 0.5;
  if (type == 2) return rings(uv, freq);
  if (type == 3) return grid(uv, freq);
  if (type == 4) return hex(uv, freq);
  if (type == 5) return spiral(uv, freq);
  if (type == 6) return stripes(uv, freq);
  return dots(uv, freq); // 7
}

// HSL to RGB conversion
vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x / 360.0;
  float s = hsl.y;
  float l = hsl.z;
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
  float m = l - c / 2.0;
  vec3 rgb;
  if (h < 1.0/6.0)      rgb = vec3(c, x, 0.0);
  else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
  else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
  else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
  else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
  else                   rgb = vec3(c, 0.0, x);
  return rgb + m;
}

void main() {
  vec2 uv = vUv;
  float t = uTime * uPulseRate * 0.1;

  // --- Pattern ---
  float pattern = getPattern(uv, uPatternType, uPatternFrequency);
  pattern = clamp(pattern * uPatternDensity, 0.0, 1.0);

  // --- Shimmer (slow animated noise) ---
  float shimmer = snoise2(uv * 3.0 + vec2(t, t * 0.7));
  shimmer = shimmer * 0.5 + 0.5; // remap to [0,1]

  // --- Color mixing ---
  // Shift hue over time slightly based on colorShift uniform
  float hueOffset = uColorShift * sin(t * 0.5) * 30.0; // ±30 degrees max
  vec3 primary = uPrimaryColor;
  vec3 secondary = uSecondaryColor;

  vec3 baseColor = mix(primary, secondary, pattern);

  // Add shimmer highlight
  baseColor += shimmer * uShimmerIntensity * 0.3;

  // --- Lighting (simple rim + diffuse) ---
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(-vPosition);
  float diffuse = max(dot(normal, normalize(vec3(1.0, 1.5, 2.0))), 0.0);
  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);

  vec3 lit = baseColor * (0.4 + 0.6 * diffuse) + primary * rim * 0.5;

  // --- Border / glow ---
  float edgeDist = length(uv - 0.5) * 2.0; // 0 center, 1 edge
  if (uBorderStyle == 3) {
    // glow: add primary color glow at edges
    float glow = smoothstep(0.7, 1.0, edgeDist);
    lit += primary * glow * 1.2;
  } else if (uBorderStyle >= 1) {
    float bw = uBorderWidth * (uBorderStyle == 2 ? 2.0 : 1.0);
    float border = smoothstep(1.0 - bw, 1.0 - bw * 0.3, edgeDist);
    lit = mix(lit, primary, border);
  }

  gl_FragColor = vec4(lit, 1.0);
}
