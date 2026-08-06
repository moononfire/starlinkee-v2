import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'src/app/portal/(portal)/settings/LinktreeLinksEditor.tsx');
let content = readFileSync(filePath, 'utf8');

// 1. Update moduleOrder state
const stateMatch = content.match(/const defaultOrder = \[.*?\];\n\s*const \[moduleOrder, setModuleOrder\] = useState<string\[\]>\(\(\) => \{[\s\S]*?\n\s*\}\);/);
if (stateMatch) {
  const newState = `const defaultOrder = ["review", "promo", "loyalty", "wifi", "menu"];
  const [moduleOrder, setModuleOrder] = useState<string[]>(() => {
    let order = initialModuleOrder ? [...initialModuleOrder] : [...defaultOrder];
    if (!order.includes("review")) order = ["review", ...order];
    for (let i = 0; i < initialLinks.length; i++) {
      if (!order.includes(\`link:\${i}\`)) order.push(\`link:\${i}\`);
    }
    return order;
  });`;
  content = content.replace(stateMatch[0], newState);
}

// 2. Update addLink
const addlinkMatch = content.match(/const addLink = \(\) => \{[\s\S]*?setLinks\(\[\.\.\.links, \{.*?\}\]\);\n\s*\};/);
if (addlinkMatch) {
  const newAddlink = `const addLink = () => {
    if (links.length >= MAX_LINKS) return;
    setLinks([...links, { title_pl: "", title_en: "", title_de: "", url: "", icon: null, background: null }]);
    setModuleOrder(prev => [...prev, \`link:\${links.length}\`]);
  };`;
  content = content.replace(addlinkMatch[0], newAddlink);
}

// 3. Update removeLink
const removelinkMatch = content.match(/const removeLink = \(idx: number\) => \{[\s\S]*?setExpandedStyleIdx\(null\);\n\s*\};/);
if (removelinkMatch) {
  const newRemovelink = `const removeLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
    setExpandedStyleIdx(null);
    setActiveTab(prev => {
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
    setModuleOrder(prev => {
      const next = prev.filter(m => m !== \`link:\${idx}\`);
      return next.map(m => {
        if (m.startsWith("link:")) {
          const k = parseInt(m.substring(5), 10);
          if (k > idx) return \`link:\${k - 1}\`;
        }
        return m;
      });
    });
  };`;
  content = content.replace(removelinkMatch[0], newRemovelink);
}

writeFileSync(filePath, content, 'utf8');
