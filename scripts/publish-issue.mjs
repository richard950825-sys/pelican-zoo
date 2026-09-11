import { mkdir, readFile, writeFile } from "node:fs/promises";

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
const issue = event.issue;
const body = issue.body || "";
const maxBytes = 5 * 1024 * 1024;
const models = new Set(["GPT / Codex", "Claude", "Gemini", "DeepSeek", "通义千问", "Kimi", "GLM", "豆包", "其他"]);

// 沙箱 iframe 的滚动无法从外部控制，发布时注入一段脚本让作品加载后自行滚到内容中心
const SCROLL_MARKER = "data-pelican-scroll";
const scrollCenterScript = `<script data-pelican-scroll>window.addEventListener("load",function(){requestAnimationFrame(function(){var d=document.documentElement,b=document.body,w=Math.max(d.scrollWidth,b?b.scrollWidth:0),h=Math.max(d.scrollHeight,b?b.scrollHeight:0);window.scrollTo(Math.max(0,(w-window.innerWidth)/2),Math.max(0,(h-window.innerHeight)/2))})});</script>`;

function section(label) {
  const start = `### ${label}`;
  const from = body.indexOf(start);
  if (from < 0) return "";
  const contentStart = from + start.length;
  const next = body.indexOf("\n### ", contentStart);
  return body.slice(contentStart, next < 0 ? undefined : next).trim();
}

function short(value, fallback = "") {
  return Array.from(value.replace(/\s+/g, " ").trim()).slice(0, 80).join("") || fallback;
}

function filled(label) {
  const value = section(label);
  return value && value !== "_No response_" ? value : "";
}

const attachment = section("HTML 文件").match(/\[([^\]]+\.html?)\]\((https:\/\/github\.com\/user-attachments\/[^)\s]+)\)/i);
if (!attachment) throw new Error("没有找到 .html 附件。请在“HTML 文件”框中附加一个文件。");

const response = await fetch(attachment[2], { redirect: "follow" });
if (!response.ok) throw new Error(`无法下载附件（HTTP ${response.status}）。`);
const length = Number(response.headers.get("content-length"));
if (Number.isFinite(length) && length > maxBytes) throw new Error("文件超过 5 MB。");
const content = Buffer.from(await response.arrayBuffer());
if (!content.length || content.length > maxBytes || content.subarray(0, 4096).includes(0)) throw new Error("文件为空、超过 5 MB 或不是文本 HTML。");

const model = short(filled("生成模型"));
if (!models.has(model)) throw new Error("生成模型无效。");
const modelDetail = model === "其他" ? short(filled("其他模型名称"), "其他") : "";
const filename = attachment[1].replace(/\.html?$/i, "");
const issueTitle = short((issue.title || "").replace(/^作品[：:]\s*/, ""));
const title = short(filled("标题")) || issueTitle || short(filename, "未命名作品");
const id = `issue-${issue.number}`;
const path = `works/${id}.html`;

const works = JSON.parse(await readFile("works.json", "utf8"));
if (works.some((work) => work.id === id)) {
  console.log(`Work ${id} has already been published; skipping.`);
  process.exit(0);
}
await mkdir("works", { recursive: true });
let html = content.toString("utf8");
if (!html.includes(SCROLL_MARKER)) {
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${scrollCenterScript}</body>`) : html + scrollCenterScript;
}
const payload = Buffer.from(html, "utf8");
if (payload.length > maxBytes) throw new Error("文件超过 5 MB。");
await writeFile(path, payload);
works.unshift({ id, title, model, model_detail: modelDetail, created_at: issue.created_at, source_url: path });
await writeFile("works.json", `${JSON.stringify(works, null, 2)}\n`);
console.log(`Published ${path}`);
