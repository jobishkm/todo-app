// Each signed-in user has a separate task list in this browser's Local Storage.
const AUTH_SESSION_KEY = "simple-todo-current-user";
const currentUser = getCurrentUser();

if (!currentUser) {
  window.location.replace("auth.html");
}

const STORAGE_KEY = currentUser
  ? `simple-todo-tasks-${currentUser.id}`
  : "simple-todo-tasks";

// These variables hold the current state while the page is open.
let tasks = loadTasks();
let currentFilter = "today";

// Select the page elements once, then reuse them in the functions below.
const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskDescriptionInput = document.querySelector("#task-description");
const newTaskPanel = document.querySelector("#new-task-panel");
const openTaskFormButton = document.querySelector("#open-task-form");
const cancelTaskFormButton = document.querySelector("#cancel-task-form");
const formMessage = document.querySelector("#form-message");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const taskCount = document.querySelector("#task-count");
const tasksHeading = document.querySelector("#tasks-heading");
const signOutButton = document.querySelector("#sign-out-button");
const filterButtons = document.querySelectorAll(".filter-button");
const upcomingCalendarButton = document.querySelector("#upcoming-calendar-button");
const upcomingCalendarDialog = document.querySelector("#upcoming-calendar-dialog");
const upcomingCalendarCloseButton = document.querySelector("#upcoming-calendar-close");
const upcomingCalendarPreviousButton = document.querySelector("#upcoming-calendar-previous");
const upcomingCalendarNextButton = document.querySelector("#upcoming-calendar-next");
const upcomingCalendarMonth = document.querySelector("#upcoming-calendar-month");
const upcomingCalendarDays = document.querySelector("#upcoming-calendar-days");
const upcomingCalendarMessage = document.querySelector("#upcoming-calendar-message");
const taskTemplate = document.querySelector("#task-template");
const taskPicker = getStaticPicker("task");
const scheduleDialog = document.querySelector("#schedule-dialog");
const scheduleDialogForm = document.querySelector("#schedule-dialog-form");
const calendarPreviousButton = document.querySelector("#calendar-previous");
const calendarNextButton = document.querySelector("#calendar-next");
const calendarMonth = document.querySelector("#calendar-month");
const calendarDays = document.querySelector("#calendar-days");
const selectedCalendarDate = document.querySelector("#selected-calendar-date");
const dialogStartTime = document.querySelector("#dialog-start-time");
const dialogEndTime = document.querySelector("#dialog-end-time");
const dialogMessage = document.querySelector("#dialog-message");
const scheduleCancelButtons = document.querySelectorAll("#schedule-cancel, #schedule-cancel-secondary");
const deleteToast = document.querySelector("#delete-toast");
const undoDeleteButton = document.querySelector("#undo-delete");
const closeDeleteToastButton = document.querySelector("#close-delete-toast");
let pickerBeingEdited = null;
let deletedTaskRecord = null;
let deleteToastTimer = null;
let calendarSelectedDate = new Date();
let calendarViewDate = new Date();
let upcomingCalendarSelectedDate = new Date();
let upcomingCalendarViewDate = new Date();
const calendarMonthOpenStates = new Map();

taskForm.addEventListener("submit", addTask);
taskInput.addEventListener("input", () => autoResizeTextarea(taskInput));
taskDescriptionInput.addEventListener("input", () => autoResizeTextarea(taskDescriptionInput));
// If the panel is hidden, the floating button should open it (and vice versa).
openTaskFormButton.addEventListener("click", () => setTaskFormVisibility(newTaskPanel.hidden));
cancelTaskFormButton.addEventListener("click", cancelTaskForm);
signOutButton.addEventListener("click", signOut);
filterButtons.forEach((button) => button.addEventListener("click", changeFilter));
upcomingCalendarButton.addEventListener("click", openUpcomingCalendar);
upcomingCalendarCloseButton.addEventListener("click", () => upcomingCalendarDialog.close());
upcomingCalendarPreviousButton.addEventListener("click", () => changeUpcomingCalendarMonth(-1));
upcomingCalendarNextButton.addEventListener("click", () => changeUpcomingCalendarMonth(1));
upcomingCalendarDays.addEventListener("click", goToUpcomingTaskDate);
taskList.addEventListener("click", toggleCalendarMonth);
setupPicker(taskPicker);
resetPicker(taskPicker);
autoResizeTextarea(taskInput);
autoResizeTextarea(taskDescriptionInput);
populateTimeOptions();
scheduleDialogForm.addEventListener("submit", applyScheduleSelection);
scheduleCancelButtons.forEach((button) => button.addEventListener("click", () => scheduleDialog.close()));
calendarPreviousButton.addEventListener("click", () => changeCalendarMonth(-1));
calendarNextButton.addEventListener("click", () => changeCalendarMonth(1));
calendarDays.addEventListener("click", selectCalendarDate);
dialogStartTime.addEventListener("change", updateTimeOptionAvailability);
dialogEndTime.addEventListener("change", updateTimeOptionAvailability);
scheduleDialog.addEventListener("close", () => {
  pickerBeingEdited = null;
});
undoDeleteButton.addEventListener("click", undoDelete);
closeDeleteToastButton.addEventListener("click", dismissDeleteToast);

// Draw the saved tasks as soon as the page is ready.
renderTasks();

// Time-based checkbox colours should update even while the page stays open.
// A minute is precise enough because the picker offers 15-minute time blocks.
window.setInterval(renderTasks, 60 * 1000);

function loadTasks() {
  // Local Storage only stores text, so we convert the saved JSON text back into an array.
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    const savedTaskList = savedTasks ? JSON.parse(savedTasks) : [];

    // Older saved tasks do not have an archived value yet, so give them one here.
    return Array.isArray(savedTaskList)
      ? savedTaskList.map((task) => ({ ...task, archived: Boolean(task.archived) }))
      : [];
  } catch (error) {
    // If saved data is damaged, show an empty list instead of stopping the app.
    console.error("Could not read saved tasks:", error);
    return [];
  }
}

function getCurrentUser() {
  try {
    const savedSession = localStorage.getItem(AUTH_SESSION_KEY);
    return savedSession ? JSON.parse(savedSession) : null;
  } catch (error) {
    return null;
  }
}

function signOut() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  window.location.replace("auth.html");
}

function saveTasks() {
  // JSON.stringify turns the array of task objects into text Local Storage can save.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function addTask(event) {
  event.preventDefault(); // Stops the form from reloading the page.
  const title = taskInput.value.trim();
  const description = taskDescriptionInput.value.trim();
  const scheduledAt = getPickerDateTime(taskPicker);
  const scheduledEndAt = getPickerEndDateTime(taskPicker);
  const scheduledDate = toDateInput(taskPicker.date.value);

  if (!title) {
    formMessage.textContent = "Please enter a task before adding it.";
    taskInput.focus();
    return;
  }

  if (hasScheduleConflict(scheduledAt, scheduledEndAt)) {
    openNativePicker(taskPicker);
    dialogMessage.textContent = "This time overlaps with an existing task.";
    return;
  }

  const newTask = {
    id: createId(),
    title,
    description,
    completed: false,
    archived: false,
    createdAt: new Date().toISOString(),
    // Every task starts with Today's date; the modal adds an optional time.
    scheduledDate,
    scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
    scheduledEndAt: scheduledEndAt ? scheduledEndAt.toISOString() : null,
  };

  tasks.unshift(newTask); // New tasks appear at the top of the list.
  saveTasks();
  renderTasks();
  taskForm.reset();
  resetPicker(taskPicker);
  autoResizeTextarea(taskInput);
  autoResizeTextarea(taskDescriptionInput);
  formMessage.textContent = "";
  setTaskFormVisibility(false);
}

function createId() {
  // Modern browsers provide randomUUID. The fallback supports older browsers too.
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setTaskFormVisibility(shouldShow) {
  newTaskPanel.hidden = !shouldShow;
  openTaskFormButton.setAttribute("aria-expanded", String(shouldShow));

  if (shouldShow) {
    newTaskPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    taskInput.focus();
  } else {
    openTaskFormButton.focus();
  }
}

function cancelTaskForm() {
  taskForm.reset();
  resetPicker(taskPicker);
  autoResizeTextarea(taskInput);
  autoResizeTextarea(taskDescriptionInput);
  formMessage.textContent = "";
  setTaskFormVisibility(false);
}

function autoResizeTextarea(textarea) {
  // Reset first, then grow to the full height of the entered text.
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function changeFilter(event) {
  currentFilter = event.currentTarget.dataset.filter;

  if (currentFilter === "calendar") {
    calendarMonthOpenStates.set(getCalendarMonthKey(new Date()), true);
  }

  filterButtons.forEach((button) => {
    const isSelected = button.dataset.filter === currentFilter;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  renderTasks();

  if (currentFilter === "calendar") {
    // Calendar opens at Today; older and future date groups remain available by scrolling.
    window.requestAnimationFrame(() => scrollToCalendarDate(toDateInput(new Date()), false));
  }
}

function getVisibleTasks() {
  const activeTasks = tasks.filter((task) => !task.archived);
  const today = toDateInput(new Date());
  let visibleTasks;

  if (currentFilter === "today") {
    visibleTasks = activeTasks.filter((task) => getTaskScheduledDate(task) === today);
  } else if (currentFilter === "calendar") {
    visibleTasks = activeTasks;
  } else if (currentFilter === "overdue") {
    // Finished tasks are not overdue, even when their scheduled day has passed.
    visibleTasks = activeTasks.filter(
      (task) => !task.completed && getTaskScheduledDate(task) < today
    );
  } else if (currentFilter === "archived") {
    visibleTasks = tasks.filter((task) => task.archived);
  } else {
    visibleTasks = activeTasks;
  }

  return visibleTasks.sort((firstTask, secondTask) => {
    if (currentFilter === "calendar") {
      const dateDifference = getTaskScheduledDate(firstTask)
        .localeCompare(getTaskScheduledDate(secondTask));
      if (dateDifference !== 0) {
        return dateDifference;
      }
    }

    // Active tasks always come first, regardless of their scheduled time.
    const completionDifference = Number(firstTask.completed) - Number(secondTask.completed);
    if (completionDifference !== 0) {
      return completionDifference;
    }

    // Within each group, show the earliest scheduled task first.
    // Tasks without a schedule are placed after scheduled tasks.
    return getTaskScheduleTime(firstTask) - getTaskScheduleTime(secondTask);
  });
}

function getTaskScheduleTime(task) {
  const scheduledAt = task.scheduledAt || task.scheduledDate || task.startAt || task.createdAt;
  return scheduledAt ? new Date(scheduledAt).getTime() : Number.POSITIVE_INFINITY;
}

function getTaskScheduledDate(task) {
  const scheduledDate = task.scheduledDate || task.scheduledAt || task.startAt || task.createdAt;
  return scheduledDate ? toDateInput(scheduledDate) : "";
}

function isTaskOverdue(task) {
  if (task.completed || task.archived) {
    return false;
  }

  const now = new Date();
  const scheduledDate = getTaskScheduledDate(task);
  const today = toDateInput(now);

  if (scheduledDate < today) {
    return true;
  }

  if (scheduledDate !== today) {
    return false;
  }

  const startValue = task.scheduledAt || task.startAt;
  if (!startValue) {
    return false;
  }

  const startTime = new Date(startValue);
  const endValue = task.scheduledEndAt || task.endAt;
  // A task without an end time occupies a single 15-minute picker block.
  const endTime = endValue
    ? new Date(endValue)
    : new Date(startTime.getTime() + 15 * 60 * 1000);

  return now >= endTime;
}

function isTaskHappeningNow(task) {
  if (task.completed || task.archived) {
    return false;
  }

  const startValue = task.scheduledAt || task.startAt;
  if (!startValue) {
    return false;
  }

  const startTime = new Date(startValue);
  const endValue = task.scheduledEndAt || task.endAt;
  // A task with no end time stays highlighted for one 15-minute picker block.
  const endTime = endValue
    ? new Date(endValue)
    : new Date(startTime.getTime() + 15 * 60 * 1000);
  const now = new Date();

  return now >= startTime && now < endTime;
}

function hasScheduleConflict(startTime, endTime, taskIdToIgnore = null) {
  if (!startTime) {
    return false;
  }

  return tasks.some((task) => {
    if (task.id === taskIdToIgnore) {
      return false;
    }

    const existingStart = task.scheduledAt || task.startAt;
    const existingEnd = task.scheduledEndAt || task.endAt || existingStart;
    return existingStart && schedulesOverlap(
      startTime,
      endTime || startTime,
      new Date(existingStart),
      new Date(existingEnd)
    );
  });
}

function schedulesOverlap(startOne, endOne, startTwo, endTwo) {
  const firstIsSingleTime = startOne.getTime() === endOne.getTime();
  const secondIsSingleTime = startTwo.getTime() === endTwo.getTime();

  if (firstIsSingleTime && secondIsSingleTime) {
    return startOne.getTime() === startTwo.getTime();
  }

  if (firstIsSingleTime) {
    return startOne >= startTwo && startOne < endTwo;
  }

  if (secondIsSingleTime) {
    return startTwo >= startOne && startTwo < endOne;
  }

  // Adjacent blocks are allowed; only overlapping time ranges are blocked.
  return startOne < endTwo && endOne > startTwo;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  taskList.innerHTML = ""; // Clear the old list before drawing the updated one.

  if (currentFilter === "calendar") {
    renderCalendarTaskGroups(visibleTasks);
  } else {
    visibleTasks.forEach((task) => {
      const taskElement = createTaskElement(task);
      taskList.append(taskElement);
    });
  }

  updateSummary(visibleTasks.length);
}

function renderCalendarTaskGroups(calendarTasks) {
  const tasksByMonth = new Map();

  calendarTasks.forEach((task) => {
    const date = getTaskScheduledDate(task);
    const month = getCalendarMonthKey(date);
    const datesInMonth = tasksByMonth.get(month) || new Map();
    const tasksForDate = datesInMonth.get(date) || [];
    tasksForDate.push(task);
    datesInMonth.set(date, tasksForDate);
    tasksByMonth.set(month, datesInMonth);
  });

  tasksByMonth.forEach((datesInMonth, month) => {
    const monthGroup = document.createElement("li");
    const monthToggle = document.createElement("button");
    const monthTitle = document.createElement("span");
    const monthChevron = document.createElement("span");
    const monthTaskList = document.createElement("ul");
    const isOpen = isCalendarMonthOpen(month);

    monthGroup.className = "calendar-month-group";
    monthToggle.className = "calendar-month-toggle";
    monthToggle.type = "button";
    monthToggle.dataset.calendarMonthToggle = month;
    monthToggle.setAttribute("aria-expanded", String(isOpen));
    monthTitle.textContent = formatCalendarMonthTitle(month);
    monthChevron.className = "calendar-month-chevron";
    monthChevron.setAttribute("aria-hidden", "true");
    monthChevron.textContent = "⌄";
    monthTaskList.className = "calendar-month-task-list";
    monthTaskList.hidden = !isOpen;

    datesInMonth.forEach((tasksForDate, date) => {
      const dateGroup = document.createElement("li");
      const heading = document.createElement("h3");
      const groupList = document.createElement("ul");

      dateGroup.className = "calendar-date-group";
      dateGroup.dataset.calendarDate = date;
      heading.className = "calendar-date-heading";
      heading.textContent = formatCalendarGroupDate(date);
      groupList.className = "calendar-task-list";
      tasksForDate.forEach((task) => groupList.append(createTaskElement(task)));
      dateGroup.append(heading, groupList);
      monthTaskList.append(dateGroup);
    });

    monthToggle.append(monthTitle, monthChevron);
    monthGroup.append(monthToggle, monthTaskList);
    taskList.append(monthGroup);
  });
}

function createTaskElement(task) {
  // A template lets us define the list-item HTML once in index.html.
  const taskElement = taskTemplate.content.firstElementChild.cloneNode(true);
  const toggle = taskElement.querySelector(".task-toggle");
  const title = taskElement.querySelector(".task-title");
  const description = taskElement.querySelector(".task-description");
  const schedule = taskElement.querySelector(".task-schedule");
  const archiveButton = taskElement.querySelector(".archive-button");
  const editButton = taskElement.querySelector(".edit-button");
  const deleteButton = taskElement.querySelector(".delete-button");

  taskElement.classList.toggle("is-completed", task.completed);
  taskElement.classList.toggle("is-archived", task.archived);
  taskElement.classList.toggle("is-overdue", isTaskOverdue(task));
  taskElement.classList.toggle("is-current-time", isTaskHappeningNow(task));
  toggle.checked = task.completed;
  toggle.disabled = task.archived;
  toggle.id = `task-${task.id}`;
  toggle.setAttribute(
    "aria-label",
    task.archived
      ? `${task.title} is archived`
      : `Mark ${task.title} as ${task.completed ? "active" : "completed"}`
  );
  title.textContent = task.title; // textContent safely shows the user's text as plain text.
  description.hidden = !task.description;
  description.textContent = task.description || "";
  const scheduledAt = task.scheduledAt || task.startAt;
  const scheduledEndAt = task.scheduledEndAt || task.endAt;
  const scheduledDate = task.scheduledDate || scheduledAt || task.createdAt;
  const taskDateIsShownByView = currentFilter === "today" || currentFilter === "calendar";

  // Today and Calendar already make the date clear through their view and date headings.
  // Keep only the optional time in each card to avoid repeating that information.
  if (taskDateIsShownByView) {
    schedule.hidden = !scheduledAt;
    schedule.textContent = scheduledAt
      ? `${formatTime(scheduledAt)}${scheduledEndAt ? ` – ${formatTime(scheduledEndAt)}` : ""}`
      : "";
  } else {
    schedule.hidden = !scheduledDate;
    schedule.textContent = scheduledAt
      ? `${formatTime(scheduledAt)}${scheduledEndAt ? ` – ${formatTime(scheduledEndAt)}` : ""} · ${formatRelativePickerDate(scheduledAt)}`
      : scheduledDate ? formatRelativePickerDate(scheduledDate) : "";
  }

  toggle.addEventListener("change", () => toggleTask(task.id, taskElement));
  archiveButton.hidden = !task.completed || task.archived;
  archiveButton.addEventListener("click", () => archiveTask(task.id));
  if (task.archived) {
    editButton.setAttribute("aria-label", "Restore task");
    editButton.setAttribute("title", "Restore task");
    editButton.classList.add("restore-button");
    editButton.querySelector("svg").innerHTML = `
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    `;
    editButton.addEventListener("click", () => restoreTask(task.id));
  } else {
    editButton.addEventListener("click", () => startEditing(task.id, taskElement));
  }
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  return taskElement;
}

function toggleTask(taskId, taskElement) {
  tasks = tasks.map((task) =>
    task.id === taskId ? { ...task, completed: !task.completed } : task
  );
  saveTasks();

  // Let the checkbox and row animation play before redrawing the list.
  // This is especially noticeable when the selected filter will hide the task.
  taskElement.classList.toggle(
    "is-completed",
    tasks.find((task) => task.id === taskId).completed
  );
  taskElement.classList.add("is-responding");
  window.setTimeout(renderTasks, 220);
}

function startEditing(taskId, taskElement) {
  const task = tasks.find((item) => item.id === taskId);
  const editForm = document.createElement("form");
  const editInput = document.createElement("textarea");
  const editDescription = document.createElement("textarea");
  const taskEditPicker = createPicker(
    "Task date and time",
    task.scheduledAt || task.scheduledDate || task.startAt || task.createdAt,
    Boolean(task.scheduledAt || task.startAt),
    task.scheduledEndAt || task.endAt
  );
  taskEditPicker.taskId = taskId;
  const saveButton = document.createElement("button");
  const cancelButton = document.createElement("button");
  const deleteButton = document.createElement("button");
  const actions = document.createElement("div");
  const scheduleRow = document.createElement("div");

  editForm.className = "task-form edit-task-form";
  editInput.className = "task-title-input";
  editDescription.className = "task-description-input";
  editInput.value = task.title;
  editInput.maxLength = 200;
  editInput.rows = 1;
  editInput.setAttribute("aria-label", "Edit task title");
  editInput.addEventListener("input", () => autoResizeTextarea(editInput));
  editDescription.value = task.description || "";
  editDescription.maxLength = 500;
  editDescription.rows = 2;
  editDescription.setAttribute("aria-label", "Edit task description");
  editDescription.addEventListener("input", () => autoResizeTextarea(editDescription));
  saveButton.type = "submit";
  saveButton.className = "add-task-submit";
  saveButton.textContent = "Save";
  cancelButton.type = "button";
  cancelButton.className = "cancel-task-button";
  cancelButton.textContent = "Cancel";
  deleteButton.type = "button";
  deleteButton.className = "delete-task-button";
  deleteButton.textContent = "Delete";
  actions.className = "task-form-actions";
  scheduleRow.className = "schedule-inputs";

  taskEditPicker.fieldset.querySelector(".calendar-icon").className = "clock-icon";
  taskEditPicker.fieldset.querySelector("legend").className = "visually-hidden";
  actions.append(deleteButton, cancelButton, saveButton);
  scheduleRow.append(taskEditPicker.fieldset, actions);
  editForm.append(editInput, editDescription, scheduleRow);
  taskElement.replaceChildren(editForm);
  autoResizeTextarea(editInput);
  autoResizeTextarea(editDescription);
  editInput.focus();
  editInput.select();

  editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const newTitle = editInput.value.trim();
    const newDescription = editDescription.value.trim();
    const newScheduledAt = getPickerDateTime(taskEditPicker);
    const newScheduledEndAt = getPickerEndDateTime(taskEditPicker);
    const newScheduledDate = toDateInput(taskEditPicker.date.value);

    if (!newTitle) {
      editInput.setCustomValidity("A task title cannot be empty.");
      editInput.reportValidity();
      return;
    }

    if (hasScheduleConflict(newScheduledAt, newScheduledEndAt, taskId)) {
      openNativePicker(taskEditPicker);
      dialogMessage.textContent = "This time overlaps with an existing task.";
      return;
    }

    tasks = tasks.map((item) =>
      item.id === taskId
        ? {
            ...item,
            title: newTitle,
            description: newDescription,
            scheduledDate: newScheduledDate,
            scheduledAt: newScheduledAt ? newScheduledAt.toISOString() : null,
            scheduledEndAt: newScheduledEndAt ? newScheduledEndAt.toISOString() : null,
          }
        : item
    );
    saveTasks();
    renderTasks();
  });

  editInput.addEventListener("input", () => editInput.setCustomValidity(""));
  cancelButton.addEventListener("click", renderTasks);
  deleteButton.addEventListener("click", () => deleteTask(taskId));
}

function deleteTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  const deletedIndex = tasks.findIndex((item) => item.id === taskId);
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderTasks();
  showDeleteToast(task, deletedIndex);
}

function showDeleteToast(task, index) {
  // Only the most recently deleted task can be restored.
  deletedTaskRecord = { task, index };
  window.clearTimeout(deleteToastTimer);
  deleteToast.hidden = false;
  deleteToast.setAttribute("aria-hidden", "false");
  deleteToastTimer = window.setTimeout(dismissDeleteToast, 5_000);
}

function undoDelete() {
  if (!deletedTaskRecord) {
    return;
  }

  const { task, index } = deletedTaskRecord;
  tasks.splice(Math.min(index, tasks.length), 0, task);
  saveTasks();
  renderTasks();
  dismissDeleteToast();
}

function dismissDeleteToast() {
  window.clearTimeout(deleteToastTimer);
  deleteToastTimer = null;
  deleteToast.hidden = true;
  deleteToast.setAttribute("aria-hidden", "true");
  deletedTaskRecord = null;
}

function archiveTask(taskId) {
  // Only completed work can be moved to Archive.
  tasks = tasks.map((task) =>
    task.id === taskId && task.completed && !task.archived
      ? { ...task, archived: true, archivedAt: new Date().toISOString() }
      : task
  );
  saveTasks();
  renderTasks();
}

function restoreTask(taskId) {
  tasks = tasks.map((task) =>
    task.id === taskId ? { ...task, archived: false, archivedAt: null } : task
  );
  saveTasks();
  renderTasks();
}

function updateSummary(visibleTaskCount) {
  const activeTaskCount = tasks.filter((task) => !task.completed && !task.archived).length;
  const taskWord = activeTaskCount === 1 ? "task" : "tasks";
  taskCount.textContent = `${activeTaskCount} ${taskWord} remaining`;
  tasksHeading.textContent = "Your list";
  upcomingCalendarButton.hidden = currentFilter !== "calendar";
  upcomingCalendarButton.disabled = false;
  // The empty message changes slightly when a filter hides every task.
  emptyState.hidden = visibleTaskCount > 0;
  const hasVisibleTasks = tasks.some((task) => !task.archived);
  if (currentFilter === "today" && hasVisibleTasks) {
    emptyState.textContent = "Nothing is scheduled for today.";
  } else if (currentFilter === "calendar") {
    emptyState.textContent = "No scheduled tasks yet.";
  } else if (currentFilter === "overdue" && hasVisibleTasks) {
    emptyState.textContent = "No overdue tasks. You are all caught up!";
  } else if (currentFilter === "archived") {
    emptyState.textContent = "No archived tasks yet.";
  } else {
    emptyState.textContent = "No tasks yet. Add one above to get started.";
  }
}

function openUpcomingCalendar() {
  upcomingCalendarSelectedDate = startOfDay(new Date());
  upcomingCalendarViewDate = startOfDay(upcomingCalendarSelectedDate);
  upcomingCalendarMessage.textContent = "";
  renderUpcomingCalendar();
  upcomingCalendarDialog.showModal();
}

function changeUpcomingCalendarMonth(amount) {
  upcomingCalendarViewDate = new Date(
    upcomingCalendarViewDate.getFullYear(),
    upcomingCalendarViewDate.getMonth() + amount,
    1
  );
  renderUpcomingCalendar();
}

function renderUpcomingCalendar() {
  const year = upcomingCalendarViewDate.getFullYear();
  const month = upcomingCalendarViewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedDate = toDateInput(upcomingCalendarSelectedDate);
  const taskDates = new Set(
    tasks.filter((task) => !task.archived).map(getTaskScheduledDate)
  );

  upcomingCalendarMonth.textContent = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(upcomingCalendarViewDate);
  upcomingCalendarDays.replaceChildren();

  for (let blankDay = 0; blankDay < firstDayOfMonth; blankDay += 1) {
    const spacer = document.createElement("span");
    spacer.setAttribute("aria-hidden", "true");
    upcomingCalendarDays.append(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateValue = toDateInput(date);
    const hasTasks = taskDates.has(dateValue);
    const button = document.createElement("button");

    button.type = "button";
    button.className = "calendar-day upcoming-calendar-day";
    button.dataset.upcomingCalendarDate = dateValue;
    button.textContent = String(day);
    button.setAttribute("aria-label", `${new Intl.DateTimeFormat(undefined, {
      dateStyle: "full",
    }).format(date)}${hasTasks ? ", has tasks" : ""}`);
    button.classList.toggle("is-selected", dateValue === selectedDate);
    button.classList.toggle("has-tasks", hasTasks);
    upcomingCalendarDays.append(button);
  }
}

function goToUpcomingTaskDate(event) {
  const dateButton = event.target.closest("[data-upcoming-calendar-date]");
  if (!dateButton) {
    return;
  }

  upcomingCalendarSelectedDate = startOfDay(
    new Date(`${dateButton.dataset.upcomingCalendarDate}T00:00`)
  );
  calendarMonthOpenStates.set(
    getCalendarMonthKey(dateButton.dataset.upcomingCalendarDate),
    true
  );
  currentFilter = "calendar";
  updateFilterButtons();
  renderTasks();
  upcomingCalendarDialog.close();
  scrollToCalendarDate(dateButton.dataset.upcomingCalendarDate, true);
}

function updateFilterButtons() {
  // Keep the tab styling in sync when the calendar picker selects a date.
  filterButtons.forEach((button) => {
    const isSelected = button.dataset.filter === currentFilter;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function toggleCalendarMonth(event) {
  const monthToggle = event.target.closest("[data-calendar-month-toggle]");
  if (!monthToggle) {
    return;
  }

  const month = monthToggle.dataset.calendarMonthToggle;
  calendarMonthOpenStates.set(month, monthToggle.getAttribute("aria-expanded") !== "true");
  renderTasks();
}

function isCalendarMonthOpen(month) {
  if (!calendarMonthOpenStates.has(month)) {
    const currentMonth = getCalendarMonthKey(new Date());
    // Previous months are collapsed by default; the current and later months stay open.
    calendarMonthOpenStates.set(month, month >= currentMonth);
  }

  return calendarMonthOpenStates.get(month);
}

function getCalendarMonthKey(date) {
  return toDateInput(date).slice(0, 7);
}

function formatCalendarMonthTitle(month) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00`));
}

function scrollToCalendarDate(date, shouldAnimate) {
  const dateGroup = taskList.querySelector(`[data-calendar-date="${date}"]`);
  if (!dateGroup) {
    return;
  }

  dateGroup.scrollIntoView({
    behavior: shouldAnimate ? "smooth" : "auto",
    block: "start",
  });
}

function getStaticPicker(prefix) {
  return {
    date: document.querySelector(`#${prefix}-date`),
    endDate: document.querySelector(`#${prefix}-end-date`),
    dateText: document.querySelector(`#${prefix}-date-text`),
    field: document.querySelector(`#${prefix}-field`),
  };
}

function setupPicker(picker) {
  picker.field.addEventListener("click", () => openNativePicker(picker));
  picker.date.addEventListener("change", () => {
    // Keep Today until the browser's combined date-time picker is used.
    picker.date.dataset.wasSelected = "true";
    updatePickerSummary(picker);
  });
}

function resetPicker(picker) {
  // The input needs a date value for its picker, but the visible field still reads Today.
  picker.date.value = `${toDateInput(new Date())}T00:00`;
  picker.endDate.value = `${toDateInput(new Date())}T00:00`;
  picker.date.dataset.wasSelected = "false";
  picker.endDate.dataset.wasSelected = "false";
  updatePickerSummary(picker);
}

function openNativePicker(picker) {
  pickerBeingEdited = picker;
  dialogMessage.textContent = "";

  const savedDate = new Date(picker.date.value);
  const savedEndDate = new Date(picker.endDate.value);
  const dateToShow = Number.isNaN(savedDate.getTime()) ? new Date() : savedDate;
  const endDateToShow = Number.isNaN(savedEndDate.getTime()) ? dateToShow : savedEndDate;
  calendarSelectedDate = startOfDay(dateToShow);
  calendarViewDate = startOfDay(dateToShow);
  dialogStartTime.value = picker.date.dataset.wasSelected === "true"
    ? `${String(dateToShow.getHours()).padStart(2, "0")}:${String(dateToShow.getMinutes()).padStart(2, "0")}`
    : "";
  dialogEndTime.value = picker.endDate.dataset.wasSelected === "true"
    ? `${String(endDateToShow.getHours()).padStart(2, "0")}:${String(endDateToShow.getMinutes()).padStart(2, "0")}`
    : "";
  renderCalendar();
  updateTimeOptionAvailability();

  scheduleDialog.showModal();
  calendarDays.querySelector(".is-selected")?.focus();
}

function updatePickerSummary(picker) {
  const dateText = formatRelativePickerDate(picker.date.value);
  const endTimeText = getPickerEndDateTime(picker);
  picker.dateText.textContent = picker.date.dataset.wasSelected === "true"
    ? `${formatTime(picker.date.value)}${endTimeText ? ` – ${formatTime(endTimeText)}` : ""}, ${dateText}`
    : dateText;
}

function applyScheduleSelection(event) {
  event.preventDefault();

  if (!pickerBeingEdited) {
    return;
  }

  const hasStartTime = Boolean(dialogStartTime.value);
  const hasEndTime = Boolean(dialogEndTime.value);

  if (!hasStartTime && hasEndTime) {
    dialogMessage.textContent = "Choose a start time before adding an end time.";
    return;
  }

  const selectedDateTime = new Date(`${toDateInput(calendarSelectedDate)}T${dialogStartTime.value || "00:00"}`);
  const selectedEndDateTime = new Date(`${toDateInput(calendarSelectedDate)}T${dialogEndTime.value || "00:00"}`);

  // An end time is optional. Only compare the two values when one was chosen.
  if (hasStartTime && hasEndTime && selectedEndDateTime <= selectedDateTime) {
    dialogMessage.textContent = "End time must be after start time.";
    return;
  }

  pickerBeingEdited.date.value = toDateTimeLocal(selectedDateTime);
  pickerBeingEdited.endDate.value = toDateTimeLocal(selectedEndDateTime);
  pickerBeingEdited.date.dataset.wasSelected = String(hasStartTime);
  pickerBeingEdited.endDate.dataset.wasSelected = String(hasStartTime && hasEndTime);
  updatePickerSummary(pickerBeingEdited);
  scheduleDialog.close();
}

function populateTimeOptions() {
  [dialogStartTime, dialogEndTime].forEach((timeSelect) => {
    timeSelect.append(new Option(timeSelect === dialogStartTime ? "Start time" : "End time", ""));

    for (let minutesAfterMidnight = 0; minutesAfterMidnight < 24 * 60; minutesAfterMidnight += 15) {
      const hours = Math.floor(minutesAfterMidnight / 60);
      const minutes = minutesAfterMidnight % 60;
      const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      const displayHour = String(hours % 12 || 12).padStart(2, "0");
      const displayMinutes = String(minutes).padStart(2, "0");
      const period = hours < 12 ? "AM" : "PM";
      timeSelect.append(new Option(`${displayHour}:${displayMinutes} ${period}`, value));
    }
  });
}

function changeCalendarMonth(amount) {
  calendarViewDate = new Date(
    calendarViewDate.getFullYear(),
    calendarViewDate.getMonth() + amount,
    1
  );
  renderCalendar();
}

function selectCalendarDate(event) {
  const dateButton = event.target.closest("[data-calendar-date]");
  if (!dateButton) {
    return;
  }

  calendarSelectedDate = startOfDay(new Date(`${dateButton.dataset.calendarDate}T00:00`));
  renderCalendar();
}

function renderCalendar() {
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateInput(new Date());
  const selected = toDateInput(calendarSelectedDate);

  calendarMonth.textContent = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(calendarViewDate);
  selectedCalendarDate.textContent = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(calendarSelectedDate);
  calendarDays.replaceChildren();

  for (let blankDay = 0; blankDay < firstDayOfMonth; blankDay += 1) {
    const spacer = document.createElement("span");
    spacer.setAttribute("aria-hidden", "true");
    calendarDays.append(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateValue = toDateInput(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.dataset.calendarDate = dateValue;
    button.textContent = String(day);
    button.setAttribute("aria-label", new Intl.DateTimeFormat(undefined, {
      dateStyle: "full",
    }).format(date));
    button.setAttribute("aria-pressed", String(dateValue === selected));
    button.classList.toggle("is-selected", dateValue === selected);
    button.classList.toggle("is-today", dateValue === today);
    calendarDays.append(button);
  }

  updateTimeOptionAvailability();
}

function updateTimeOptionAvailability() {
  const taskIdToIgnore = pickerBeingEdited?.taskId || null;
  const selectedDate = toDateInput(calendarSelectedDate);

  Array.from(dialogStartTime.options).forEach((option) => {
    if (!option.value) {
      return;
    }

    const optionDateTime = new Date(`${selectedDate}T${option.value}`);
    option.disabled = hasScheduleConflict(optionDateTime, null, taskIdToIgnore);
  });

  if (dialogStartTime.selectedOptions[0]?.disabled) {
    dialogStartTime.value = "";
  }

  const hasStartTime = Boolean(dialogStartTime.value);
  const selectedStart = hasStartTime
    ? new Date(`${selectedDate}T${dialogStartTime.value}`)
    : null;
  dialogEndTime.disabled = !hasStartTime;

  Array.from(dialogEndTime.options).forEach((option) => {
    if (!option.value) {
      return;
    }

    const optionDateTime = new Date(`${selectedDate}T${option.value}`);
    option.disabled = !selectedStart
      || optionDateTime <= selectedStart
      || hasScheduleConflict(selectedStart, optionDateTime, taskIdToIgnore);
  });

  if (dialogEndTime.selectedOptions[0]?.disabled) {
    dialogEndTime.value = "";
  }
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getPickerDateTime(picker) {
  if (!picker.date.value || picker.date.dataset.wasSelected !== "true") {
    return null;
  }

  return new Date(picker.date.value);
}

function getPickerEndDateTime(picker) {
  if (!picker.endDate.value || picker.endDate.dataset.wasSelected !== "true") {
    return null;
  }

  return new Date(picker.endDate.value);
}

function createPicker(label, dateTime, hasTime = true, endDateTime = null) {
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  const picker = document.createElement("div");
  const field = document.createElement("button");
  const calendarIcon = document.createElement("span");
  const dateText = document.createElement("span");
  const date = document.createElement("input");
  const endDate = document.createElement("input");
  const parsedDate = new Date(dateTime);
  const parsedEndDate = new Date(endDateTime);
  const hasSavedDate = !Number.isNaN(parsedDate.getTime());
  const hasSavedEndDate = !Number.isNaN(parsedEndDate.getTime());
  const savedDate = hasSavedDate ? parsedDate : new Date();
  const savedEndDate = hasSavedEndDate ? parsedEndDate : savedDate;
  const pickerData = { date, endDate, dateText, fieldset, field };

  fieldset.className = "schedule-fieldset";
  legend.textContent = label;
  picker.className = "schedule-picker";
  field.className = "schedule-field";
  field.type = "button";
  calendarIcon.className = "calendar-icon";
  calendarIcon.setAttribute("aria-hidden", "true");
  date.type = "hidden";
  endDate.type = "hidden";
  date.value = toDateTimeLocal(savedDate);
  endDate.value = toDateTimeLocal(savedEndDate);
  date.dataset.wasSelected = String(hasSavedDate && hasTime);
  endDate.dataset.wasSelected = String(hasSavedEndDate && hasTime);

  field.append(dateText, calendarIcon);
  picker.append(field, date, endDate);
  fieldset.append(legend, picker);
  setupPicker(pickerData);
  updatePickerSummary(pickerData);

  return pickerData;
}

function toDateInput(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function toDateTimeLocal(dateString) {
  const date = new Date(dateString);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function formatTime(dateString) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateString));
}

function formatPickerDate(dateString) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatRelativePickerDate(dateString) {
  const selectedDate = toDateInput(dateString);
  const today = new Date();
  const tomorrow = new Date();
  const yesterday = new Date();
  tomorrow.setDate(today.getDate() + 1);
  yesterday.setDate(today.getDate() - 1);

  if (selectedDate === toDateInput(today)) {
    return "Today";
  }

  if (selectedDate === toDateInput(tomorrow)) {
    return "Tomorrow";
  }

  if (selectedDate === toDateInput(yesterday)) {
    return "Yesterday";
  }

  return formatPickerDate(dateString);
}

function formatCalendarGroupDate(dateString) {
  const date = new Date(`${dateString}T00:00`);
  const today = new Date();
  const tomorrow = new Date();
  const yesterday = new Date();
  tomorrow.setDate(today.getDate() + 1);
  yesterday.setDate(today.getDate() - 1);

  if (dateString === toDateInput(today)) {
    return "Today";
  }

  if (dateString === toDateInput(tomorrow)) {
    return "Tomorrow";
  }

  if (dateString === toDateInput(yesterday)) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
