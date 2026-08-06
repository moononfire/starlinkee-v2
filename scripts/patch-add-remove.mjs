import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/portal/(portal)/settings/LinktreeLinksEditor.tsx';
let content = readFileSync(filePath, 'utf8');

const regex = /const addLink = \(\) => \{\s*if \(links\.length >= MAX_LINKS\) return;\s*setLinks\(\[\.\.\.links, \{ title_pl: "", title_en: "", title_de: "", url: "", icon: null, background: null \}\]\);\s*\};\s*const removeLink = \(idx: number\) => \{\s*setLinks\(links\.filter\(\(_, i\) => i !== idx\)\);\s*setExpandedStyleIdx\(null\);\s*\};/m;

const replacementStr = `const addLink = () => {
    setLinks((prev) => {
      if (prev.length >= MAX_LINKS) return prev;
      setModuleOrder((order) => [...order, \`link:\${prev.length}\`]);
      return [...prev, { title_pl: "", title_en: "", title_de: "", url: "", icon: null, background: null }];
    });
  };

  const removeLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
    setExpandedStyleIdx(null);
    setActiveTab((prev) => {
      const next = { ...prev };
      delete next[idx];
      const newTab = {};
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

if (content.match(regex)) {
  content = content.replace(regex, replacementStr);
  writeFileSync(filePath, content, 'utf8');
  console.log("Successfully patched addLink and removeLink.");
} else {
  console.log("Failed to find target string using regex.");
}
