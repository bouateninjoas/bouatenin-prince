"use strict";

const STORAGE_KEY = "todo-app.tasks.v1";
const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const taskTotal = document.querySelector("#task-total");
const progressCount = document.querySelector("#progress-count");
const progressTrack = document.querySelector("#progress-track");
const progressFill = document.querySelector("#progress-fill");
const clearCompletedButton = document.querySelector("#clear-completed");
const statusMessage = document.querySelector("#status-message");
const todayDate = document.querySelector("#today-date");
const filterButtons = document.querySelectorAll("[data-filter]");

let activeFilter = "all";
let storageAvailable = true;
let tasks = loadTasks();

todayDate.textContent = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long"
}).format(new Date());

function isTask(value) {
  return value !== null
    && typeof value === "object"
    && typeof value.id === "string"
    && typeof value.text === "string"
    && typeof value.completed === "boolean";
}

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (savedTasks === null) {
      return [];
    }

    const parsedTasks = JSON.parse(savedTasks);
    if (!Array.isArray(parsedTasks) || !parsedTasks.every(isTask)) {
      throw new Error("Les données enregistrées ne sont pas valides.");
    }
    return parsedTasks;
  } catch (error) {
    storageAvailable = false;
    statusMessage.textContent = error instanceof SyntaxError
      ? "Vos tâches enregistrées sont illisibles. Elles ne seront pas chargées."
      : `Impossible de lire vos tâches : ${error.message}`;
    return [];
  }
}

function saveTasks() {
  if (!storageAvailable) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    storageAvailable = false;
    statusMessage.textContent = `Impossible de sauvegarder vos tâches : ${error.message}`;
  }
}

function createIcon(path) {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("aria-hidden", "true");

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", path);
  line.setAttribute("stroke", "currentColor");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("stroke-linejoin", "round");
  icon.append(line);
  return icon;
}

function makeTaskRow(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " is-completed" : ""}`;
  item.dataset.taskId = task.id;

  const toggleButton = document.createElement("button");
  toggleButton.className = "task-check";
  toggleButton.type = "button";
  toggleButton.dataset.action = "toggle";
  toggleButton.setAttribute("aria-pressed", String(task.completed));
  toggleButton.setAttribute(
    "aria-label",
    task.completed ? `Marquer « ${task.text} » comme à faire` : `Terminer « ${task.text} »`
  );
  if (task.completed) {
    toggleButton.append(createIcon("m5 12 4 4L19 6"));
  }

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.setAttribute("aria-label", `Supprimer « ${task.text} »`);
  deleteButton.append(createIcon("M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"));

  item.append(toggleButton, text, deleteButton);
  return item;
}

function makeEmptyState() {
  const item = document.createElement("li");
  item.className = "empty-state";

  const icon = document.createElement("span");
  icon.className = "empty-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = activeFilter === "completed" ? "✦" : "✓";

  const title = document.createElement("p");
  const detail = document.createElement("span");
  if (activeFilter === "completed") {
    title.textContent = "Pas encore de tâche terminée";
    detail.textContent = "Les tâches accomplies apparaîtront ici.";
  } else if (activeFilter === "active") {
    title.textContent = "Tout est fait pour le moment";
    detail.textContent = "Profitez de cette petite pause.";
  } else {
    title.textContent = "Votre liste est encore vide";
    detail.textContent = "Ajoutez une tâche pour commencer en douceur.";
  }

  item.append(icon, title, detail);
  return item;
}

function render() {
  const visibleTasks = tasks.filter((task) => {
    if (activeFilter === "active") return !task.completed;
    if (activeFilter === "completed") return task.completed;
    return true;
  });
  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  taskList.replaceChildren();
  if (visibleTasks.length === 0) {
    taskList.append(makeEmptyState());
  } else {
    visibleTasks.forEach((task) => taskList.append(makeTaskRow(task)));
  }

  taskTotal.textContent = String(tasks.length);
  progressCount.textContent = `${completedCount} tâche${completedCount === 1 ? "" : "s"} terminée${completedCount === 1 ? "" : "s"}`;
  progressTrack.setAttribute("aria-valuenow", String(progress));
  progressFill.style.width = `${progress}%`;
  clearCompletedButton.disabled = completedCount === 0;
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    return;
  }

  tasks.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text,
    completed: false
  });
  saveTasks();
  render();
  taskForm.reset();
  taskInput.focus();
  if (storageAvailable) {
    statusMessage.textContent = "Tâche ajoutée.";
  }
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = button.closest("[data-task-id]");
  const task = tasks.find((entry) => entry.id === item.dataset.taskId);
  if (!task) return;

  if (button.dataset.action === "toggle") {
    task.completed = !task.completed;
    statusMessage.textContent = task.completed ? "Tâche terminée." : "Tâche remise à faire.";
  } else if (button.dataset.action === "delete") {
    tasks = tasks.filter((entry) => entry.id !== task.id);
    statusMessage.textContent = "Tâche supprimée.";
  } else {
    return;
  }

  saveTasks();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const selected = filterButton === button;
      filterButton.classList.toggle("is-active", selected);
      filterButton.setAttribute("aria-pressed", String(selected));
    });
    render();
  });
});

clearCompletedButton.addEventListener("click", () => {
  const completedCount = tasks.filter((task) => task.completed).length;
  if (completedCount === 0) return;

  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
  statusMessage.textContent = `${completedCount} tâche${completedCount === 1 ? "" : "s"} terminée${completedCount === 1 ? "" : "s"} effacée${completedCount === 1 ? "" : "s"}.`;
});

render();