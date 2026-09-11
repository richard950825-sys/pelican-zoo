import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.PELICAN_ZOO_CONFIG ?? {};
const configured = config.supabaseUrl && config.supabaseAnonKey;
const client = configured ? createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
const gallery = document.querySelector("#gallery");
const emptyState = document.querySelector("#empty-state");
const notice = document.querySelector("#notice");
const dialog = document.querySelector("#upload-dialog");
const form = document.querySelector("#upload-form");
const model = document.querySelector("#model");
const otherModelField = document.querySelector("#other-model-field");
const template = document.querySelector("#work-template");

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = !message;
}

function labelFor(work) {
  return work.model === "Other" && work.model_detail ? work.model_detail : work.model;
}

function sourceFor(work) {
  if (work.source_url) return work.source_url;
  return client.storage.from("works").getPublicUrl(work.html_path).data.publicUrl;
}

function addWork(work, first = false) {
  const node = template.content.firstElementChild.cloneNode(true);
  const title = work.title || "未命名作品";
  const frame = node.querySelector("iframe");
  frame.src = sourceFor(work);
  frame.title = title;
  node.querySelector(".work-title").textContent = title;
  node.querySelector(".work-model").textContent = labelFor(work);
  if (first) gallery.prepend(node); else gallery.append(node);
}

function renderWorks(works) {
  gallery.replaceChildren();
  works.forEach((work) => addWork(work));
  emptyState.hidden = works.length > 0;
}

async function loadWorks() {
  if (!configured) {
    const response = await fetch("works.json");
    renderWorks(await response.json());
    showNotice("展示站已上线。填入 Supabase 配置后可开放上传。");
    return;
  }

  const { data, error } = await client
    .from("works")
    .select("id, title, model, model_detail, html_path, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;
  renderWorks(data);
}

async function currentUser() {
  const { data: sessionData } = await client.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user;
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

function setSubmitting(submitting) {
  const button = document.querySelector("#publish");
  button.disabled = submitting;
  button.textContent = submitting ? "发布中…" : "发布";
}

document.querySelector("#open-upload").addEventListener("click", () => {
  if (!configured) {
    showNotice("上传尚未配置。请先在 config.js 填入 Supabase 的公开 URL 和 anon key。");
    return;
  }
  dialog.showModal();
});

document.querySelector("#close-upload").addEventListener("click", () => dialog.close());
model.addEventListener("change", () => { otherModelField.hidden = model.value !== "Other"; });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = document.querySelector("#html-file").files[0];
  const titleInput = document.querySelector("#title");
  const detail = document.querySelector("#model-detail").value.trim();
  if (!file || !file.name.toLowerCase().endsWith(".html") || file.size > 5 * 1024 * 1024) {
    showNotice("请选择一个不超过 5 MB 的 .html 文件。");
    return;
  }
  if (model.value === "Other" && !detail) {
    showNotice("请填写模型名称。");
    return;
  }

  setSubmitting(true);
  let path;
  try {
    const user = await currentUser();
    path = `${user.id}/${crypto.randomUUID()}.html`;
    const { error: uploadError } = await client.storage.from("works").upload(path, file, {
      contentType: "text/html",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const title = titleInput.value.trim() || file.name.replace(/\.html$/i, "");
    const { data, error } = await client
      .from("works")
      .insert({ owner_id: user.id, title, model: model.value, model_detail: detail || null, html_path: path })
      .select("id, title, model, model_detail, html_path, created_at")
      .single();
    if (error) throw error;

    addWork(data, true);
    emptyState.hidden = true;
    form.reset();
    otherModelField.hidden = true;
    dialog.close();
    showNotice("");
  } catch (error) {
    if (path) await client.storage.from("works").remove([path]);
    showNotice(error.message || "上传失败，请重试。");
  } finally {
    setSubmitting(false);
  }
});

loadWorks().catch((error) => showNotice(error.message || "作品墙暂时无法加载。"));
