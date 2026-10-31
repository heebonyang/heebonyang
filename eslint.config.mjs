import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  { ignores: [".next/", "out/", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // 객체에서 일부 필드를 빼낼 때 쓰는 _이름 변수는 허용
  { rules: { "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }] } },
];
