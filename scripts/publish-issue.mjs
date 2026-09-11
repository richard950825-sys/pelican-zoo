import { mkdir, readFile, writeFile } from "node:fs/promises";

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
const issue = event.issue;
const body = issue.body || "";
const maxBytes = 5 * 1024 * 1024;
const models = new Set(["GPT / Codex", "Claude", "Gemini", "DeepSeek", "通义千问", "Kimi", "GLM", "豆包", "其他"]);

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

const attachment = section("HTML 文件").match(/\[([^\]]+\.html?)\]\((https:\/\/github\.com\/user-attachments\/[^)\s]+)\)/i);
if (!attachment) throw new Error("没有找到 .html 附件。请在“HTML 文件”框中附加一个文件。");

const response = await fetch(attachment[2], { redirect: "follow" });
if (!response.ok) throw new Error(`无法下载附件（HTTP ${response.status}）。`);
const length = Number(response.headers.get("content-length"));
if (Number.isFinite(length) && length > maxBytes) throw new Error("文件超过 5 MB。");
const content = Buffer.from(await response.arrayBuffer());
if (!content.length || content.length > maxBytes || content.subarray(0, 4096).includes(0)) throw new Error("文件为空、超过 5 MB 或不是文本 HTML。");

const model = short(section("生成模型"));
if (!models.has(model)) throw new Error("生成模型无效。");
const modelDetail = model === "其他" ? short(section("其他模型名称"), "其他") : "";
const filename = attachment[1].replace(/\.html?$/i, "");
const title = short(section("标题"), short(filename, "未命名作品"));
const id = `issue-${issue.number}`;
const path = `works/${id}.html`;

await mkdir("works", { recursive: true });
await writeFile(path, content);
const works = JSON.parse(await readFile("works.json", "utf8"));
if (works.some((work) => work.id === id)) throw new Error("该作品已经发布。");
works.unshift({ id, title, model, model_detail: modelDetail, created_at: issue.created_at, source_url: path });
await writeFile("works.json", `${JSON.stringify(works, null, 2)}\n`);
console.log(`Published ${path}`);
