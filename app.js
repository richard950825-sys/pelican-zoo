const gallery = document.querySelector("#gallery");
const emptyState = document.querySelector("#empty-state");
const emptyText = document.querySelector("#empty-text");
const template = document.querySelector("#work-template");
const uploadButton = document.querySelector(".upload-button");
const issuesUrl = "https://github.com/richard950825-sys/pelican-zoo/issues";

const PENDING_KEY = "pelican-zoo:pending-upload";
const POLL_INTERVAL = 5000;
const WATCH_WINDOW = 10 * 60 * 1000;

let works = [];
let watcherRunning = false;

function addWork(work) {
  const node = template.content.firstElementChild.cloneNode(true);
  const title = work.title || "未命名作品";
  const frame = node.querySelector("iframe");
  frame.src = work.source_url;
  frame.title = title;
  node.querySelector(".work-title").textContent = title;
  node.querySelector(".work-model").textContent = work.model_detail || work.model;
  node.querySelector(".work-open").href = work.source_url;
  gallery.append(node);
}

function render() {
  gallery.replaceChildren();
  works.forEach(addWork);
  emptyState.hidden = works.length > 0;
}

async function loadWorks() {
  // no-cache：每次都向 CDN 重新校验，避免新作品因浏览器缓存延迟出现
  const response = await fetch("works.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("作品墙暂时无法加载。");
  works = await response.json();
  render();
}

loadWorks()
  .then(() => startWatcher())
  .catch(() => { emptyText.textContent = "作品墙暂时无法加载。"; emptyState.hidden = false; });

// 点击上传按钮时记下当前作品列表，作为之后检测“新作品”的基准
uploadButton.addEventListener("click", () => {
  localStorage.setItem(PENDING_KEY, JSON.stringify({ t: Date.now(), ids: works.map((w) => w.id) }));
});

document.addEventListener("visibilitychange", () => { if (!document.hidden) startWatcher(); });
window.addEventListener("pageshow", () => startWatcher());

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startWatcher() {
  if (watcherRunning) return;
  const raw = localStorage.getItem(PENDING_KEY);
  if (!raw) return;
  let pending;
  try {
    pending = JSON.parse(raw);
  } catch {
    localStorage.removeItem(PENDING_KEY);
    return;
  }
  if (!pending || !Array.isArray(pending.ids)) {
    localStorage.removeItem(PENDING_KEY);
    return;
  }
  watcherRunning = true;
  const banner = showToast("正在等待你的作品发布…");
  const deadline = Date.now() + WATCH_WINDOW;
  try {
    while (Date.now() < deadline) {
      if (document.hidden) { await sleep(1000); continue; }
      try {
        const response = await fetch("works.json", { cache: "no-cache" });
        if (response.ok) {
          const list = await response.json();
          const fresh = list.find((work) => !pending.ids.includes(work.id));
          if (fresh) {
            works = list;
            render();
            const card = gallery.children[list.indexOf(fresh)];
            if (card) {
              card.scrollIntoView({ behavior: "smooth", block: "center" });
              card.classList.add("just-published");
              setTimeout(() => card.classList.remove("just-published"), 4000);
            }
            showToast("🎉 你的作品已发布，已经出现在作品墙里。", null, 8000);
            return;
          }
        }
      } catch { /* 网络抖动，继续轮询 */ }
      await sleep(POLL_INTERVAL);
    }
    showToast("暂时没等到新作品发布，可以打开 Issues 检查提交是否失败。", issuesUrl);
  } finally {
    localStorage.removeItem(PENDING_KEY);
    banner.remove();
    watcherRunning = false;
  }
}

function showToast(message, link, autoHideMs) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  const text = document.createElement("span");
  text.textContent = message;
  toast.append(text);
  if (link) {
    const anchor = document.createElement("a");
    anchor.href = link;
    anchor.textContent = "查看 Issues";
    anchor.target = "_blank";
    anchor.rel = "noopener";
    toast.append(anchor);
  }
  document.body.append(toast);
  if (autoHideMs) setTimeout(() => toast.remove(), autoHideMs);
  return toast;
}
