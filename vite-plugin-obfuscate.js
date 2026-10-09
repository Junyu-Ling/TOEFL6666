import JavaScriptObfuscator from "javascript-obfuscator";

/**
 * 仅对指定敏感 chunk 做生产混淆，避免整站 React 被打挂。
 */
export function obfuscatePlugin({
  include = [/rf-secure/, /readingFillSecure/, /usePassageContentProtection/],
  enabled,
} = {}) {
  return {
    name: "toefl-obfuscate",
    apply: "build",
    enforce: "post",
    renderChunk(code, chunk) {
      if (enabled === false) return null;
      const id = `${chunk.fileName || ""} ${(chunk.name || "")}`;
      const moduleIds = Object.keys(chunk.modules || {});
      const match = include.some(
        (re) => re.test(id) || moduleIds.some((m) => re.test(m))
      );
      if (!match) return null;
      try {
        const result = JavaScriptObfuscator.obfuscate(code, {
          compact: true,
          controlFlowFlattening: false,
          deadCodeInjection: false,
          stringArray: true,
          stringArrayThreshold: 0.75,
          rotateStringArray: true,
          selfDefending: false,
          renameGlobals: false,
          simplify: true,
        });
        return { code: result.getObfuscatedCode(), map: null };
      } catch {
        return null;
      }
    },
  };
}
