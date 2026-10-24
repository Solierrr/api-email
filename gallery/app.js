const list = document.querySelector("#templates");
const localeSelect = document.querySelector("#locale");
const frame = document.querySelector("#email");
const subject = document.querySelector("#subject");
const identifier = document.querySelector("#template-id");
let templates = [];
let selected;

function showTemplate() {
  const params = new URLSearchParams(location.hash.slice(1));
  selected =
    templates.find((item) => item.id === params.get("template")) ??
    templates[0];
  if (!selected) throw new Error("No templates available");
  const locale = Object.hasOwn(selected.versions, params.get("locale"))
    ? params.get("locale")
    : "pt-BR";
  const version = selected.versions[locale];
  localeSelect.value = locale;
  subject.textContent = version.subject;
  identifier.textContent = selected.id;
  frame.src = `./emails/${encodeURIComponent(selected.id)}.${encodeURIComponent(locale)}.html`;
  frame.title = `${version.subject} — ${locale}`;
  for (const button of list.querySelectorAll("button")) {
    if (button.dataset.template === selected.id)
      button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  }
}

function navigate(template, locale) {
  location.hash = new URLSearchParams({ template, locale }).toString();
}

localeSelect.addEventListener(
  "change",
  () => selected && navigate(selected.id, localeSelect.value),
);
window.addEventListener("hashchange", () => {
  if (templates.length) showTemplate();
});
for (const button of document.querySelectorAll("[data-viewport]")) {
  button.addEventListener("click", () => {
    frame.classList.toggle("mobile", button.dataset.viewport === "mobile");
    for (const option of document.querySelectorAll("[data-viewport]")) {
      option.setAttribute("aria-pressed", String(option === button));
    }
  });
}

async function load() {
  try {
    const response = await fetch("./templates.json");
    if (!response.ok) throw new Error("Unable to load gallery");
    templates = await response.json();
    for (const template of templates) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = template.versions["pt-BR"].subject;
      button.dataset.template = template.id;
      button.addEventListener("click", () =>
        navigate(template.id, localeSelect.value),
      );
      list.append(button);
    }
    document.querySelector("#count").textContent = String(templates.length);
    showTemplate();
    localeSelect.disabled = false;
  } catch {
    document.querySelector("#error").hidden = false;
    subject.textContent = "Prévia indisponível";
  }
}

await load();
