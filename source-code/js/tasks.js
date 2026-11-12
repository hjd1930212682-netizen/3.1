/* StudyCourt task data stays in this browser. This is a course demo, not secure authentication. */
(() => {
  const STORAGE_KEY = 'studycourt.tasks.v1';
  const SESSION_KEY = 'studycourt.signed-in';
  const LOGIN = {username: 'student', password: 'Study2026!'};
  const $ = (selector) => document.querySelector(selector);
  const loginPanel = $('#login-panel');
  const planner = $('#planner');
  const form = $('#task-form');
  const fields = {
    title: $('#task-title'), code: $('#course-code'), course: $('#course-name'),
    due: $('#due-date'), description: $('#description'), notes: $('#notes')
  };
  let tasks = readTasks();

  function readTasks() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      // Ignore malformed storage entries instead of letting one bad record break the planner.
      return Array.isArray(saved) ? saved.filter(t => t && typeof t.id === 'string' && typeof t.title === 'string' && typeof t.due === 'string') : [];
    } catch { return []; }
  }
  function saveTasks() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); return true; }
    catch { setStatus('The browser could not save your tasks. Check storage settings or available space.'); return false; }
  }
  function setStatus(message) { $('#task-status').textContent = message; }
  function signedIn() { return sessionStorage.getItem(SESSION_KEY) === 'yes'; }
  function showAccess() {
    const allowed = signedIn();
    loginPanel.hidden = allowed;
    planner.hidden = !allowed;
    if (allowed) render();
  }
  $('#login-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#username').value.trim();
    const password = $('#password').value;
    const error = $('#login-error');
    if (!name || !password) { error.textContent = 'Enter both your username and password.'; error.hidden = false; return; }
    if (name !== LOGIN.username || password !== LOGIN.password) { error.textContent = 'The username or password does not match this demo account.'; error.hidden = false; return; }
    error.hidden = true;
    sessionStorage.setItem(SESSION_KEY, 'yes');
    $('#password').value = '';
    showAccess();
    fields.title.focus();
  });
  $('#logout-button').addEventListener('click', () => { sessionStorage.removeItem(SESSION_KEY); showAccess(); $('#username').focus(); });

  // A date is accepted only when parsing it and formatting it gives the same calendar day.
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
  }
  function setError(key, message) {
    const input = fields[key];
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    input.setAttribute('aria-describedby', message ? `${input.id}-error` : '');
    $(`#${input.id}-error`).textContent = message;
  }
  function validate() {
    const value = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value.trim()]));
    value.code = value.code.toUpperCase();
    const errors = {
      title: !value.title ? 'Enter a task title.' : value.title.length > 80 ? 'Use 80 characters or fewer.' : '',
      code: !value.code ? 'Enter a course code.' : !/^[A-Z0-9-]{2,12}$/.test(value.code) ? 'Use 2–12 letters, numbers or hyphens.' : '',
      course: !value.course ? 'Enter a course name.' : value.course.length > 80 ? 'Use 80 characters or fewer.' : '',
      due: !value.due ? 'Choose a due date.' : !validDate(value.due) ? 'Choose a real calendar date.' : '',
      description: !value.description ? 'Enter a short description.' : value.description.length > 500 ? 'Use 500 characters or fewer.' : '',
      notes: value.notes.length > 500 ? 'Use 500 characters or fewer.' : ''
    };
    Object.keys(errors).forEach(key => setError(key, errors[key]));
    const firstError = Object.keys(errors).find(key => errors[key]);
    if (firstError) { fields[firstError].focus(); return null; }
    return value;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = validate();
    if (!values) { setStatus('Please correct the highlighted fields.'); return; }
    const editingId = $('#editing-id').value;
    const task = {...values, id: editingId || (globalThis.crypto?.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(36).slice(2)}`)};
    const before = tasks.slice();
    if (editingId) tasks = tasks.map(item => item.id === editingId ? task : item);
    else tasks.push(task);
    if (!saveTasks()) { tasks = before; return; }
    resetForm();
    render();
    setStatus(editingId ? 'Task updated.' : 'Task added.');
  });
  function resetForm() {
    form.reset();
    $('#editing-id').value = '';
    $('#task-form-heading').textContent = 'Add a study task';
    $('#save-button').textContent = 'Add task';
    $('#cancel-edit').hidden = true;
    Object.keys(fields).forEach(key => setError(key, ''));
  }
  $('#cancel-edit').addEventListener('click', () => { resetForm(); setStatus('Edit cancelled.'); });
  $('#task-search').addEventListener('input', render);
  $('#task-filter').addEventListener('change', render);

  // Comparing local midnight dates avoids UTC date shifts near the user's timezone boundary.
  function dayOffset(due) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [year, month, day] = due.split('-').map(Number);
    return Math.round((new Date(year, month - 1, day) - today) / 86400000);
  }
  function formatDate(due) {
    const [year, month, day] = due.split('-').map(Number);
    return new Intl.DateTimeFormat('en-AU', {day:'numeric', month:'short', year:'numeric'}).format(new Date(year, month - 1, day));
  }
  function addText(parent, tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text; // User input is never inserted as HTML.
    parent.append(el);
    return el;
  }
  function render() {
    const list = $('#task-list');
    list.replaceChildren();
    $('#total-count').textContent = String(tasks.length);
    $('#upcoming-count').textContent = String(tasks.filter(t => validDate(t.due) && dayOffset(t.due) >= 0 && dayOffset(t.due) <= 7).length);
    $('#overdue-count').textContent = String(tasks.filter(t => validDate(t.due) && dayOffset(t.due) < 0).length);
    const query = $('#task-search').value.trim().toLowerCase();
    const filter = $('#task-filter').value;
    const visible = tasks.filter(t => {
      const matches = `${t.title} ${t.code || ''} ${t.course || ''}`.toLowerCase().includes(query);
      const offset = validDate(t.due) ? dayOffset(t.due) : Infinity;
      return matches && (filter === 'all' || (filter === 'upcoming' && offset >= 0) || (filter === 'overdue' && offset < 0));
    }).sort((a,b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
    if (!visible.length) {
      const empty = addText(list, 'div', 'empty-state', '');
      addText(empty, 'strong', '', tasks.length ? 'No matching tasks' : 'No tasks yet');
      addText(empty, 'span', '', tasks.length ? 'Try another search or filter.' : 'Use the form to add your first study task.');
      return;
    }
    visible.forEach(task => {
      const offset = validDate(task.due) ? dayOffset(task.due) : Infinity;
      const state = offset < 0 ? 'overdue' : offset <= 7 ? 'upcoming' : '';
      const card = addText(list, 'article', `task-card ${state}`, '');
      addText(card, 'div', 'course', `${task.code || ''} · ${task.course || ''}`);
      addText(card, 'h4', '', task.title);
      const meta = addText(card, 'div', 'task-meta', '');
      addText(meta, 'span', '', `Due ${validDate(task.due) ? formatDate(task.due) : 'unknown'}`);
      if (state) addText(meta, 'span', `task-badge ${state}`, state === 'overdue' ? 'Overdue' : offset === 0 ? 'Due today' : 'Due soon');
      addText(card, 'p', '', task.description || '');
      if (task.notes) addText(card, 'p', '', `Notes: ${task.notes}`);
      const actions = addText(card, 'div', 'task-actions', '');
      const edit = addText(actions, 'button', 'button button-outline', 'Edit');
      edit.type = 'button'; edit.setAttribute('aria-label', `Edit ${task.title}`);
      edit.addEventListener('click', () => editTask(task.id));
      const remove = addText(actions, 'button', 'button button-danger', 'Delete');
      remove.type = 'button'; remove.setAttribute('aria-label', `Delete ${task.title}`);
      remove.addEventListener('click', () => deleteTask(task.id));
    });
  }
  function editTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    Object.keys(fields).forEach(key => { fields[key].value = task[key] || ''; setError(key, ''); });
    $('#editing-id').value = id;
    $('#task-form-heading').textContent = 'Edit study task';
    $('#save-button').textContent = 'Save changes';
    $('#cancel-edit').hidden = false;
    form.scrollIntoView({behavior:'smooth', block:'start'});
    fields.title.focus();
    setStatus(`Editing ${task.title}.`);
  }
  function deleteTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task || !window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    const before = tasks.slice();
    tasks = tasks.filter(item => item.id !== id);
    if (!saveTasks()) { tasks = before; return; }
    if ($('#editing-id').value === id) resetForm();
    render();
    setStatus('Task deleted.');
  }
  showAccess();
})();
