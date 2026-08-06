import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/portal/(portal)/settings/LinktreeLinksEditor.tsx';
let content = readFileSync(filePath, 'utf8');

const targetStr = '{t("portal_link_type_custom", lang) || "Custom Link"}';
const replacementStr = '{lang === "pl" ? "Własny link" : "Custom link"}';

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  writeFileSync(filePath, content, 'utf8');
  console.log("Fixed custom link label.");
} else {
  console.log("Could not find the target string.");
}
