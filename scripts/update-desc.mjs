import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/portal/(portal)/[subscriptionId]/linktree/LinktreeSettings.tsx';
let content = readFileSync(filePath, 'utf8');

const regexDesc = /\{t\("portal_linktree_links_desc", lang\)\}/g;
const regexHint = /\{t\("portal_linktree_lang_hint", lang\)\}/g;
const regexTitle = /\{t\("portal_linktree_links_title", lang\)\}/g;

const newTitle = `{lang === "pl" ? "Elementy na profilu" : "Profile Elements"}`;
const newDesc = `{lang === "pl" ? "Dostosuj zawartość swojego profilu. Możesz dodać do 7 własnych linków i dowolnie zmieniać kolejność wszystkich elementów." : "Customize your profile content. You can add up to 7 custom links and freely reorder all elements."}`;
const newHint = `{lang === "pl" ? "Wybierz język z paska poniżej, aby przetłumaczyć napisy dla obcokrajowców. Klient automatycznie zobaczy wersję dopasowaną do języka jego telefonu." : "Select a language from the bar below to translate the text for foreigners. Customers will automatically see the version matching their phone's language."}`;

content = content.replace(regexTitle, newTitle);
content = content.replace(regexDesc, newDesc);
content = content.replace(regexHint, newHint);

writeFileSync(filePath, content, 'utf8');
console.log("Updated descriptions in LinktreeSettings.tsx");
