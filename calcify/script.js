const $ = id => document.getElementById(id);

const display = $("display");
const expression = $("expression");
const preview = $("preview");
const historyList = $("historyList");

let current = "0";
let previous = null;
let operator = null;
let resetNext = false;
let completed = false;
let toastTimer;

function load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

let history = load("calcifyHistory", []);
if (!Array.isArray(history)) history = [];

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Calculator still works when storage is unavailable.
  }
}

function format(value) {
  if (!Number.isFinite(value)) return "Error";
  if (Object.is(value, -0)) return "0";
  return String(Number(value.toPrecision(12)));
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function calculate(a, b, op) {
  a = Number(a);
  b = Number(b);

  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? NaN : a / b;
    default: return NaN;
  }
}

function update() {
  display.textContent = current;

  if (operator !== null && previous !== null) {
    expression.textContent = previous + " " + operator;

    if (!resetNext) {
      preview.textContent =
        "= " + format(calculate(previous, current, operator));
    } else {
      preview.textContent = "";
    }
  } else {
    expression.textContent = "";
    preview.textContent = "";
  }
}

function inputNumber(value) {
  if (current === "Error") clearAll();

  if (completed && operator === null) {
    current = "0";
    completed = false;
  }

  if (resetNext) {
    current = "0";
    resetNext = false;
  }

  if (value === ".") {
    if (current.includes(".")) return;
    current += ".";
  } else {
    const digits = current.replace(/\D/g, "");
    if (digits.length >= 12) return;

    if (current === "0") {
      current = value;
    } else if (current === "-0") {
      current = "-" + value;
    } else {
      current += value;
    }
  }

  update();
}

function inputOperator(op) {
  if (current === "Error") return;

  if (operator !== null && !resetNext) {
    const result = format(calculate(previous, current, operator));

    if (result === "Error") {
      showToast("Invalid calculation");
      current = "Error";
      previous = null;
      operator = null;
      update();
      return;
    }

    current = result;
  }

  previous = current;
  operator = op;
  resetNext = true;
  completed = false;
  update();
}

function addHistory(exp, result) {
  if (result === "Error") return;

  history.unshift({ exp, result });
  history = history.slice(0, 30);

  save("calcifyHistory", history);
  renderHistory();
}

function equals() {
  if (operator === null || resetNext) return;

  const exp = `${previous} ${operator} ${current}`;
  const result = format(calculate(previous, current, operator));

  current = result;
  previous = null;
  operator = null;
  resetNext = false;
  completed = true;

  expression.textContent = exp + " =";
  display.textContent = result;
  preview.textContent = "";

  if (result === "Error") {
    showToast("Cannot divide by zero or calculate this result");
  } else {
    addHistory(exp, result);
  }
}

function clearAll() {
  current = "0";
  previous = null;
  operator = null;
  resetNext = false;
  completed = false;
  update();
}

function deleteLast() {
  if (current === "Error") {
    clearAll();
    return;
  }

  if (resetNext) {
    operator = null;
    previous = null;
    resetNext = false;
    update();
    return;
  }

  if (completed) {
    completed = false;
  }

  current = current.slice(0, -1);

  if (current === "" || current === "-") {
    current = "0";
  }

  update();
}

function percent() {
  if (current === "Error") return;

  if (resetNext) {
    current = "0";
    resetNext = false;
  }

  const original = current;
  let value = Number(current) / 100;

  // For addition/subtraction, percentage is relative
  // to the first operand.
  if (
    previous !== null &&
    (operator === "+" || operator === "−")
  ) {
    value = Number(previous) * Number(current) / 100;
  }

  current = format(value);
  completed = false;

  if (current === "Error") {
    showToast("Invalid percentage");
  }

  update();

  if (operator === null && current !== "Error") {
    expression.textContent = original + "%";
  }
}

function toggleSign() {
  if (current === "Error" || Number(current) === 0) return;

  if (resetNext) {
    current = "0";
    resetNext = false;
    return update();
  }

  current = current.startsWith("-")
    ? current.slice(1)
    : "-" + current;

  completed = false;
  update();
}

// SCIENTIFIC FUNCTIONS
// Trigonometric functions use degrees.

function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > 170) {
    return NaN;
  }

  let result = 1;

  for (let i = 2; i <= n; i++) {
    result *= i;
  }

  return result;
}

function scientific(fn) {
  if (current === "Error") return;

  if (resetNext) {
    current = "0";
    resetNext = false;
  }

  const x = Number(current);
  let result;
  let label = "";

  switch (fn) {
    case "sin":
      label = `sin(${current}°)`;
      result = Math.sin(x * Math.PI / 180);
      break;

    case "cos":
      label = `cos(${current}°)`;
      result = Math.cos(x * Math.PI / 180);
      break;

    case "tan":
      label = `tan(${current}°)`;
      result = Math.abs(Math.cos(x * Math.PI / 180)) < 1e-12
        ? NaN
        : Math.tan(x * Math.PI / 180);
      break;

    case "sqrt":
      label = `√(${current})`;
      result = Math.sqrt(x);
      break;

    case "square":
      label = `(${current})²`;
      result = x ** 2;
      break;

    case "inverse":
      label = `1/(${current})`;
      result = x === 0 ? NaN : 1 / x;
      break;

    case "log":
      label = `log(${current})`;
      result = Math.log10(x);
      break;

    case "ln":
      label = `ln(${current})`;
      result = Math.log(x);
      break;

    case "pi":
      label = "π";
      result = Math.PI;
      break;

    case "e":
      label = "e";
      result = Math.E;
      break;

    case "abs":
      label = `abs(${current})`;
      result = Math.abs(x);
      break;

    case "factorial":
      label = `(${current})!`;
      result = factorial(x);
      break;

    default:
      return;
  }

  const answer = format(result);

  if (answer === "Error") {
    showToast("Invalid mathematical operation");
    return;
  }

  current = answer;
  completed = false;

  // Preserve an unfinished binary operation.
  const pending = operator !== null && previous !== null;

  update();

  if (!pending) {
    expression.textContent = label + " =";
    completed = true;
    addHistory(label, answer);
  }
}

// HISTORY

function renderHistory() {
  historyList.replaceChildren();

  if (history.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-history";

    const symbol = document.createElement("span");
    symbol.textContent = "◷";

    const title = document.createElement("p");
    title.textContent = "No calculations yet";

    const subtitle = document.createElement("small");
    subtitle.textContent = "Your calculations will appear here.";

    empty.append(symbol, title, subtitle);
    historyList.appendChild(empty);
    return;
  }

  history.forEach(item => {
    const button = document.createElement("button");
    button.className = "history-item";
    button.title = "Reuse this result";

    const exp = document.createElement("span");
    exp.className = "history-exp";
    exp.textContent = item.exp;

    const result = document.createElement("span");
    result.className = "history-result";
    result.textContent = "= " + item.result;

    button.append(exp, result);

    button.addEventListener("click", () => {
      current = item.result;
      previous = null;
      operator = null;
      resetNext = false;
      completed = true;
      update();
      showToast("Result restored");
    });

    historyList.appendChild(button);
  });
}

$("clearHistory").addEventListener("click", () => {
  history = [];
  save("calcifyHistory", history);
  renderHistory();
  showToast("History cleared");
});

// THEMES

const savedTheme = load("calcifyTheme", "dark");

function setTheme(theme) {
  const isLight = theme === "light";

  document.body.classList.toggle("light", isLight);
  $("themeBtn").textContent = isLight ? "☾" : "☀";
  $("themeBtn").setAttribute(
    "aria-label",
    isLight ? "Switch to dark mode" : "Switch to light mode"
  );

  save("calcifyTheme", theme);
}

setTheme(savedTheme);

$("themeBtn").addEventListener("click", () => {
  setTheme(
    document.body.classList.contains("light")
      ? "dark"
      : "light"
  );
});

// STANDARD / SCIENTIFIC MODE

document.querySelectorAll(".mode").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".mode").forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    const isScientific = button.dataset.mode === "scientific";

    $("scientificKeys").hidden = !isScientific;
    $("modeLabel").textContent =
      isScientific ? "SCIENTIFIC · DEG" : "STANDARD";
  });
});

// HISTORY PANEL

$("historyBtn").addEventListener("click", () => {
  $("historyPanel").classList.toggle("open");
});

// COPY RESULT

$("copyBtn").addEventListener("click", async () => {
  if (current === "Error") return;

  try {
    await navigator.clipboard.writeText(current);
    showToast("Copied to clipboard!");
  } catch {
    showToast("Clipboard unavailable. Use HTTPS or localhost.");
  }
});

// BUTTON EVENTS

document.querySelectorAll("[data-num]").forEach(button => {
  button.addEventListener("click", () => {
    inputNumber(button.dataset.num);
  });
});

document.querySelectorAll("[data-op]").forEach(button => {
  button.addEventListener("click", () => {
    inputOperator(button.dataset.op);
  });
});

document.querySelectorAll("[data-fn]").forEach(button => {
  button.addEventListener("click", () => {
    scientific(button.dataset.fn);
  });
});

const actions = {
  clear: clearAll,
  delete: deleteLast,
  percent: percent,
  sign: toggleSign,
  equals: equals
};

document.querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", () => {
    actions[button.dataset.action]?.();
  });
});

// KEYBOARD SUPPORT

document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const key = event.key;

  if (/^[0-9.]$/.test(key)) {
    inputNumber(key);
    return;
  }

  const operators = {
    "+": "+",
    "-": "−",
    "*": "×",
    "/": "÷"
  };

  if (operators[key]) {
    event.preventDefault();
    inputOperator(operators[key]);
    return;
  }

  switch (key) {
    case "Enter":
    case "=":
      event.preventDefault();
      equals();
      break;

    case "Backspace":
      event.preventDefault();
      deleteLast();
      break;

    case "Escape":
      clearAll();
      break;

    case "%":
      percent();
      break;
  }
});

// INITIALIZE

renderHistory();
update();