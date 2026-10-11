/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://images.unsplash.com https://api.dicebear.com",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* http://back.dev https://back.dev",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  // Standalone output: traces only the runtime deps actually used and copies
  // them (+ a minimal server.js) into .next/standalone. Lets the Docker
  // "runner" image ship without node_modules/source, just `node server.js`.
  // Only set for the Docker build (DOCKER_BUILD=1 in the Dockerfile) --
  // "next start" (used by the Laragon-hosted build) is incompatible with it.
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
    // Dicebear avatars/logos are served as SVG. They're our own trusted
    // integration (not user-uploaded SVGs), so allowing them through the
    // optimizer is safe with the sandboxing CSP Next.js recommends.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Do NOT remove: the SWC minifier mis-minifies a template literal with
  // escaped backticks inside @radix-ui/react-progress (as of the versions
  // pinned in package.json), producing a syntax error in the server chunk
  // ("missing ) after argument list") that fails the production build.
  // Confirmed by actually building with this removed -- Terser (the
  // fallback when swcMinify is false) handles it correctly.
  swcMinify: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;