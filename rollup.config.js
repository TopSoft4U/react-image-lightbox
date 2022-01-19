import {nodeResolve} from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import {babel} from "@rollup/plugin-babel";
import postcss from "rollup-plugin-postcss";
import typescript from "@rollup/plugin-typescript";
import analyze from "rollup-plugin-analyzer";
import uglify from "@lopatnov/rollup-plugin-uglify";

import pkg from "./package.json";

export default {
  input: "./src/index.ts",
  output: [
    {
      entryFileNames: pkg.main,
      format: "cjs",
      exports: "named",
      dir: __dirname,
    },
    {
      entryFileNames: pkg.module,
      format: "esm",
      exports: "named",
      dir: __dirname,
    },
  ],
  external: [
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.peerDependencies),
    "tslib",
    "react/jsx-runtime",
  ],
  plugins: [
    nodeResolve(),
    commonjs({
      // include: "node_modules/**",
      exclude: "node_modules/**",
    }),
    typescript({tsconfig: "./tsconfig.build.json"}),
    postcss({extract: "dist/style.css", minimize: true}),
    babel({
      exclude: "node_modules/**",
      babelHelpers: "runtime"
    }),
    uglify(),
    analyze(),
  ],
};
