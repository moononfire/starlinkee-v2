import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/portal/(portal)/settings/LinktreeLinksEditor.tsx';
let content = readFileSync(filePath, 'utf8');

const regex3 = /const removeLink = \(idx: number\) => \{\s*setLinks\(links\.filter\(\(_, i\) => i !== idx\)\);\s*setExpandedStyleIdx\(null\);\s*\};/m;

const replacement3 = `const removeLink = (idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
    setExpandedStyleIdx(null);
    setActiveTab((prev) => {
      const next = { ...prev };
      delete next[idx];
      const newTab: Record<number, any> = {};
      for (const [k, v] of Object.entries(next)) {
        const key = parseInt(k, 10);
        if (key > idx) newTab[key - 1] = v;
        else newTab[key] = v;
      }
      return newTab;
    });
    setModuleOrder((prev) => {
      const next = prev.filter((m) => m !== \`link:\${idx}\`);
      return next.map((m) => {
        if (m.startsWith("link:")) {
          const k = parseInt(m.substring(5), 10);
          if (k > idx) return \`link:\${k - 1}\`;
        }
        return m;
      });
    });
  };`;

if (content.match(regex3)) {
  content = content.replace(regex3, replacement3);
  console.log("Patched removeLink");
} else {
  console.log("Failed to patch removeLink");
}

writeFileSync(filePath, content, 'utf8');
