const API_BASE = "http://localhost:5000/api/links";


const form = document.getElementById("link-form");
const nameInput = document.getElementById("name");
const urlInput = document.getElementById("url");
const tableBody = document.getElementById("links-table-body");
const saveBtn = document.getElementById("save-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

let editingId = null;

// Load links on page load
window.addEventListener("DOMContentLoaded", fetchLinks);

async function fetchLinks() {
  const res = await fetch(API_BASE);
  const links = await res.json();
  renderLinks(links);
}

function renderLinks(links) {
  tableBody.innerHTML = "";
  links.forEach((link) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${link.name}</td>
      <td><a href="${link.url}" target="_blank" class="url-link">${link.url}</a></td>
      <td><button class="action-btn copy-btn" data-id="${link._id}">📋</button></td>
      <td><button class="action-btn edit-btn" data-id="${link._id}">✏️</button></td>
      <td><button class="action-btn delete-btn" data-id="${link._id}">🗑️</button></td>
    `;

    tableBody.appendChild(tr);
  });
}

// Handle create/update
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    name: nameInput.value.trim(),
    url: urlInput.value.trim(),
  };

  if (!payload.name || !payload.url) return;

  if (editingId) {
    // update
    await fetch(`${API_BASE}/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } else {
    // create
    await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  editingId = null;
  saveBtn.textContent = "Save Link";
  cancelEditBtn.classList.add("hidden");
  form.reset();
  fetchLinks();
});

// Handle table buttons (copy, edit, delete) using event delegation
tableBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.getAttribute("data-id");

  if (btn.classList.contains("copy-btn")) {
    handleCopy(id);
  } else if (btn.classList.contains("edit-btn")) {
    startEdit(id);
  } else if (btn.classList.contains("delete-btn")) {
    await deleteLink(id);
  }
});

async function handleCopy(id) {
  const res = await fetch(API_BASE);
  const links = await res.json();
  const link = links.find((l) => l._id === id);
  if (!link) return;

  try {
    await navigator.clipboard.writeText(link.url);
  } catch {
    alert("Clipboard permission blocked in this browser.");
  }
}

async function startEdit(id) {
  const res = await fetch(API_BASE);
  const links = await res.json();
  const link = links.find((l) => l._id === id);
  if (!link) return;

  editingId = id;
  nameInput.value = link.name;
  urlInput.value = link.url;
  saveBtn.textContent = "Update Link";
  cancelEditBtn.classList.remove("hidden");
}

async function deleteLink(id) {
  const ok = confirm("Delete this link?");
  if (!ok) return;

  await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  });
  fetchLinks();
}

cancelEditBtn.addEventListener("click", () => {
  editingId = null;
  form.reset();
  saveBtn.textContent = "Save Link";
  cancelEditBtn.classList.add("hidden");
});
