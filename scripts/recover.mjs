import { readFileSync, writeFileSync } from 'fs';

const logPath = 'C:\\Users\\shiva\\.gemini\\antigravity-cli\\brain\\51c404ec-11fc-47ff-9dfa-8e0a7c415938\\.system_generated\\logs\\transcript_full.jsonl';
const lines = readFileSync(logPath, 'utf8').split('\n');

let foundContent = null;

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 73) {
      foundContent = obj.content;
      break;
    }
  } catch (e) { }
}

if (foundContent) {
  const match = foundContent.match(/remove the line number, colon, and leading space\.\n1: ([\s\S]*?)\nThe above content shows the entire/);
  if (match) {
    let content = "1: " + match[1];
    // Remove the line number prefixes (e.g. "1: ", "23: ", "594: ")
    content = content.replace(/^[0-9]+: /gm, '');
    writeFileSync('src/app/portal/(portal)/settings/LinktreeLinksEditor.tsx', content, 'utf8');
    console.log("Restored LinktreeLinksEditor.tsx!");
  } else {
    console.log("Regex match failed on the content.");
  }
} else {
  console.log("Could not find the file content in the transcript.");
}
