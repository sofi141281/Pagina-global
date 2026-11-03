"use strict";

// 1. Shared constants and criterion definitions.
const EPSILON = 1e-9;
const STORAGE_KEY = "decision-lab-english-v1";

const CRITERIA = {
  maximax: {
    name: "Maximax",
    direction: 1,
    description: "Choose the highest possible payoff."
  },

  maximin: {
    name: "Maximin",
    direction: 1,
    description: "Choose the highest worst-case payoff."
  },

  regret: {
    name: "Minimax Regret",
    direction: -1,
    description: "Choose the lowest maximum regret."
  },

  emv: {
    name: "EMV / Bayes",
    direction: 1,
    description: "Choose the highest probability-weighted payoff."
  }
};

// 2. Each payoff row belongs to one alternative.
// Columns represent states of nature.
const EXAMPLES = {
  coffee: {
    description:
      "A coffee shop chooses its capacity before demand is known. " +
      "Compare optimistic, cautious, and probability-based decisions.",

    unit: "thousand USD",

    alternatives: [
      "Kiosk",
      "Small shop",
      "Medium shop",
      "Large shop",
      "Mobile service"
    ],

    states: [
      "High demand",
      "Medium demand",
      "Low demand"
    ],

    probabilities: [0.30, 0.45, 0.25],

    payoffs: [
      [60, 45, 30],
      [95, 65, 10],
      [145, 75, -20],
      [210, 60, -80],
      [85, 70, 20]
    ],

    stages: [
      ["emv", 3],
      ["maximin", 2],
      ["regret", 1]
    ]
  },

  energy: {
    description:
      "Expansion offers growth but exposes losses. Deposit and Bonds " +
      "have identical payoffs: use this example to test ties at a " +
      "filtering cutoff.",

    unit: "million USD",

    alternatives: [
      "Expansion",
      "Deposit",
      "Solar",
      "Efficiency",
      "Bonds"
    ],

    states: [
      "Growth",
      "Stable",
      "Slump"
    ],

    probabilities: [0.20, 0.30, 0.50],

    payoffs: [
      [200, -100, -100],
      [30, 30, 30],
      [100, 60, -20],
      [90, 55, 0],
      [30, 30, 30]
    ],

    stages: [
      ["maximin", 3],
      ["regret", 2],
      ["emv", 1]
    ]
  },

  logistics: {
    description:
      "A delivery company compares six plans under three activity " +
      "levels. Change the order of the filters to explore different outcomes.",

    unit: "thousand USD",

    alternatives: [
      "Plan B1",
      "Plan B2",
      "Plan B3",
      "Plan B4",
      "Plan B5",
      "Plan B6"
    ],

    states: [
      "High activity",
      "Medium activity",
      "Low activity"
    ],

    probabilities: [0.50, 0.30, 0.20],

    payoffs: [
      [95, 70, 30],
      [90, 75, 40],
      [110, 60, 10],
      [85, 80, 55],
      [100, 65, 35],
      [92, 78, 20]
    ],

    stages: [
      ["emv", 4],
      ["maximin", 2],
      ["regret", 1]
    ]
  },

  blank: {
    description:
      "Build your own problem. Add alternatives, states, payoffs, " +
      "and probabilities.",

    unit: "USD",

    alternatives: [
      "Alternative A",
      "Alternative B"
    ],

    states: [
      "State 1",
      "State 2"
    ],

    probabilities: ["", ""],

    payoffs: [
      ["", ""],
      ["", ""]
    ],

    stages: [
      ["emv", 1]
    ]
  }
};

// 3. Helpers for HTML elements, safe text, and number formatting.
const byId = id => document.getElementById(id);

const escapeHTML = value => {
  const characters = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value).replace(
    /[&<>"']/g,
    character => characters[character]
  );
};

// Empty cells must remain invalid instead of becoming zero.
const toNumber = value => {
  return String(value).trim() === "" ? NaN : Number(value);
};

const format = value => {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(value) < 0.005 ? 0 : value);
};

// Create an editable copy without changing the original example.
function createModel(key) {
  const example = EXAMPLES[key];

  return {
    example: key,
    unit: example.unit,
    alternatives: [...example.alternatives],
    states: [...example.states],
    probabilities: example.probabilities.map(String),
    payoffs: example.payoffs.map(row => row.map(String)),

    stages: example.stages.map(([criterion, keep]) => ({
      criterion,
      keep: String(keep)
    }))
  };
}

let model = createModel("coffee");

const alternativeNames = indices => {
  return indices
    .map(i => escapeHTML(model.alternatives[i]))
    .join(", ");
};

// 4. Validate inputs and calculate statistics from the original table.
function analyze(current) {
  const payoffs = current.payoffs.map(row => row.map(toNumber));
  const probabilities = current.probabilities.map(toNumber);

  const total = probabilities.reduce(
    (sum, value) => sum + value,
    0
  );

  const namesValid = [
    ...current.alternatives,
    ...current.states
  ].every(name => name.trim());

  const payoffsValid =
    payoffs.length === current.alternatives.length &&
    payoffs.every(row =>
      row.length === current.states.length &&
      row.every(Number.isFinite)
    );

  const probabilitiesValid =
    probabilities.length === current.states.length &&
    probabilities.every(value =>
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 1
    ) &&
    Math.abs(total - 1) <= EPSILON;

  let regrets = [];
  let statistics = [];

  if (payoffsValid) {
    const stateBest = current.states.map((_, j) =>
      Math.max(...payoffs.map(row => row[j]))
    );

    regrets = payoffs.map(row =>
      row.map((value, j) => stateBest[j] - value)
    );

    statistics = payoffs.map((row, i) => ({
      maximax: Math.max(...row),
      maximin: Math.min(...row),
      regret: Math.max(...regrets[i]),

      emv: probabilitiesValid
        ? row.reduce(
            (sum, value, j) => sum + value * probabilities[j],
            0
          )
        : null
    }));
  }

  return {
    namesValid,
    payoffsValid,
    probabilitiesValid,
    total,
    regrets,
    statistics
  };
}

// Return every alternative tied with the best value.
function findWinners(statistics, criterion) {
  const direction = CRITERIA[criterion].direction;

  const best = Math.max(
    ...statistics.map(row => row[criterion] * direction)
  );

  return statistics
    .map((_, i) => i)
    .filter(i =>
      Math.abs(
        statistics[i][criterion] * direction - best
      ) <= EPSILON
    );
}

// 5. Apply filters in order.
// Ties at each cutoff survive in their original input order.
function applyStages(current, analysis) {
  let survivors = current.alternatives.map((_, i) => i);
  const steps = [];

  if (!analysis.namesValid || !analysis.payoffsValid) {
    return {
      steps,
      survivors,
      error: "Complete all names and payoffs before filtering."
    };
  }

  for (let index = 0; index < current.stages.length; index++) {
    const stage = current.stages[index];
    const keep = toNumber(stage.keep);

    if (!Number.isInteger(keep) || keep < 1) {
      return {
        steps,
        survivors,
        error: `Stage ${index + 1}: enter a positive whole number.`
      };
    }

    if (
      stage.criterion === "emv" &&
      !analysis.probabilitiesValid
    ) {
      return {
        steps,
        survivors,
        error:
          `Stage ${index + 1}: EMV needs valid probabilities ` +
          "that sum to 1."
      };
    }

    const entered = [...survivors];
    const direction = CRITERIA[stage.criterion].direction;

    const sorted = [...entered].sort((a, b) =>
      (
        analysis.statistics[b][stage.criterion] -
        analysis.statistics[a][stage.criterion]
      ) * direction
    );

    const cutoffIndex = Math.min(keep, sorted.length) - 1;

    const cutoff =
      analysis.statistics[sorted[cutoffIndex]][stage.criterion];

    survivors = entered.filter(i =>
      (
        analysis.statistics[i][stage.criterion] - cutoff
      ) * direction >= -EPSILON
    );

    steps.push({
      index,
      criterion: stage.criterion,
      keep,
      entered,
      survivors: [...survivors],

      eliminated: entered.filter(i =>
        !survivors.includes(i)
      ),

      cutoff
    });
  }

  return {
    steps,
    survivors,
    error: null
  };
}

// 6. Generate the editable payoff table.
function renderInputs() {
  byId("unit").value = model.unit;

  const stateHeaders = model.states.map((name, j) => `
    <th scope="col">
      <div class="cell-heading">
        <input
          class="name-input"
          data-field="state"
          data-j="${j}"
          value="${escapeHTML(name)}"
          maxlength="60"
          aria-label="State ${j + 1} name"
        >

        <button
          class="remove-button"
          data-remove="state"
          data-j="${j}"
          ${model.states.length === 1 ? "disabled" : ""}
          aria-label="Remove state ${j + 1}"
          type="button"
        >×</button>
      </div>

      <label class="probability-field">
        P =
        <input
          type="number"
          min="0"
          max="1"
          step="any"
          data-field="probability"
          data-j="${j}"
          value="${escapeHTML(model.probabilities[j])}"
          aria-label="Probability of state ${j + 1}"
          aria-describedby="validation"
        >
      </label>
    </th>
  `).join("");

  const alternativeRows = model.alternatives.map((name, i) => {
    const payoffCells = model.states.map((_, j) => `
      <td>
        <input
          type="number"
          step="any"
          data-field="payoff"
          data-i="${i}"
          data-j="${j}"
          value="${escapeHTML(model.payoffs[i][j])}"
          aria-label="Payoff for alternative ${i + 1}, state ${j + 1}"
          aria-describedby="validation"
        >
      </td>
    `).join("");

    return `
      <tr>
        <th scope="row">
          <div class="cell-heading">
            <input
              class="name-input"
              data-field="alternative"
              data-i="${i}"
              value="${escapeHTML(name)}"
              maxlength="60"
              aria-label="Alternative ${i + 1} name"
            >

            <button
              class="remove-button"
              data-remove="alternative"
              data-i="${i}"
              ${model.alternatives.length === 1 ? "disabled" : ""}
              aria-label="Remove alternative ${i + 1}"
              type="button"
            >×</button>
          </div>
        </th>

        ${payoffCells}
      </tr>
    `;
  }).join("");

  byId("payoff-table").innerHTML = `
    <thead>
      <tr>
        <th scope="col">Alternative / State</th>
        ${stateHeaders}
      </tr>
    </thead>

    <tbody>
      ${alternativeRows}
    </tbody>
  `;
}

// Generate controls for each filtering stage.
function renderStageControls() {
  byId("stage-controls").innerHTML =
    model.stages.map((stage, i) => {
      const options = Object.entries(CRITERIA)
        .map(([key, criterion]) => `
          <option
            value="${key}"
            ${stage.criterion === key ? "selected" : ""}
          >
            ${criterion.name}
          </option>
        `)
        .join("");

      return `
        <li>
          <strong>${String(i + 1).padStart(2, "0")}</strong>

          <label>
            Criterion
            <select
              data-stage-index="${i}"
              data-property="criterion"
              aria-label="Stage ${i + 1} criterion"
            >
              ${options}
            </select>
          </label>

          <label>
            Keep top
            <input
              type="number"
              min="1"
              step="1"
              value="${escapeHTML(stage.keep)}"
              data-stage-index="${i}"
              data-property="keep"
              aria-label="Number to keep in stage ${i + 1}"
              aria-describedby="filter-message"
            >
          </label>

          <div class="stage-actions">
            <button
              data-stage-action="up"
              data-index="${i}"
              ${i === 0 ? "disabled" : ""}
              aria-label="Move stage ${i + 1} up"
              type="button"
            >↑</button>

            <button
              data-stage-action="down"
              data-index="${i}"
              ${i === model.stages.length - 1 ? "disabled" : ""}
              aria-label="Move stage ${i + 1} down"
              type="button"
            >↓</button>

            <button
              data-stage-action="remove"
              data-index="${i}"
              aria-label="Remove stage ${i + 1}"
              type="button"
            >Remove</button>
          </div>
        </li>
      `;
    }).join("");
}

// 7. Refresh results without replacing the input being edited.
function update() {
  const analysis = analyze(model);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  } catch {
    // Storage is optional.
  }

  byId("summary-unit").textContent = model.unit;

  document.querySelectorAll("#payoff-table input")
    .forEach(input => {
      const value = toNumber(input.value);
      let invalid = false;

      if (
        ["state", "alternative"].includes(input.dataset.field)
      ) {
        invalid = !input.value.trim();
      }

      if (input.dataset.field === "payoff") {
        invalid = !Number.isFinite(value);
      }

      if (input.dataset.field === "probability") {
        invalid =
          !Number.isFinite(value) ||
          value < 0 ||
          value > 1;
      }

      input.setAttribute("aria-invalid", String(invalid));
    });

  const messages = [];

  if (!analysis.namesValid) {
    messages.push("Give every alternative and state a name.");
  }

  if (!analysis.payoffsValid) {
    messages.push("Complete all payoffs with valid numbers.");
  }

  if (!analysis.probabilitiesValid) {
    messages.push(
      "Probabilities must be between 0 and 1 and sum to 1. " +
      `Current sum: ${format(analysis.total)}. EMV is unavailable.`
    );
  }

  byId("validation").className =
    "status" + (messages.length ? " error" : "");

  byId("validation").textContent = messages.length
    ? messages.join(" ")
    : (
        `✓ Valid model · ${model.alternatives.length} alternatives · ` +
        `${model.states.length} states · ` +
        `Probability sum: ${format(analysis.total)}`
      );

  const ready = analysis.namesValid && analysis.payoffsValid;

  renderCriterionCards(analysis, ready);
  renderSummaryTable(analysis, ready);
  renderRegretTable(analysis, ready);
  renderFiltering(analysis);
}

function renderCriterionCards(analysis, ready) {
  byId("criterion-cards").innerHTML =
    Object.entries(CRITERIA).map(([key, criterion]) => {
      const available =
        ready &&
        (key !== "emv" || analysis.probabilitiesValid);

      const winners = available
        ? findWinners(analysis.statistics, key)
        : [];

      const recommendation = available
        ? alternativeNames(winners)
        : "Data needed";

      const score = available
        ? (
            format(analysis.statistics[winners[0]][key]) +
            " " +
            escapeHTML(model.unit)
          )
        : "Complete the model";

      return `
        <article class="card">
          <h3>${criterion.name}</h3>
          <p>${criterion.description}</p>

          <div class="recommendation">
            ${recommendation}
          </div>

          <div class="score">${score}</div>

          ${
            winners.length > 1
              ? `<span class="tie">Tie · ${winners.length} alternatives</span>`
              : ""
          }
        </article>
      `;
    }).join("");
}

function renderSummaryTable(analysis, ready) {
  if (!ready) {
    byId("summary-table").innerHTML =
      "<p>Complete the names and payoffs to see results.</p>";
    return;
  }

  const keys = Object.keys(CRITERIA);

  const rows = model.alternatives.map((name, i) => {
    const cells = keys.map(key => {
      const value = analysis.statistics[i][key];

      const best =
        value !== null &&
        findWinners(analysis.statistics, key).includes(i);

      return `
        <td class="${best ? "best" : ""}">
          ${format(value)}${best ? " ●" : ""}
        </td>
      `;
    }).join("");

    return `
      <tr>
        <th scope="row">${escapeHTML(name)}</th>
        ${cells}
      </tr>
    `;
  }).join("");

  byId("summary-table").innerHTML = `
    <table>
      <thead>
        <tr>
          <th scope="col">Alternative</th>
          <th scope="col">Maximum</th>
          <th scope="col">Minimum</th>
          <th scope="col">Maximum regret</th>
          <th scope="col">EMV / Bayes</th>
        </tr>
      </thead>

      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderRegretTable(analysis, ready) {
  if (!ready) {
    byId("regret-table").innerHTML =
      "<p>Complete the payoffs first.</p>";
    return;
  }

  const headers = model.states.map(name => `
    <th scope="col">${escapeHTML(name)}</th>
  `).join("");

  const rows = model.alternatives.map((name, i) => {
    const cells = analysis.regrets[i].map(value => `
      <td>${format(value)}</td>
    `).join("");

    return `
      <tr>
        <th scope="row">${escapeHTML(name)}</th>
        ${cells}
        <td>${format(analysis.statistics[i].regret)}</td>
      </tr>
    `;
  }).join("");

  byId("regret-table").innerHTML = `
    <table>
      <thead>
        <tr>
          <th scope="col">Alternative</th>
          ${headers}
          <th scope="col">Maximum</th>
        </tr>
      </thead>

      <tbody>${rows}</tbody>
    </table>
  `;
}

// 8. Build the filtering table and equivalent flow diagram.
function renderFiltering(analysis) {
  const result = applyStages(model, analysis);

  document.querySelectorAll('[data-property="keep"]')
    .forEach(input => {
      const keep = toNumber(input.value);

      input.setAttribute(
        "aria-invalid",
        String(!Number.isInteger(keep) || keep < 1)
      );
    });

  byId("filter-message").className =
    result.error ? "status error" : "";

  byId("filter-message").textContent = result.error
    ? (
        result.error +
        " No final outcome is shown until all stages are valid."
      )
    : (
        model.stages.length
          ? ""
          : "No filters: all alternatives remain."
      );

  renderFilterTable(result);

  if (!analysis.namesValid || !analysis.payoffsValid) {
    byId("flow-diagram").innerHTML =
      "<p>Complete the names and payoffs to display the flow.</p>";

    byId("final-result").innerHTML = "";
    return;
  }

  const nodes = [
    {
      label: "STARTING POINT",
      survivors: model.alternatives.map((_, i) => i),
      eliminated: []
    },

    ...result.steps.map(step => ({
      label:
        `${step.index + 1}. ${CRITERIA[step.criterion].name} ` +
        `· top ${step.keep}`,

      survivors: step.survivors,
      eliminated: step.eliminated
    }))
  ];

  byId("flow-diagram").innerHTML = nodes.map((node, i) => {
    const isFinal =
      i === nodes.length - 1 &&
      !result.error;

    return `
      <div class="flow-node ${isFinal ? "final" : ""}">
        <div class="flow-label">${node.label}</div>

        <div class="survivors">
          <strong>
            ${node.survivors.length}
            ALTERNATIVE${node.survivors.length === 1 ? "" : "S"}
          </strong>

          ${alternativeNames(node.survivors)}
        </div>

        ${
          node.eliminated.length
            ? `
              <div class="eliminated">
                <strong>ELIMINATED</strong>
                ${alternativeNames(node.eliminated)}
              </div>
            `
            : ""
        }
      </div>
    `;
  }).join("");

  if (result.error) {
    byId("final-result").innerHTML = "";
    return;
  }

  const finalMessage = result.survivors.length > 1
    ? "Multiple options remain. All ties at the cutoff are retained."
    : "This alternative survives your complete sequence of filters.";

  byId("final-result").innerHTML = `
    <div class="outcome">
      <small>
        ${
          model.stages.length
            ? "FILTERING OUTCOME"
            : "NO FILTERS APPLIED"
        }
      </small>

      <strong>${alternativeNames(result.survivors)}</strong>
      <p>${finalMessage}</p>
    </div>
  `;
}

function renderFilterTable(result) {
  if (!result.steps.length) {
    byId("filter-table").innerHTML = "";
    return;
  }

  const rows = result.steps.map(step => `
    <tr>
      <th scope="row">
        ${step.index + 1}.
        ${CRITERIA[step.criterion].name}
        · top ${step.keep}
      </th>

      <td>${alternativeNames(step.entered)}</td>
      <td>${format(step.cutoff)}</td>
      <td>${alternativeNames(step.survivors)}</td>

      <td>
        ${
          step.eliminated.length
            ? alternativeNames(step.eliminated)
            : "None"
        }
      </td>
    </tr>
  `).join("");

  byId("filter-table").innerHTML = `
    <table>
      <thead>
        <tr>
          <th scope="col">Stage / Criterion</th>
          <th scope="col">Entered</th>
          <th scope="col">Cutoff</th>
          <th scope="col">Survivors</th>
          <th scope="col">Eliminated</th>
        </tr>
      </thead>

      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAll() {
  renderInputs();
  renderStageControls();

  byId("scenario-description").textContent =
    EXAMPLES[model.example].description;

  document.querySelectorAll("[data-example]")
    .forEach(button => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.example === model.example)
      );
    });

  update();
}

// 9. Event listeners connect user actions to automatic updates.
document.querySelectorAll("[data-example]").forEach(button => {
  button.addEventListener("click", () => {
    model = createModel(button.dataset.example);
    renderAll();
  });
});

byId("payoff-table").addEventListener("input", event => {
  const input = event.target;
  const i = Number(input.dataset.i);
  const j = Number(input.dataset.j);

  if (input.dataset.field === "alternative") {
    model.alternatives[i] = input.value;
  }

  if (input.dataset.field === "state") {
    model.states[j] = input.value;
  }

  if (input.dataset.field === "probability") {
    model.probabilities[j] = input.value;
  }

  if (input.dataset.field === "payoff") {
    model.payoffs[i][j] = input.value;
  }

  update();
});

byId("payoff-table").addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");

  if (!button) {
    return;
  }

  const i = Number(button.dataset.i);
  const j = Number(button.dataset.j);

  if (
    button.dataset.remove === "alternative" &&
    model.alternatives.length > 1
  ) {
    model.alternatives.splice(i, 1);
    model.payoffs.splice(i, 1);
  }

  if (
    button.dataset.remove === "state" &&
    model.states.length > 1
  ) {
    model.states.splice(j, 1);
    model.probabilities.splice(j, 1);
    model.payoffs.forEach(row => row.splice(j, 1));
  }

  renderInputs();
  update();
});

byId("add-alternative").addEventListener("click", () => {
  model.alternatives.push("New alternative");
  model.payoffs.push(model.states.map(() => ""));

  renderInputs();
  update();
});

byId("add-state").addEventListener("click", () => {
  model.states.push("New state");
  model.probabilities.push("");
  model.payoffs.forEach(row => row.push(""));

  renderInputs();
  update();
});

byId("unit").addEventListener("input", event => {
  model.unit = event.target.value;
  update();
});

byId("stage-controls").addEventListener("input", event => {
  const input = event.target;

  if (!input.dataset.property) {
    return;
  }

  const index = Number(input.dataset.stageIndex);
  const property = input.dataset.property;

  model.stages[index][property] = input.value;
  update();
});

byId("stage-controls").addEventListener("click", event => {
  const button = event.target.closest("[data-stage-action]");

  if (!button) {
    return;
  }

  const i = Number(button.dataset.index);

  if (button.dataset.stageAction === "remove") {
    model.stages.splice(i, 1);
  } else {
    const j =
      i + (button.dataset.stageAction === "up" ? -1 : 1);

    if (j < 0 || j >= model.stages.length) {
      return;
    }

    [model.stages[i], model.stages[j]] =
      [model.stages[j], model.stages[i]];
  }

  renderStageControls();
  update();
});

byId("add-stage").addEventListener("click", () => {
  model.stages.push({
    criterion: "emv",
    keep: "1"
  });

  renderStageControls();
  update();
});

byId("print-button").addEventListener("click", () => {
  window.print();
});

// 10. Show the conversation link after adding an HTTPS URL in HTML.
const conversationLink = byId("conversation-link");

if (
  conversationLink.getAttribute("href").startsWith("https://")
) {
  conversationLink.hidden = false;
  byId("conversation-placeholder").hidden = true;
}

// Restore a structurally valid saved model.
// Storage never leaves this browser.
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

  const savedModelIsValid =
    saved &&
    Object.hasOwn(EXAMPLES, saved.example) &&
    typeof saved.unit === "string" &&

    Array.isArray(saved.alternatives) &&
    saved.alternatives.length > 0 &&
    saved.alternatives.every(name =>
      typeof name === "string"
    ) &&

    Array.isArray(saved.states) &&
    saved.states.length > 0 &&
    saved.states.every(name =>
      typeof name === "string"
    ) &&

    Array.isArray(saved.probabilities) &&
    saved.probabilities.length === saved.states.length &&

    Array.isArray(saved.payoffs) &&
    saved.payoffs.length === saved.alternatives.length &&
    saved.payoffs.every(row =>
      Array.isArray(row) &&
      row.length === saved.states.length
    ) &&

    Array.isArray(saved.stages) &&
    saved.stages.every(stage =>
      stage &&
      Object.hasOwn(CRITERIA, stage.criterion)
    );

  if (savedModelIsValid) {
    model = saved;
  }
} catch {
  // Start with the coffee example if saved data cannot be loaded.
}

renderAll();