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
const newSubtaskEditorMount = document.querySelector("#new-subtask-editor");
const newTaskPanel = document.querySelector("#new-task-panel");
const openTaskFormButton = document.querySelector("#open-task-form");
const cancelTaskFormButton = document.querySelector("#cancel-task-form");
const formMessage = document.querySelector("#form-message");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const emptyStateImage = document.querySelector("#empty-state-image");
const emptyStateTitle = document.querySelector("#empty-state-title");
const emptyStateDescription = document.querySelector("#empty-state-description");
const taskCount = document.querySelector("#task-count");
const tasksHeading = document.querySelector("#tasks-heading");
const todayFilterCount = document.querySelector("#today-filter-count");
const overdueFilterCount = document.querySelector("#overdue-filter-count");
const profileMenuButton = document.querySelector("#profile-menu-button");
const profileMenu = document.querySelector("#profile-menu");
const profileEmail = document.querySelector("#profile-email");
const profileAvatar = document.querySelector("#profile-avatar");
const profileSettingsButton = document.querySelector("#profile-settings-button");
const profileSignOutButton = document.querySelector("#profile-sign-out-button");
const mobileMoreButton = document.querySelector("#mobile-more-button");
const mobileMoreMenu = document.querySelector("#mobile-more-menu");
const mobileMoreBackdrop = document.querySelector("#mobile-more-backdrop");
const mobileArchiveButton = document.querySelector("#mobile-archive-button");
const mobileProfileEmail = document.querySelector("#mobile-profile-email");
const mobileProfileAvatar = document.querySelector("#mobile-profile-avatar");
const mobileSettingsButton = document.querySelector("#mobile-settings-button");
const mobileSignOutButton = document.querySelector("#mobile-sign-out-button");
const filterButtons = document.querySelectorAll(".filter-button[data-filter]");
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
const dialogRepeat = document.querySelector("#dialog-repeat");
const weeklyRepeatDays = document.querySelector("#weekly-repeat-days");
const weeklyRepeatDayInputs = document.querySelectorAll("#weekly-repeat-days input");
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
const newSubtaskEditor = createSubtaskEditor([], "Subtasks");

newSubtaskEditorMount.append(newSubtaskEditor.element);

taskForm.addEventListener("submit", addTask);
taskInput.addEventListener("input", () => autoResizeTextarea(taskInput));
taskDescriptionInput.addEventListener("input", () => autoResizeTextarea(taskDescriptionInput));
// If the panel is hidden, the floating button should open it (and vice versa).
openTaskFormButton.addEventListener("click", () => setTaskFormVisibility(newTaskPanel.hidden));
cancelTaskFormButton.addEventListener("click", cancelTaskForm);
profileMenuButton.addEventListener("click", toggleProfileMenu);
profileSignOutButton.addEventListener("click", signOut);
profileSettingsButton.addEventListener("click", closeProfileMenu);
mobileMoreButton.addEventListener("click", toggleMobileMoreMenu);
mobileMoreBackdrop.addEventListener("click", closeMobileMoreMenu);
mobileArchiveButton.addEventListener("click", () => {
  closeMobileMoreMenu();
  document.querySelector('[data-filter="archived"]')?.click();
});
mobileSettingsButton.addEventListener("click", closeMobileMoreMenu);
mobileSignOutButton.addEventListener("click", signOut);
document.addEventListener("click", closeProfileMenuWhenClickingAway);
document.addEventListener("keydown", closeProfileMenuOnEscape);
document.addEventListener("click", closeMobileMoreMenuWhenClickingAway);
document.addEventListener("keydown", closeMobileMoreMenuOnEscape);
document.addEventListener("click", closeTaskActionMenusWhenClickingAway);
document.addEventListener("keydown", closeTaskActionMenusOnEscape);
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
populateProfile();
scheduleDialogForm.addEventListener("submit", applyScheduleSelection);
scheduleCancelButtons.forEach((button) => button.addEventListener("click", () => scheduleDialog.close()));
calendarPreviousButton.addEventListener("click", () => changeCalendarMonth(-1));
calendarNextButton.addEventListener("click", () => changeCalendarMonth(1));
calendarDays.addEventListener("click", selectCalendarDate);
dialogStartTime.addEventListener("change", updateTimeOptionAvailability);
dialogEndTime.addEventListener("change", updateTimeOptionAvailability);
dialogRepeat.addEventListener("change", updateWeeklyRepeatDaysVisibility);
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

    // Older saved tasks might not have archive or subtask data yet, so give them defaults.
    return Array.isArray(savedTaskList)
      ? savedTaskList.map((task) => ({
          ...task,
          archived: Boolean(task.archived),
          recurrence: normalizeRecurrence(task.recurrence),
          repeatDays: normalizeRepeatDays(task.repeatDays),
          subtasks: normalizeSubtasks(task.subtasks),
        }))
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

function populateProfile() {
  const nameOrEmail = currentUser?.name || currentUser?.email || "User";
  const initial = nameOrEmail.trim().charAt(0).toUpperCase();
  const email = currentUser?.email || "";

  profileAvatar.textContent = initial;
  profileEmail.textContent = email;
  mobileProfileAvatar.textContent = initial;
  mobileProfileEmail.textContent = email;
}

function toggleProfileMenu() {
  const willOpen = profileMenu.hidden;
  profileMenu.hidden = !willOpen;
  profileMenuButton.setAttribute("aria-expanded", String(willOpen));
}

function closeProfileMenu() {
  profileMenu.hidden = true;
  profileMenuButton.setAttribute("aria-expanded", "false");
}

function closeProfileMenuWhenClickingAway(event) {
  if (!event.target.closest(".sidebar-profile")) {
    closeProfileMenu();
  }
}

function closeProfileMenuOnEscape(event) {
  if (event.key === "Escape") {
    closeProfileMenu();
    profileMenuButton.focus();
  }
}

function toggleMobileMoreMenu() {
  const willOpen = mobileMoreMenu.hidden;
  mobileMoreMenu.hidden = !willOpen;
  mobileMoreBackdrop.hidden = !willOpen;
  mobileMoreButton.setAttribute("aria-expanded", String(willOpen));
}

function closeMobileMoreMenu() {
  mobileMoreMenu.hidden = true;
  mobileMoreBackdrop.hidden = true;
  mobileMoreButton.setAttribute("aria-expanded", "false");
}

function closeMobileMoreMenuWhenClickingAway(event) {
  if (!event.target.closest(".mobile-more")) {
    closeMobileMoreMenu();
  }
}

function closeMobileMoreMenuOnEscape(event) {
  if (event.key === "Escape") {
    closeMobileMoreMenu();
    mobileMoreButton.focus();
  }
}

function toggleTaskActionMenu(button, menu) {
  const willOpen = menu.hidden;
  closeTaskActionMenus();
  menu.hidden = !willOpen;
  button.setAttribute("aria-expanded", String(willOpen));
}

function closeTaskActionMenus() {
  document.querySelectorAll(".task-action-menu:not([hidden])").forEach((menu) => {
    menu.hidden = true;
    menu.closest(".task-overflow")?.querySelector(".task-overflow-button")
      ?.setAttribute("aria-expanded", "false");
  });
}

function closeTaskActionMenusWhenClickingAway(event) {
  if (!event.target.closest(".task-overflow")) {
    closeTaskActionMenus();
  }
}

function closeTaskActionMenusOnEscape(event) {
  if (event.key === "Escape") {
    closeTaskActionMenus();
  }
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
    subtasks: newSubtaskEditor.getSubtasks(),
    completed: false,
    archived: false,
    createdAt: new Date().toISOString(),
    // Every task starts with Today's date; the modal adds an optional time.
    scheduledDate,
    scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
    scheduledEndAt: scheduledEndAt ? scheduledEndAt.toISOString() : null,
    recurrence: normalizeRecurrence(taskPicker.recurrence),
    repeatDays: normalizeRepeatDays(taskPicker.repeatDays),
  };

  tasks.unshift(newTask); // New tasks appear at the top of the list.
  saveTasks();
  renderTasks();
  taskForm.reset();
  newSubtaskEditor.clear();
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

function normalizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) {
    return [];
  }

  return subtasks
    .filter((subtask) => subtask && typeof subtask.title === "string" && subtask.title.trim())
    .map((subtask) => ({
      id: subtask.id || createId(),
      title: subtask.title.trim(),
      completed: Boolean(subtask.completed),
    }));
}

function normalizeRecurrence(recurrence) {
  return ["daily", "weekly", "monthly"].includes(recurrence) ? recurrence : "none";
}

function normalizeRepeatDays(repeatDays) {
  if (!Array.isArray(repeatDays)) {
    return [];
  }

  return [...new Set(repeatDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    .sort((firstDay, secondDay) => firstDay - secondDay);
}

function getSelectedRepeatDays() {
  return normalizeRepeatDays(
    Array.from(weeklyRepeatDayInputs)
      .filter((input) => input.checked)
      .map((input) => input.value)
  );
}

function setSelectedRepeatDays(repeatDays) {
  const selectedDays = normalizeRepeatDays(repeatDays);
  weeklyRepeatDayInputs.forEach((input) => {
    input.checked = selectedDays.includes(Number(input.value));
  });
}

function updateWeeklyRepeatDaysVisibility() {
  const isWeekly = dialogRepeat.value === "weekly";
  weeklyRepeatDays.hidden = !isWeekly;

  if (isWeekly && getSelectedRepeatDays().length === 0) {
    // Weekly tasks repeat every day by default. People can uncheck days to customise it.
    setSelectedRepeatDays([0, 1, 2, 3, 4, 5, 6]);
  }
}

function createSubtaskEditor(initialSubtasks, label) {
  let subtasks = normalizeSubtasks(initialSubtasks);
  let isExpanded = subtasks.length > 0;
  const editor = document.createElement("section");
  const editorLabel = document.createElement("p");
  const list = document.createElement("ul");
  const addRow = document.createElement("div");
  const checkboxPreview = document.createElement("span");
  const input = document.createElement("input");
  const addButton = document.createElement("button");

  editor.className = "subtask-editor";
  editor.setAttribute("aria-label", label);
  editorLabel.className = "subtask-editor-label";
  editorLabel.textContent = label;
  list.className = "subtask-editor-list";
  addRow.className = "subtask-add-row";
  checkboxPreview.className = "subtask-toggle subtask-toggle-preview";
  checkboxPreview.setAttribute("aria-hidden", "true");
  input.type = "text";
  input.maxLength = 200;
  input.placeholder = "Add a subtask";
  input.setAttribute("aria-label", "New subtask title");
  addButton.type = "button";
  addButton.className = "add-subtask-button";

  function render() {
    list.replaceChildren();
    editorLabel.hidden = !isExpanded;
    addRow.hidden = !isExpanded;
    list.hidden = !isExpanded || subtasks.length === 0;
    addButton.textContent = isExpanded ? "+ Add" : "+ Add Sub Tasks";

    if (isExpanded) {
      addRow.append(addButton);
    } else {
      editor.append(addButton);
    }

    subtasks.forEach((subtask) => {
      const item = document.createElement("li");
      const toggle = document.createElement("input");
      const titleInput = document.createElement("input");
      const removeButton = document.createElement("button");

      item.className = "subtask-editor-item";
      toggle.className = "subtask-toggle";
      toggle.type = "checkbox";
      toggle.checked = subtask.completed;
      toggle.setAttribute("aria-label", `Mark ${subtask.title} as ${subtask.completed ? "active" : "completed"}`);
      toggle.addEventListener("change", () => {
        subtasks = subtasks.map((itemSubtask) =>
          itemSubtask.id === subtask.id
            ? { ...itemSubtask, completed: !itemSubtask.completed }
            : itemSubtask
        );
      });
      titleInput.type = "text";
      titleInput.maxLength = 200;
      titleInput.value = subtask.title;
      titleInput.setAttribute("aria-label", "Subtask title");
      titleInput.addEventListener("input", () => {
        subtasks = subtasks.map((itemSubtask) =>
          itemSubtask.id === subtask.id
            ? { ...itemSubtask, title: titleInput.value.slice(0, 200) }
            : itemSubtask
        );
      });
      removeButton.type = "button";
      removeButton.className = "remove-subtask-button";
      removeButton.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      `;
      removeButton.setAttribute("aria-label", `Remove ${subtask.title}`);
      removeButton.addEventListener("click", () => {
        subtasks = subtasks.filter((itemSubtask) => itemSubtask.id !== subtask.id);
        render();
      });

      item.append(toggle, titleInput, removeButton);
      list.append(item);
    });
  }

  function revealSubtaskEditor() {
    isExpanded = true;
    render();
    input.focus();
  }

  function addSubtask() {
    if (!isExpanded) {
      revealSubtaskEditor();
      return;
    }

    const title = input.value.trim();
    if (!title) {
      input.focus();
      return;
    }

    subtasks = [...subtasks, { id: createId(), title, completed: false }];
    input.value = "";
    render();
    input.focus();
  }

  addButton.addEventListener("click", addSubtask);
  input.addEventListener("keydown", (event) => {
    if (isExpanded && event.key === "Enter") {
      event.preventDefault();
      addSubtask();
    }
  });
  addRow.append(checkboxPreview, input);
  editor.append(editorLabel, list, addRow, addButton);
  render();

  return {
    element: editor,
    getSubtasks: () => normalizeSubtasks(subtasks),
    clear: () => {
      subtasks = [];
      isExpanded = false;
      input.value = "";
      render();
    },
  };
}

function setTaskFormVisibility(shouldShow) {
  newTaskPanel.hidden = !shouldShow;
  openTaskFormButton.setAttribute("aria-expanded", String(shouldShow));

  if (shouldShow) {
    newTaskPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    // Keep the scroll position above; otherwise focus can place fields behind the sticky heading.
    taskInput.focus({ preventScroll: true });
  } else {
    openTaskFormButton.focus();
  }
}

function cancelTaskForm() {
  taskForm.reset();
  newSubtaskEditor.clear();
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
    monthChevron.textContent = isOpen ? "−" : "+";
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
  const repeatIcon = taskElement.querySelector(".task-repeat-icon");
  const subtasks = taskElement.querySelector(".task-subtasks");
  const subtaskProgress = taskElement.querySelector(".subtask-progress");
  const subtaskList = taskElement.querySelector(".subtask-list");
  const overflowButton = taskElement.querySelector(".task-overflow-button");
  const actionMenu = taskElement.querySelector(".task-action-menu");
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
  renderSubtasks(task, subtasks, subtaskProgress, subtaskList);
  const scheduledAt = task.scheduledAt || task.startAt;
  const scheduledEndAt = task.scheduledEndAt || task.endAt;
  const scheduledDate = task.scheduledDate || scheduledAt || task.createdAt;
  const taskDateIsShownByView = currentFilter === "today" || currentFilter === "calendar";
  const recurrence = normalizeRecurrence(task.recurrence);

  repeatIcon.hidden = recurrence === "none";
  repeatIcon.setAttribute(
    "aria-label",
    recurrence === "none" ? "" : `Repeats ${recurrence}`
  );

  // Every card keeps this row populated so its action buttons never appear alone.
  // A task without a time shows Today, or its calendar date when it is not today.
  const scheduleDateLabel = formatTaskScheduleDate(scheduledDate);
  if (taskDateIsShownByView) {
    schedule.hidden = false;
    schedule.textContent = scheduledAt
      ? `${formatTime(scheduledAt)}${scheduledEndAt ? ` – ${formatTime(scheduledEndAt)}` : ""}`
      : scheduleDateLabel;
  } else {
    schedule.hidden = false;
    schedule.textContent = scheduledAt
      ? `${formatTime(scheduledAt)}${scheduledEndAt ? ` – ${formatTime(scheduledEndAt)}` : ""} · ${formatRelativePickerDate(scheduledAt)}`
      : scheduleDateLabel;
  }

  schedule.setAttribute("aria-label", `Change schedule for ${task.title}`);
  schedule.disabled = task.archived;
  schedule.addEventListener("click", () => openTaskSchedulePicker(task));
  toggle.addEventListener("change", () => toggleTask(task.id, taskElement));
  overflowButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleTaskActionMenu(overflowButton, actionMenu);
  });
  actionMenu.addEventListener("click", (event) => event.stopPropagation());
  archiveButton.hidden = !task.completed || task.archived;
  archiveButton.addEventListener("click", () => archiveTask(task.id));
  if (task.archived) {
    editButton.setAttribute("aria-label", "Restore task");
    editButton.textContent = "Restore";
    editButton.classList.add("restore-button");
    editButton.addEventListener("click", () => restoreTask(task.id));
  } else {
    editButton.addEventListener("click", () => startEditing(task.id, taskElement));
  }
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  return taskElement;
}

function openTaskSchedulePicker(task) {
  const picker = createPicker(
    "Task date and time",
    task.scheduledAt || task.scheduledDate || task.startAt || task.createdAt,
    Boolean(task.scheduledAt || task.startAt),
    task.scheduledEndAt || task.endAt,
    task.recurrence,
    task.repeatDays
  );

  // This picker is used directly from a card, so Apply saves the schedule immediately.
  picker.taskId = task.id;
  picker.saveScheduleOnApply = true;
  openNativePicker(picker);
}

function toggleTask(taskId, taskElement) {
  const taskToToggle = tasks.find((task) => task.id === taskId);
  const willBeCompleted = !taskToToggle.completed;
  const nextRecurringTask = willBeCompleted ? createNextRecurringTask(taskToToggle) : null;

  tasks = tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          completed: willBeCompleted,
          generatedNextTaskId: nextRecurringTask?.id || null,
        }
      : task
  );

  if (nextRecurringTask) {
    tasks.push(nextRecurringTask);
  }

  if (!willBeCompleted && taskToToggle.generatedNextTaskId) {
    // Reopening a just-finished task removes its untouched next occurrence.
    tasks = tasks.filter(
      (task) =>
        task.id !== taskToToggle.generatedNextTaskId ||
        task.generatedFromTaskId !== taskId ||
        task.completed
    );
  }
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

function createNextRecurringTask(task) {
  const recurrence = normalizeRecurrence(task.recurrence);
  if (recurrence === "none") {
    return null;
  }

  const sourceDate = task.scheduledDate || task.scheduledAt || task.createdAt;
  const repeatDays = normalizeRepeatDays(task.repeatDays);
  const nextDate = toDateInput(
    advanceRecurrenceDate(
      new Date(`${toDateInput(sourceDate)}T00:00`),
      recurrence,
      repeatDays
    )
  );
  const nextScheduledAt = task.scheduledAt
    ? advanceRecurrenceDate(new Date(task.scheduledAt), recurrence, repeatDays)
    : null;
  const nextScheduledEndAt = task.scheduledEndAt
    ? advanceRecurrenceDate(new Date(task.scheduledEndAt), recurrence, repeatDays)
    : null;
  const recurrenceParentId = task.recurrenceParentId || task.id;

  const alreadyExists = tasks.some(
    (item) =>
      item.recurrenceParentId === recurrenceParentId &&
      getTaskScheduledDate(item) === nextDate
  );
  if (alreadyExists) {
    return null;
  }

  return {
    ...task,
    id: createId(),
    completed: false,
    archived: false,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    scheduledDate: nextDate,
    scheduledAt: nextScheduledAt ? nextScheduledAt.toISOString() : null,
    scheduledEndAt: nextScheduledEndAt ? nextScheduledEndAt.toISOString() : null,
    subtasks: normalizeSubtasks(task.subtasks).map((subtask) => ({
      ...subtask,
      completed: false,
    })),
    recurrence,
    repeatDays,
    recurrenceParentId,
    generatedFromTaskId: task.id,
    generatedNextTaskId: null,
  };
}

function advanceRecurrenceDate(date, recurrence, repeatDays = []) {
  const nextDate = new Date(date);

  if (recurrence === "daily") {
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (recurrence === "weekly") {
    const selectedDays = normalizeRepeatDays(repeatDays);
    if (selectedDays.length === 0) {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      for (let daysToAdd = 1; daysToAdd <= 7; daysToAdd += 1) {
        const candidateDate = new Date(nextDate);
        candidateDate.setDate(candidateDate.getDate() + daysToAdd);
        if (selectedDays.includes(candidateDate.getDay())) {
          return candidateDate;
        }
      }
    }
  } else if (recurrence === "monthly") {
    const day = nextDate.getDate();
    nextDate.setDate(1);
    nextDate.setMonth(nextDate.getMonth() + 1);
    const lastDayOfTargetMonth = new Date(
      nextDate.getFullYear(),
      nextDate.getMonth() + 1,
      0
    ).getDate();
    nextDate.setDate(Math.min(day, lastDayOfTargetMonth));
  }

  return nextDate;
}

function renderSubtasks(task, container, progress, list) {
  const subtasks = normalizeSubtasks(task.subtasks);
  container.hidden = subtasks.length === 0;
  list.replaceChildren();

  if (subtasks.length === 0) {
    return;
  }

  const completedCount = subtasks.filter((subtask) => subtask.completed).length;
  progress.textContent = `${completedCount} of ${subtasks.length} completed`;

  subtasks.forEach((subtask) => {
    const item = document.createElement("li");
    const toggle = document.createElement("input");
    const label = document.createElement("label");
    const toggleId = `task-${task.id}-subtask-${subtask.id}`;

    item.className = "subtask-item";
    item.classList.toggle("is-completed", subtask.completed);
    toggle.className = "subtask-toggle";
    toggle.type = "checkbox";
    toggle.id = toggleId;
    toggle.checked = subtask.completed;
    toggle.disabled = task.archived;
    toggle.setAttribute(
      "aria-label",
      `Mark ${subtask.title} as ${subtask.completed ? "active" : "completed"}`
    );
    label.htmlFor = toggleId;
    label.textContent = subtask.title;
    toggle.addEventListener("change", () => toggleSubtask(task.id, subtask.id));
    item.append(toggle, label);
    list.append(item);
  });
}

function toggleSubtask(taskId, subtaskId) {
  tasks = tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          subtasks: normalizeSubtasks(task.subtasks).map((subtask) =>
            subtask.id === subtaskId
              ? { ...subtask, completed: !subtask.completed }
              : subtask
          ),
        }
      : task
  );
  saveTasks();
  // Parent-task completion is intentionally never changed by a subtask.
  renderTasks();
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
    task.scheduledEndAt || task.endAt,
    task.recurrence,
    task.repeatDays
  );
  const editSubtaskEditor = createSubtaskEditor(task.subtasks, "Subtasks");
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
  editDescription.placeholder = "Task description";
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

  taskEditPicker.fieldset.querySelector("legend").className = "visually-hidden";
  actions.append(deleteButton, cancelButton, saveButton);
  scheduleRow.append(taskEditPicker.fieldset, actions);
  editForm.append(editInput, editDescription, editSubtaskEditor.element, scheduleRow);
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
            subtasks: editSubtaskEditor.getSubtasks(),
            scheduledDate: newScheduledDate,
            scheduledAt: newScheduledAt ? newScheduledAt.toISOString() : null,
            scheduledEndAt: newScheduledEndAt ? newScheduledEndAt.toISOString() : null,
            recurrence: normalizeRecurrence(taskEditPicker.recurrence),
            repeatDays: normalizeRepeatDays(taskEditPicker.repeatDays),
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
  const today = toDateInput(new Date());
  const todayTaskCount = tasks.filter(
    (task) => !task.archived && getTaskScheduledDate(task) === today
  ).length;
  const todayRemainingTaskCount = tasks.filter(
    (task) => !task.completed && !task.archived && getTaskScheduledDate(task) === today
  ).length;
  const overdueTaskCount = tasks.filter(
    (task) => !task.completed && !task.archived && getTaskScheduledDate(task) < today
  ).length;
  const pageTitles = {
    today: "Today",
    overdue: "Overdue",
    calendar: "Calendar",
    archived: "Archive",
  };
  const showsPageInformation = currentFilter === "today" || currentFilter === "overdue";
  const summaryCount = currentFilter === "overdue" ? overdueTaskCount : todayRemainingTaskCount;
  const taskWord = summaryCount === 1 ? "task" : "tasks";

  tasksHeading.textContent = pageTitles[currentFilter];
  taskCount.hidden = !showsPageInformation;
  taskCount.textContent = currentFilter === "overdue"
    ? `${summaryCount} overdue ${taskWord}`
    : `${summaryCount} ${taskWord} remaining`;
  todayFilterCount.textContent = todayTaskCount;
  overdueFilterCount.textContent = overdueTaskCount;
  upcomingCalendarButton.hidden = currentFilter !== "calendar";
  upcomingCalendarButton.disabled = false;
  emptyState.hidden = visibleTaskCount > 0;
  const emptyStateContent = {
    today: {
      image: "assets/calendar.jpg",
      title: "No tasks for today",
      description: "Add a task to plan your day.",
    },
    calendar: {
      image: "assets/calendar.jpg",
      title: "No scheduled tasks",
      description: "Schedule a task to see it in your calendar.",
    },
    overdue: {
      image: "assets/overdue.jpg",
      title: "You're all caught up",
      description: "Tasks that need attention will appear here.",
    },
    archived: {
      image: "assets/archive.jpg",
      title: "No archived tasks",
      description: "Completed tasks you archive will appear here.",
    },
  };
  const state = emptyStateContent[currentFilter];

  emptyStateImage.src = state.image;
  emptyStateTitle.textContent = state.title;
  emptyStateDescription.textContent = state.description;
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
    recurrence: "none",
    repeatDays: [],
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
  picker.recurrence = "none";
  picker.repeatDays = [];
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
  dialogRepeat.value = normalizeRecurrence(picker.recurrence);
  setSelectedRepeatDays(picker.repeatDays);
  updateWeeklyRepeatDaysVisibility();
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

  if (
    hasStartTime &&
    hasScheduleConflict(
      selectedDateTime,
      hasEndTime ? selectedEndDateTime : null,
      pickerBeingEdited.taskId || null
    )
  ) {
    dialogMessage.textContent = "This time overlaps with an existing task.";
    return;
  }

  const recurrence = normalizeRecurrence(dialogRepeat.value);
  const repeatDays = recurrence === "weekly" ? getSelectedRepeatDays() : [];

  if (recurrence === "weekly" && repeatDays.length === 0) {
    dialogMessage.textContent = "Choose at least one day for a weekly task.";
    return;
  }

  pickerBeingEdited.date.value = toDateTimeLocal(selectedDateTime);
  pickerBeingEdited.endDate.value = toDateTimeLocal(selectedEndDateTime);
  pickerBeingEdited.date.dataset.wasSelected = String(hasStartTime);
  pickerBeingEdited.endDate.dataset.wasSelected = String(hasStartTime && hasEndTime);
  pickerBeingEdited.recurrence = recurrence;
  pickerBeingEdited.repeatDays = repeatDays;
  updatePickerSummary(pickerBeingEdited);

  if (pickerBeingEdited.saveScheduleOnApply) {
    saveTaskScheduleFromPicker(pickerBeingEdited);
  }

  scheduleDialog.close();
}

function saveTaskScheduleFromPicker(picker) {
  const scheduledAt = getPickerDateTime(picker);
  const scheduledEndAt = getPickerEndDateTime(picker);
  const scheduledDate = toDateInput(picker.date.value);

  tasks = tasks.map((task) => (
    task.id === picker.taskId
      ? {
          ...task,
          scheduledDate,
          scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
          scheduledEndAt: scheduledEndAt ? scheduledEndAt.toISOString() : null,
          recurrence: normalizeRecurrence(picker.recurrence),
          repeatDays: normalizeRepeatDays(picker.repeatDays),
        }
      : task
  ));
  saveTasks();
  renderTasks();
}

function populateTimeOptions() {
  [dialogStartTime, dialogEndTime].forEach((timeSelect) => {
    timeSelect.append(new Option(timeSelect === dialogStartTime ? "Start time" : "End time", ""));

    // Scheduling options begin at 6:00 AM and continue in 15-minute intervals.
    for (let minutesAfterMidnight = 6 * 60; minutesAfterMidnight < 24 * 60; minutesAfterMidnight += 15) {
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

function createPicker(
  label,
  dateTime,
  hasTime = true,
  endDateTime = null,
  recurrence = "none",
  repeatDays = []
) {
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  const picker = document.createElement("div");
  const field = document.createElement("button");
  const calendarIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const dateText = document.createElement("span");
  const date = document.createElement("input");
  const endDate = document.createElement("input");
  const parsedDate = new Date(dateTime);
  const parsedEndDate = new Date(endDateTime);
  const hasSavedDate = !Number.isNaN(parsedDate.getTime());
  const hasSavedEndDate = !Number.isNaN(parsedEndDate.getTime());
  const savedDate = hasSavedDate ? parsedDate : new Date();
  const savedEndDate = hasSavedEndDate ? parsedEndDate : savedDate;
  const pickerData = {
    date,
    endDate,
    dateText,
    fieldset,
    field,
    recurrence: normalizeRecurrence(recurrence),
    repeatDays: normalizeRepeatDays(repeatDays),
  };

  fieldset.className = "schedule-fieldset";
  legend.textContent = label;
  picker.className = "schedule-picker";
  field.className = "schedule-field";
  field.type = "button";
  calendarIcon.setAttribute("class", "schedule-clock-icon");
  calendarIcon.setAttribute("viewBox", "0 0 24 24");
  calendarIcon.setAttribute("aria-hidden", "true");
  calendarIcon.innerHTML = `
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l3 2" />
  `;
  date.type = "hidden";
  endDate.type = "hidden";
  date.value = toDateTimeLocal(savedDate);
  endDate.value = toDateTimeLocal(savedEndDate);
  date.dataset.wasSelected = String(hasSavedDate && hasTime);
  endDate.dataset.wasSelected = String(hasSavedEndDate && hasTime);

  field.append(calendarIcon, dateText);
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

function formatTaskScheduleDate(dateString) {
  return toDateInput(dateString) === toDateInput(new Date())
    ? "Today"
    : formatPickerDate(dateString);
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
