/* All task data comes from the REST API. Only UI preferences persist locally. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const statuses = {
    TODO: "Cần làm",
    IN_PROGRESS: "Đang làm",
    COMPLETED: "Hoàn thành",
  };
  const priorities = { LOW: "Thấp", MEDIUM: "Trung bình", HIGH: "Cao" };
  const priorityRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const safeRead = (storage, key) => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };
  const safeWrite = (storage, key, value) => {
    try {
      value === null ? storage.removeItem(key) : storage.setItem(key, value);
    } catch {
      /* Storage is optional. */
    }
  };
  let token = safeRead(sessionStorage, "token") || "";
  let user;
  try {
    user = JSON.parse(safeRead(sessionStorage, "currentUser"));
  } catch {
    user = null;
  }
  if (!user || typeof user !== "object" || !user.username) {
    token = "";
    user = null;
  }
  let tasks = [],
    loaded = false,
    loading = false,
    loadError = "",
    generation = 0;
  let editingId = null,
    detailId = null,
    deleteId = null,
    saving = false,
    urgentOnly = false;
  let view = safeRead(localStorage, "stm-view") === "board" ? "board" : "list";
  let page = "overview",
    toastTimer;
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const localDay = (date = new Date()) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  const isDate = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
    !Number.isNaN(new Date(value + "T12:00:00").getTime());
  const overdue = (task) =>
    task.status !== "COMPLETED" &&
    isDate(task.dueDate) &&
    task.dueDate < localDay();
  const dueText = (value) =>
    isDate(value)
      ? new Intl.DateTimeFormat("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(value + "T12:00:00"))
      : "Chưa đặt hạn";
  const needsAttention = (task) =>
    task.status !== "COMPLETED" && (overdue(task) || task.priority === "HIGH");
  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLocaleLowerCase("vi");
  function toast(message, error = false) {
    clearTimeout(toastTimer);
    $("toast-message").textContent = message;
    $("toast").classList.toggle("error", error);
    $("toast").hidden = false;
    toastTimer = setTimeout(() => {
      $("toast").hidden = true;
    }, 5000);
  }
  function inlineError(id, message = "") {
    $(id).textContent = message;
    $(id).hidden = !message;
  }
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $("theme-toggle").setAttribute(
      "aria-label",
      theme === "dark"
        ? "Chuyển sang giao diện sáng"
        : "Chuyển sang giao diện tối",
    );
    $("theme-toggle").title = $("theme-toggle").getAttribute("aria-label");
  }
  setTheme(
    safeRead(localStorage, "stm-theme") ||
      "light",
  );
  $("theme-toggle").addEventListener("click", () => {
    const theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(theme);
    safeWrite(localStorage, "stm-theme", theme);
  });
  $("toast-close").addEventListener("click", () => {
    $("toast").hidden = true;
  });
  $("show-password").addEventListener("click", () => {
    const show = $("login-password").type === "password";
    $("login-password").type = show ? "text" : "password";
    $("show-password").textContent = show ? "Ẩn" : "Hiện";
    $("show-password").setAttribute("aria-pressed", String(show));
    $("show-password").setAttribute(
      "aria-label",
      show ? "Ẩn mật khẩu" : "Hiện mật khẩu",
    );
  });
  function endSession() {
    token = "";
    user = null;
    generation++;
    tasks = [];
    loaded = false;
    loading = false;
    loadError = "";
    safeWrite(sessionStorage, "token", null);
    safeWrite(sessionStorage, "currentUser", null);
    document
      .querySelectorAll("dialog[open]")
      .forEach((dialog) => dialog.close());
    $("app-shell").hidden = true;
    $("auth-section").hidden = false;
    $("tasks-list").replaceChildren();
    $("login-username").focus();
  }
  async function api(url, options = {}) {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
        signal: AbortSignal.timeout(12000),
      });
    } catch (error) {
      throw new Error(
        error.name === "TimeoutError"
          ? "Kết nối mất quá nhiều thời gian. Vui lòng thử lại."
          : "Không thể kết nối máy chủ. Kiểm tra kết nối và thử lại.",
      );
    }
    const result = await response.json().catch(() => null);
    if (response.status === 401 && url !== "/api/login") {
      endSession();
      toast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", true);
      throw new Error("Vui lòng đăng nhập lại.");
    }
    if (!response.ok || !result || result.success === false) {
      if (url === "/api/login" && response.status === 401)
        throw new Error("Tên đăng nhập hoặc mật khẩu chưa đúng.");
      throw new Error(
        result?.message || "Chưa thể hoàn tất yêu cầu. Vui lòng thử lại.",
      );
    }
    return result;
  }
  function showWorkspace() {
    $("auth-section").hidden = true;
    $("app-shell").hidden = false;
    $("user-name").textContent = user.fullName || user.username;
    $("user-email").textContent = user.email || "Sinh viên";
    $("user-avatar").textContent = (user.fullName || user.username)
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    $("today-label").textContent = new Intl.DateTimeFormat("vi-VN", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
    route();
    fetchTasks();
  }
  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    inlineError("login-error");
    const username = $("login-username").value.trim(),
      password = $("login-password").value;
    if (!username || !password) {
      inlineError("login-error", "Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }
    const button = $("btn-login-submit");
    button.disabled = true;
    button.textContent = "Đang đăng nhập…";
    try {
      const result = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      token = result.data.token;
      user = result.data.user;
      generation++;
      safeWrite(sessionStorage, "token", token);
      safeWrite(sessionStorage, "currentUser", JSON.stringify(user));
      showWorkspace();
      $("main").focus();
    } catch (error) {
      inlineError("login-error", error.message);
    } finally {
      button.disabled = false;
      button.innerHTML =
        'Vào không gian học tập <span aria-hidden="true">↗</span>';
    }
  });
  $("btn-logout").addEventListener("click", () => {
    endSession();
    toast("Bạn đã đăng xuất. Hẹn gặp lại!");
  });
  function route() {
    const requested = location.hash.slice(1);
    page = ["overview", "tasks", "completed"].includes(requested)
      ? requested
      : "overview";
    const content = {
      overview: [
        "Tổng quan",
        "MỘT NGÀY MỚI, MỘT BƯỚC TIẾN",
        "Việc học, trong tầm tay.",
        "Nhìn lại tiến độ và chọn điều bạn muốn hoàn thành tiếp theo.",
      ],
      tasks: [
        "Nhiệm vụ",
        "LÊN KẾ HOẠCH. TẬP TRUNG. HOÀN THÀNH.",
        "Một nơi cho mọi nhiệm vụ.",
        "Sắp xếp bài tập và giữ những việc quan trọng trong tầm mắt.",
      ],
      completed: [
        "Đã hoàn thành",
        "MỖI NỖ LỰC ĐỀU XỨNG ĐÁNG",
        "Những việc bạn đã làm được.",
        "Nhìn lại các mục tiêu đã hoàn thành và tiếp tục tiến về phía trước.",
      ],
    }[page];
    ["breadcrumb", "page-eyebrow", "page-title", "page-description"].forEach(
      (id, i) => {
        $(id).textContent = content[i];
      },
    );
    $("insights").hidden = page !== "overview";
    $("filter-status").disabled = page === "completed";
    $("tasks-heading").textContent =
      page === "completed" ? "Nhiệm vụ đã hoàn thành" : "Nhiệm vụ của bạn";
    document.title = `${content[0]} · StudyFlow`;
    document.querySelectorAll("[data-page]").forEach((link) => {
      if (link.dataset.page === page) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    renderTasks();
  }
  function clearFilters() {
    $("task-search").value = "";
    $("filter-status").value = "";
    $("filter-priority").value = "";
    $("sort-tasks").value = "attention";
    urgentOnly = false;
  }
  document.querySelectorAll("[data-page]").forEach((link) =>
    link.addEventListener("click", () => {
      clearFilters();
      if (location.hash === link.hash) route();
    }),
  );
  window.addEventListener("hashchange", route);
  function jumpToTasks(status = "", urgent = false) {
    clearFilters();
    $("filter-status").value = status;
    urgentOnly = urgent;
    if (location.hash !== "#tasks") location.hash = "tasks";
    else route();
    $("tasks-heading").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  document
    .querySelectorAll("[data-stat]")
    .forEach((button) =>
      button.addEventListener("click", () => jumpToTasks(button.dataset.stat)),
    );
  $("view-urgent").addEventListener("click", () => jumpToTasks("", true));
  $("status-chart").addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (button) jumpToTasks(button.dataset.status);
  });
  async function fetchTasks() {
    if (!token || loading || saving) return;
    const currentGeneration = ++generation;
    loading = true;
    loadError = "";
    renderTasks();
    $("btn-refresh-tasks").disabled = true;
    try {
      const result = await api("/api/tasks");
      if (currentGeneration !== generation) return;
      tasks = Array.isArray(result.data) ? result.data : [];
      loaded = true;
      renderStats();
      $("sync-label").textContent =
        `Đồng bộ lúc ${new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
    } catch (error) {
      if (currentGeneration !== generation) return;
      loadError = error.message;
      $("sync-label").textContent = "Đồng bộ chưa thành công";
    } finally {
      if (currentGeneration === generation) {
        loading = false;
        $("btn-refresh-tasks").disabled = false;
        renderTasks();
      }
    }
  }
  $("btn-refresh-tasks").addEventListener("click", fetchTasks);
  $("retry-tasks").addEventListener("click", fetchTasks);
  function renderStats() {
    const counts = Object.fromEntries(
      Object.keys(statuses).map((status) => [
        status,
        tasks.filter((task) => task.status === status).length,
      ]),
    );
    $("stat-total").textContent = tasks.length;
    $("stat-todo").textContent = counts.TODO;
    $("stat-inprogress").textContent = counts.IN_PROGRESS;
    $("stat-completed").textContent = counts.COMPLETED;
    $("nav-count").textContent = tasks.filter(
      (task) => task.status !== "COMPLETED",
    ).length;
    const percent = tasks.length
      ? Math.round((counts.COMPLETED / tasks.length) * 100)
      : 0;
    $("completion-caption").textContent = tasks.length
      ? `${percent}% mục tiêu đã hoàn thành`
      : "Mỗi hành trình bắt đầu từ một việc";
    $("progress-percent").textContent = `${percent}%`;
    $("progress-ring").style.setProperty("--progress", `${percent}%`);
    $("progress-ring").setAttribute(
      "aria-label",
      `${counts.COMPLETED} trên ${tasks.length} nhiệm vụ đã hoàn thành, ${percent}%`,
    );
    $("status-chart").innerHTML = Object.entries(statuses)
      .map(([status, label]) => {
        const color = {
          TODO: "#a5b9b2",
          IN_PROGRESS: "#e7a269",
          COMPLETED: "#3e8a70",
        }[status];
        const width = tasks.length ? (counts[status] / tasks.length) * 100 : 0;
        return `<button class="chart-row" data-status="${status}" title="${escape(label)}: ${counts[status]} / ${tasks.length} nhiệm vụ (${Math.round(width)}%). Bấm để lọc."><span><i class="dot" style="background:${color}"></i>${label}<b>${counts[status]}</b></span><div class="chart-track"><span class="chart-fill" style="width:${width}%;background:${color}"></span></div></button>`;
      })
      .join("");
    const late = tasks.filter(overdue).length,
      high = tasks.filter(
        (task) => task.priority === "HIGH" && task.status !== "COMPLETED",
      ).length;
    const next = tasks
      .filter((task) => task.status !== "COMPLETED")
      .sort(compareAttention)[0];
    $("focus-content").innerHTML =
      `<div class="focus-numbers"><div class="focus-number"><strong>${late.toString().padStart(2, "0")}</strong><small>nhiệm vụ quá hạn</small></div><div class="focus-number"><strong>${high.toString().padStart(2, "0")}</strong><small>nhiệm vụ ưu tiên cao</small></div></div><p class="focus-caption">${next ? `Gợi ý tiếp theo: <strong>${escape(next.title)}</strong>` : "Bạn đã hoàn thành mọi nhiệm vụ. Sẵn sàng cho mục tiêu mới?"}</p>`;
  }
  function compareAttention(a, b) {
    return (
      Number(b.status !== "COMPLETED") - Number(a.status !== "COMPLETED") ||
      Number(overdue(b)) - Number(overdue(a)) ||
      (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1) ||
      compareDue(a, b)
    );
  }
  function compareDue(a, b) {
    return (
      (isDate(a.dueDate) ? a.dueDate : "9999").localeCompare(
        isDate(b.dueDate) ? b.dueDate : "9999",
      ) || a.id - b.id
    );
  }
  function filteredTasks() {
    const query = normalize($("task-search").value.trim()),
      status = page === "completed" ? "COMPLETED" : $("filter-status").value,
      priority = $("filter-priority").value;
    const list = tasks.filter(
      (task) =>
        (!status || task.status === status) &&
        (!priority || task.priority === priority) &&
        (!query ||
          normalize(
            `${task.title} ${task.description} ${task.course}`,
          ).includes(query)) &&
        (!urgentOnly || needsAttention(task)),
    );
    const sort = $("sort-tasks").value;
    return list.sort(
      sort === "due"
        ? compareDue
        : sort === "newest"
          ? (a, b) => b.id - a.id
          : sort === "title"
            ? (a, b) => a.title.localeCompare(b.title, "vi")
            : compareAttention,
    );
  }
  function statusTag(task) {
    return `<span class="status-tag status-${escape((task.status || "TODO").toLowerCase())}">${escape(statuses[task.status] || task.status)}</span>`;
  }
  function taskCard(task) {
    const complete = task.status === "COMPLETED",
      late = overdue(task);
    const nextLabel = complete
      ? "Mở lại"
      : task.status === "TODO"
        ? "Bắt đầu"
        : "Hoàn thành";
    return `<article class="task-row${complete ? " is-complete" : ""}" data-id="${Number(task.id)}"><button class="task-check${complete ? " is-complete" : ""}" data-action="advance" aria-label="${nextLabel} nhiệm vụ: ${escape(task.title)}" title="${nextLabel}">${complete ? "✓" : task.status === "IN_PROGRESS" ? "◔" : ""}</button><div class="task-main"><button class="task-name" data-action="detail">${escape(task.title)}</button><p class="task-description">${escape(task.description || "Chưa có mô tả.")}</p><div class="task-labels"><span class="course-tag">${escape(task.course || "Chưa có môn học")}</span><span class="priority-tag priority-${escape((task.priority || "MEDIUM").toLowerCase())}">Ưu tiên ${escape((priorities[task.priority] || "Trung bình").toLowerCase())}</span></div></div>${statusTag(task)}<div class="due-date${late ? " is-overdue" : ""}">${escape(dueText(task.dueDate))}<small>${late ? "Quá hạn" : complete ? "Đã hoàn thành" : task.dueDate === localDay() ? "Đến hạn hôm nay" : "Hạn hoàn thành"}</small></div><div class="task-actions"><button data-action="edit" aria-label="Sửa nhiệm vụ: ${escape(task.title)}">Sửa</button><button data-action="delete" aria-label="Xóa nhiệm vụ: ${escape(task.title)}">Xóa</button></div></article>`;
  }
  function renderTasks() {
    $("tasks-list").hidden = loading || Boolean(loadError);
    $("tasks-loading").hidden = !loading;
    $("tasks-error").hidden = !loadError || loading;
    $("tasks-error-message").textContent = loadError;
    $("tasks-empty").hidden = true;
    $("tasks-list").setAttribute("aria-busy", String(loading));
    $("btn-new-task").disabled =
      !loaded || loading || Boolean(loadError) || saving;
    const hasFilters = Boolean(
      $("task-search").value ||
      $("filter-status").value ||
      $("filter-priority").value ||
      urgentOnly,
    );
    $("clear-filters").hidden = !hasFilters;
    document
      .querySelectorAll("[data-view]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.view === view),
        ),
      );
    if (loading || loadError || !loaded) {
      $("result-count").textContent = loading
        ? "Đang đồng bộ nhiệm vụ…"
        : loadError
          ? "Không thể cập nhật dữ liệu"
          : "Đang tải dữ liệu…";
      return;
    }
    const list = filteredTasks();
    $("result-count").textContent =
      `${list.length} / ${tasks.length} nhiệm vụ${urgentOnly ? " · Đang lọc việc cần chú ý" : ""}`;
    $("tasks-list").classList.toggle("board", view === "board");
    if (!list.length) {
      $("tasks-list").replaceChildren();
      $("tasks-empty").hidden = false;
      const emptyAll = tasks.length === 0;
      $("empty-title").textContent = emptyAll
        ? "Một khởi đầu mới đang chờ bạn"
        : "Không có nhiệm vụ phù hợp";
      $("empty-description").textContent = emptyAll
        ? "Tạo nhiệm vụ đầu tiên và biến kế hoạch thành hành động."
        : page === "completed" && !hasFilters
          ? "Hoàn thành một nhiệm vụ để nhìn thấy thành quả tại đây."
          : "Thử đổi từ khóa hoặc xóa bộ lọc để xem thêm nhiệm vụ.";
      $("empty-action").textContent = emptyAll
        ? "Tạo nhiệm vụ đầu tiên"
        : hasFilters
          ? "Xóa bộ lọc"
          : "Xem tất cả nhiệm vụ";
      return;
    }
    $("tasks-list").innerHTML =
      view === "board"
        ? Object.entries(statuses)
            .filter(
              ([status]) => page !== "completed" || status === "COMPLETED",
            )
            .map(([status, label]) => {
              const group = list.filter((task) => task.status === status);
              return `<section class="board-column" aria-label="${label}"><h3 class="board-heading"><span class="dot ${status === "TODO" ? "todo" : status === "IN_PROGRESS" ? "progress" : "completed"}-dot"></span>${label}<b>${group.length}</b></h3>${group.length ? group.map(taskCard).join("") : '<p class="board-empty">Chưa có nhiệm vụ</p>'}</section>`;
            })
            .join("")
        : list.map(taskCard).join("");
  }
  ["task-search", "filter-status", "filter-priority", "sort-tasks"].forEach(
    (id) =>
      $(id).addEventListener(
        id === "task-search" ? "input" : "change",
        renderTasks,
      ),
  );
  $("clear-filters").addEventListener("click", () => {
    clearFilters();
    renderTasks();
  });
  $("empty-action").addEventListener("click", () => {
    if (!tasks.length) openTaskForm();
    else if (!$("clear-filters").hidden) {
      clearFilters();
      renderTasks();
    } else jumpToTasks();
  });
  document.querySelectorAll("[data-view]").forEach((button) =>
    button.addEventListener("click", () => {
      view = button.dataset.view;
      safeWrite(localStorage, "stm-view", view);
      renderTasks();
    }),
  );
  function openTaskForm(task = null) {
    if (saving || loading || !loaded) return;
    editingId = task?.id ?? null;
    $("task-form").reset();
    inlineError("task-form-error");
    $("task-due-date").min = localDay();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const defaults = {
      title: "",
      description: "",
      course: "SWT301",
      dueDate: localDay(nextWeek),
      priority: "MEDIUM",
      status: "TODO",
    };
    Object.keys(defaults).forEach((key) => {
      $("task-form").elements.namedItem(key).value =
        task?.[key] ?? defaults[key];
    });
    $("task-title").setCustomValidity("");
    $("task-dialog-title").textContent = task
      ? "Chỉnh sửa nhiệm vụ"
      : "Tạo nhiệm vụ";
    $("btn-save-task").textContent = task ? "Lưu thay đổi" : "Tạo nhiệm vụ";
    $("task-dialog").showModal();
    $("task-title").focus();
  }
  $("btn-new-task").addEventListener("click", () => openTaskForm());
  $("task-title").addEventListener("input", () =>
    $("task-title").setCustomValidity(""),
  );
  function lockDialog(dialog, locked) {
    dialog
      .querySelectorAll("button,input,select,textarea")
      .forEach((element) => {
        element.disabled = locked;
      });
    dialog.setAttribute("aria-busy", String(locked));
  }
  document.querySelectorAll("[data-close]").forEach((button) =>
    button.addEventListener("click", () => {
      if (!saving) $(button.dataset.close).close();
    }),
  );
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("cancel", (event) => {
      if (saving) event.preventDefault();
    });
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      if (
        !saving &&
        event.target === dialog &&
        (event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom)
      )
        dialog.close();
    });
  });
  $("task-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving) return;
    const payload = Object.fromEntries(new FormData($("task-form")));
    ["title", "description", "course"].forEach((key) => {
      payload[key] = payload[key].trim();
    });
    if (!payload.title) {
      $("task-title").setCustomValidity("Vui lòng nhập tên nhiệm vụ.");
      $("task-title").reportValidity();
      return;
    }
    if (payload.dueDate && payload.dueDate < localDay()) {
      inlineError("task-form-error", "Hạn hoàn thành phải là hôm nay hoặc một ngày trong tương lai.");
      $("task-due-date").focus();
      return;
    }
    inlineError("task-form-error");
    saving = true;
    const currentGeneration = generation;
    lockDialog($("task-dialog"), true);
    $("btn-save-task").textContent = "Đang lưu…";
    try {
      const result = await api(
        editingId === null ? "/api/tasks" : `/api/tasks/${editingId}`,
        {
          method: editingId === null ? "POST" : "PUT",
          body: JSON.stringify(payload),
        },
      );
      if (currentGeneration !== generation) return;
      if (editingId === null) {
        tasks.push(result.data);
        clearFilters();
        if (page === "completed") location.hash = "tasks";
      } else
        tasks = tasks.map((task) =>
          task.id === editingId ? result.data : task,
        );
      $("task-dialog").close();
      renderStats();
      toast(
        editingId === null
          ? "Đã tạo nhiệm vụ. Bắt đầu khi bạn sẵn sàng!"
          : "Đã lưu thay đổi nhiệm vụ.",
      );
    } catch (error) {
      inlineError("task-form-error", error.message);
    } finally {
      saving = false;
      lockDialog($("task-dialog"), false);
      $("btn-save-task").textContent =
        editingId === null ? "Tạo nhiệm vụ" : "Lưu thay đổi";
      renderTasks();
    }
  });
  function showDetail(task) {
    detailId = task.id;
    $("detail-content").innerHTML =
      `<h2 class="detail-title" id="detail-title">${escape(task.title)}</h2><p class="detail-description">${escape(task.description || "Nhiệm vụ chưa có mô tả.")}</p><dl class="detail-meta"><div><dt>Trạng thái</dt><dd>${statusTag(task)}</dd></div><div><dt>Ưu tiên</dt><dd>${escape(priorities[task.priority] || task.priority)}</dd></div><div><dt>Môn học</dt><dd>${escape(task.course || "Chưa có môn học")}</dd></div><div><dt>Hạn hoàn thành</dt><dd class="${overdue(task) ? "is-overdue" : ""}">${escape(dueText(task.dueDate))}${overdue(task) ? " · Quá hạn" : ""}</dd></div><div><dt>Ngày tạo</dt><dd>${escape(dueText((task.createdAt || "").slice(0, 10)))}</dd></div><div><dt>Mã nhiệm vụ</dt><dd>#${Number(task.id)}</dd></div></dl>`;
    $("detail-dialog").showModal();
  }
  $("detail-edit").addEventListener("click", () => {
    const task = tasks.find((item) => item.id === detailId);
    $("detail-dialog").close();
    if (task) openTaskForm(task);
  });
  $("tasks-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]"),
      row = button?.closest("[data-id]");
    if (!button || !row || saving || loading) return;
    const task = tasks.find((item) => item.id === Number(row.dataset.id));
    if (!task) return;
    if (button.dataset.action === "edit") {
      openTaskForm(task);
      return;
    }
    if (button.dataset.action === "delete") {
      deleteId = task.id;
      $("delete-description").textContent = task.title;
      inlineError("delete-error");
      $("delete-dialog").showModal();
      return;
    }
    if (button.dataset.action === "detail") {
      button.disabled = true;
      const currentGeneration = generation;
      try {
        const result = await api(`/api/tasks/${task.id}`);
        if (token && currentGeneration === generation) showDetail(result.data);
      } catch (error) {
        toast(error.message, true);
      } finally {
        button.disabled = false;
      }
      return;
    }
    if (button.dataset.action === "advance") {
      const status = {
        TODO: "IN_PROGRESS",
        IN_PROGRESS: "COMPLETED",
        COMPLETED: "TODO",
      }[task.status];
      saving = true;
      button.disabled = true;
      const currentGeneration = generation;
      try {
        const result = await api(`/api/tasks/${task.id}`, {
          method: "PUT",
          body: JSON.stringify({ status }),
        });
        if (currentGeneration !== generation) return;
        tasks = tasks.map((item) => (item.id === task.id ? result.data : item));
        renderStats();
        toast(`Đã chuyển nhiệm vụ sang “${statuses[status]}”.`);
      } catch (error) {
        toast(error.message, true);
      } finally {
        saving = false;
        renderTasks();
      }
    }
  });
  $("confirm-delete").addEventListener("click", async () => {
    if (saving) return;
    saving = true;
    const currentGeneration = generation;
    lockDialog($("delete-dialog"), true);
    $("confirm-delete").textContent = "Đang xóa…";
    inlineError("delete-error");
    try {
      await api(`/api/tasks/${deleteId}`, { method: "DELETE" });
      if (currentGeneration !== generation) return;
      tasks = tasks.filter((task) => task.id !== deleteId);
      $("delete-dialog").close();
      renderStats();
      toast("Đã xóa nhiệm vụ.");
    } catch (error) {
      inlineError("delete-error", error.message);
    } finally {
      saving = false;
      lockDialog($("delete-dialog"), false);
      $("confirm-delete").textContent = "Xóa nhiệm vụ";
      renderTasks();
    }
  });
  if (token && user) showWorkspace();
})();
