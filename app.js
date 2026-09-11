const gallery = document.querySelector("#gallery");
const emptyState = document.querySelector("#empty-state");
const template = document.querySelector("#work-template");

function addWork(work) {
  const node = template.content.firstElementChild.cloneNode(true);
  const title = work.title || "未命名作品";
  const frame = node.querySelector("iframe");
  frame.src = work.source_url;
  frame.title = title;
  node.querySelector(".work-title").textContent = title;
  node.querySelector(".work-model").textContent = work.model_detail || work.model;
  gallery.append(node);
}

fetch("works.json")
  .then((response) => response.ok ? response.json() : Promise.reject(new Error("作品墙暂时无法加载。")))
  .then((works) => {
    works.forEach(addWork);
    emptyState.hidden = works.length > 0;
  })
  .catch(() => { emptyState.textContent = "作品墙暂时无法加载。"; emptyState.hidden = false; });
