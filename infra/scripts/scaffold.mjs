import { mkdirSync, writeFileSync } from 'node:fs';
const write = (path, content) => {
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n');
};
const shared = {
  private: true,
  version: '0.1.0',
  type: 'module',
  main: './src/index.ts',
  scripts: { typecheck: 'tsc --noEmit' },
};
const packages = {
  database: { '@prisma/client': '^6.19.0', dotenv: '^16.6.0' },
  validation: { zod: '^4.1.0' },
  types: {},
  commerce: { '@mitti/validation': 'workspace:*' },
  integrations: {
    '@aws-sdk/client-s3': '^3.850.0',
    nodemailer: '^7.0.0',
    bullmq: '^5.56.0',
    ioredis: '^5.6.0',
    pino: '^9.7.0',
  },
  ui: { react: '^19.2.0', 'lucide-react': '^0.468.0', '@radix-ui/react-dialog': '^1.1.0' },
};
for (const [name, deps] of Object.entries(packages)) {
  write(`packages/${name}/package.json`, {
    ...shared,
    name: `@mitti/${name}`,
    dependencies: deps,
    ...(name === 'database'
      ? {
          scripts: {
            ...shared.scripts,
            generate: 'prisma generate',
            migrate: 'dotenv -e ../../.env -- prisma migrate deploy',
            'migrate:dev': 'dotenv -e ../../.env -- prisma migrate dev',
            seed: 'dotenv -e ../../.env -- tsx prisma/seed.ts',
          },
          devDependencies: { prisma: '^6.19.0' },
        }
      : {}),
    ...(name === 'integrations' ? { devDependencies: { '@types/nodemailer': '^6.4.0' } } : {}),
  });
  write(`packages/${name}/tsconfig.json`, {
    extends: '../../tsconfig.json',
    compilerOptions: { ...(name === 'ui' ? { jsx: 'react-jsx' } : {}) },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
  });
}
for (const app of ['storefront', 'admin']) {
  write(`apps/${app}/package.json`, {
    name: `@mitti/${app}`,
    private: true,
    version: '0.1.0',
    scripts: {
      dev: `next dev -p ${app === 'storefront' ? 3000 : 3001}`,
      build: 'next build',
      start: `next start -p ${app === 'storefront' ? 3000 : 3001}`,
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      next: '^16.2.0',
      react: '^19.2.0',
      'react-dom': '^19.2.0',
      '@mitti/ui': 'workspace:*',
      '@mitti/types': 'workspace:*',
      '@mitti/validation': 'workspace:*',
      '@mitti/commerce': 'workspace:*',
      '@tanstack/react-query': '^5.83.0',
      '@tanstack/react-table': '^8.21.0',
      'react-hook-form': '^7.61.0',
      '@hookform/resolvers': '^5.2.0',
      zod: '^4.1.0',
      'lucide-react': '^0.468.0',
      'framer-motion': '^12.23.0',
      recharts: '^3.1.0',
      zustand: '^5.0.0',
    },
    devDependencies: { tailwindcss: '^4.1.0', '@tailwindcss/postcss': '^4.1.0' },
  });
  write(`apps/${app}/tsconfig.json`, {
    extends: '../../tsconfig.json',
    compilerOptions: {
      jsx: 'react-jsx',
      allowJs: true,
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts', '.next/dev/types/**/*.ts'],
    exclude: ['node_modules'],
  });
  write(
    `apps/${app}/next-env.d.ts`,
    '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
  );
  write(`apps/${app}/postcss.config.mjs`, "export default {plugins:{'@tailwindcss/postcss':{}}};\n");
  write(
    `apps/${app}/next.config.ts`,
    `import type { NextConfig } from 'next';\nconst config: NextConfig = {transpilePackages:['@mitti/ui','@mitti/types','@mitti/validation','@mitti/commerce'], images:{remotePatterns:[{protocol:'https',hostname:'images.unsplash.com'},{protocol:'http',hostname:'localhost',port:'9006'}]},async rewrites(){return [{source:'/api/:path*',destination:(process.env.API_URL || 'http://localhost:4000')+'/:path*'}]},async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'}]}]}};\nexport default config;\n`,
  );
}
write('apps/api/package.json', {
  name: '@mitti/api',
  private: true,
  version: '0.1.0',
  scripts: {
    dev: 'dotenv -e ../../.env -- tsx watch src/main.ts',
    build: 'tsc -p tsconfig.build.json',
    start: 'tsx src/main.ts',
    typecheck: 'tsc --noEmit',
  },
  dependencies: {
    '@nestjs/common': '^11.1.0',
    '@nestjs/core': '^11.1.0',
    '@nestjs/platform-express': '^11.1.0',
    '@nestjs/swagger': '^11.2.0',
    '@nestjs/throttler': '^6.4.0',
    'reflect-metadata': '^0.2.2',
    rxjs: '^7.8.0',
    '@mitti/database': 'workspace:*',
    '@mitti/validation': 'workspace:*',
    '@mitti/commerce': 'workspace:*',
    '@mitti/integrations': 'workspace:*',
    '@mitti/types': 'workspace:*',
    express: '^5.1.0',
    'cookie-parser': '^1.4.7',
    helmet: '^8.1.0',
    sharp: '^0.34.0',
    zod: '^4.1.0',
    pino: '^9.7.0',
    multer: '^2.0.0',
  },
  devDependencies: {
    '@types/express': '^5.0.0',
    '@types/cookie-parser': '^1.4.9',
    '@types/multer': '^2.0.0',
  },
});
write('apps/api/tsconfig.json', {
  extends: '../../tsconfig.json',
  compilerOptions: { experimentalDecorators: true, emitDecoratorMetadata: true },
  include: ['src/**/*.ts'],
});
write('apps/api/tsconfig.build.json', {
  extends: './tsconfig.json',
  compilerOptions: { noEmit: false, outDir: 'dist', declaration: true, sourceMap: true },
});
