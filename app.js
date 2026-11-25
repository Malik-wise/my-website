// =========================================================================
// 1. STATE & PRIORITY CONFIGURATION
// =========================================================================
const STAFF_PIN = "2026";
const SEVERITY_RANK = {
  Emergency: 1,
  Urgent: 2,
  Normal: 3
};

let isStaffAuthenticated = false;
let nextId = 4;

// Non-sensitive appointment bookings visible on patient portal
let appointments = [
  {
    id: 1,
    patientName: "Amina Kyagulanyi",
    department: "General Medicine",
    doctor: "Dr. Kato (General)",
    scheduledFor: "2026-11-20T09:30",
    status: "Confirmed"
  }
];

// Confidential intake & queue records visible ONLY to authorized staff
let queueRecords = [
  {
    id: 1,
    patientName: "Grace Nabirye",
    age: 34,
    department: "General Medicine",
    doctor: "Dr. Kato (General)",
    severity: "Normal",
    clinicalNotes: "Routine follow-up for mild seasonal cough; BP 118/76 mmHg.",
    arrivedAt: Date.now() - 1000 * 60 * 25
  },
  {
    id: 2,
    patientName: "Samuel Wasswa",
    age: 52,
    department: "Emergency & Trauma",
    doctor: "Dr. Okello (Cardiology)",
    severity: "Emergency",
    clinicalNotes: "Sudden chest tightness radiating to left arm; needs immediate ECG.",
    arrivedAt: Date.now() - 1000 * 60 * 4
  },
  {
    id: 3,
    patientName: "Beatrice Apio",
    age: 8,
    department: "Pediatrics",
    doctor: "Dr. Namukasa (Pediatrics)",
    severity: "Urgent",
    clinicalNotes: "High fever (39.1°C) for 18 hours and poor fluid intake.",
    arrivedAt: Date.now() - 1000 * 60 * 12
  }
];

// =========================================================================
// 2. AUTOMATIC EMERGENCY PRIORITIZATION LOGIC
// =========================================================================
function getPrioritizedQueue(records) {
  return [...records].sort((a, b) => {
    const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rankDiff !== 0) return rankDiff; // Emergency < Urgent < Normal
    return a.arrivedAt - b.arrivedAt;   // Earlier arrival comes first within same severity
  });
}

// =========================================================================
// 3. NAVIGATION & STAFF AUTHENTICATION
// =========================================================================
const tabPatient = document.getElementById("tabPatient");
const tabStaff = document.getElementById("tabStaff");
const patientView = document.getElementById("patientView");
const staffView = document.getElementById("staffView");
const staffLockScreen = document.getElementById("staffLockScreen");
const staffWorkspace = document.getElementById("staffWorkspace");

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function switchTab(target) {
  if (target === "patient") {
    tabPatient.classList.add("active");
    tabStaff.classList.remove("active");
    patientView.classList.remove("hidden");
    staffView.classList.add("hidden");
    renderPatientAppointments();
  } else {
    tabStaff.classList.add("active");
    tabPatient.classList.remove("active");
    staffView.classList.remove("hidden");
    patientView.classList.add("hidden");
    syncStaffGate();
  }
}

function syncStaffGate() {
  if (isStaffAuthenticated) {
    staffLockScreen.classList.add("hidden");
    staffWorkspace.classList.remove("hidden");
    renderStaffQueue();
  } else {
    staffLockScreen.classList.remove("hidden");
    staffWorkspace.classList.add("hidden");
  }
}

tabPatient.addEventListener("click", () => switchTab("patient"));
tabStaff.addEventListener("click", () => switchTab("staff"));

document.getElementById("staffUnlockForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const pinInput = document.getElementById("staffPin");
  const errPin = document.getElementById("errStaffPin");
  if (pinInput.value.trim() === STAFF_PIN) {
    isStaffAuthenticated = true;
    errPin.textContent = "";
    pinInput.value = "";
    syncStaffGate();
    showToast("Authorized staff portal unlocked.");
  } else {
    errPin.textContent = "Invalid PIN. Use demo PIN 2026.";
  }
});

document.getElementById("lockStaffBtn").addEventListener("click", () => {
  isStaffAuthenticated = false;
  syncStaffGate();
  showToast("Staff portal locked.");
});

// =========================================================================
// 4. PATIENT APPOINTMENT BOOKING (NO CLINICAL DATA EXPOSED)
// =========================================================================
function renderPatientAppointments() {
  const listEl = document.getElementById("patientApptList");
  if (!appointments.length) {
    listEl.innerHTML = `<div class="empty-state">No appointments booked yet.</div>`;
    return;
  }

  listEl.innerHTML = appointments
    .map((appt) => {
      const formattedDate = new Date(appt.scheduledFor).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
      });
      return `
        <div class="appt-item">
          <div class="appt-top">
            <strong>${escapeHtml(appt.patientName)}</strong>
            <span class="pill-booked">${escapeHtml(appt.status)}</span>
          </div>
          <div class="appt-meta">
            ${escapeHtml(appt.department)} • ${escapeHtml(appt.doctor)}<br />
            Time: ${escapeHtml(formattedDate)}
          </div>
        </div>
      `;
    })
    .join("");
}

document.getElementById("patientBookingForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const nameEl = document.getElementById("apptName");
  const phoneEl = document.getElementById("apptPhone");
  const deptEl = document.getElementById("apptDepartment");
  const docEl = document.getElementById("apptDoctor");
  const dateEl = document.getElementById("apptDate");

  const errs = {
    name: document.getElementById("errApptName"),
    phone: document.getElementById("errApptPhone"),
    dept: document.getElementById("errApptDepartment"),
    doc: document.getElementById("errApptDoctor"),
    date: document.getElementById("errApptDate")
  };

  Object.values(errs).forEach((el) => (el.textContent = ""));
  let valid = true;

  if (!nameEl.value.trim()) {
    errs.name.textContent = "Please enter the patient's full name.";
    valid = false;
  }
  if (phoneEl.value.trim().length < 7) {
    errs.phone.textContent = "Please enter a valid contact number.";
    valid = false;
  }
  if (!deptEl.value) {
    errs.dept.textContent = "Please choose a department.";
    valid = false;
  }
  if (!docEl.value) {
    errs.doc.textContent = "Please choose a doctor.";
    valid = false;
  }
  if (!dateEl.value) {
    errs.date.textContent = "Please pick an appointment date and time.";
    valid = false;
  }

  if (!valid) return;

  appointments.unshift({
    id: nextId++,
    patientName: nameEl.value.trim(),
    department: deptEl.value,
    doctor: docEl.value,
    scheduledFor: dateEl.value,
    status: "Confirmed"
  });

  e.target.reset();
  renderPatientAppointments();
  showToast("Appointment booked successfully.");
});

// =========================================================================
// 5. FAST DIGITAL INTAKE & LIVE QUEUE MANAGEMENT (STAFF ONLY)
// =========================================================================
document.getElementById("intakeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!isStaffAuthenticated) return;

  const nameEl = document.getElementById("intakeName");
  const ageEl = document.getElementById("intakeAge");
  const sevEl = document.getElementById("intakeSeverity");
  const deptEl = document.getElementById("intakeDepartment");
  const docEl = document.getElementById("intakeDoctor");
  const notesEl = document.getElementById("intakeNotes");

  const errs = {
    name: document.getElementById("errIntakeName"),
    age: document.getElementById("errIntakeAge"),
    sev: document.getElementById("errIntakeSeverity"),
    dept: document.getElementById("errIntakeDepartment"),
    doc: document.getElementById("errIntakeDoctor"),
    notes: document.getElementById("errIntakeNotes")
  };

  Object.values(errs).forEach((el) => (el.textContent = ""));
  let valid = true;

  const ageVal = Number(ageEl.value);
  if (!nameEl.value.trim()) {
    errs.name.textContent = "Patient name is required.";
    valid = false;
  }
  if (ageEl.value === "" || Number.isNaN(ageVal) || ageVal < 0 || ageVal > 125) {
    errs.age.textContent = "Enter a valid age (0–125).";
    valid = false;
  }
  if (!sevEl.value) {
    errs.sev.textContent = "Select condition severity.";
    valid = false;
  }
  if (!deptEl.value) {
    errs.dept.textContent = "Select a department.";
    valid = false;
  }
  if (!docEl.value) {
    errs.doc.textContent = "Assign a doctor.";
    valid = false;
  }
  if (!notesEl.value.trim()) {
    errs.notes.textContent = "Enter crucial triage or clinical intake notes.";
    valid = false;
  }

  if (!valid) return;

  const severity = sevEl.value;
  queueRecords.push({
    id: nextId++,
    patientName: nameEl.value.trim(),
    age: ageVal,
    department: deptEl.value,
    doctor: docEl.value,
    severity,
    clinicalNotes: notesEl.value.trim(),
    arrivedAt: Date.now()
  });

  e.target.reset();
  sevEl.value = "Normal";
  renderStaffQueue();
  showToast(`${severity} intake added & queue prioritized.`);
});

function markSeen(id) {
  if (!isStaffAuthenticated) return;
  const target = queueRecords.find((item) => item.id === id);
  queueRecords = queueRecords.filter((item) => item.id !== id);
  renderStaffQueue();
  if (target) {
    showToast(`${target.patientName} marked as seen.`);
  }
}

function renderStaffQueue() {
  if (!isStaffAuthenticated) return;

  // Update urgency counters
  document.getElementById("countEmergency").textContent =
    queueRecords.filter((r) => r.severity === "Emergency").length;
  document.getElementById("countUrgent").textContent =
    queueRecords.filter((r) => r.severity === "Urgent").length;
  document.getElementById("countNormal").textContent =
    queueRecords.filter((r) => r.severity === "Normal").length;

  const query = document.getElementById("queueSearch").value.trim().toLowerCase();
  const filter = document.getElementById("queueFilter").value;

  const filtered = getPrioritizedQueue(queueRecords).filter((item) => {
    const matchesSeverity = filter === "ALL" || item.severity === filter;
    const haystack = `${item.patientName} ${item.department} ${item.doctor} ${item.severity} ${item.clinicalNotes}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    return matchesSeverity && matchesQuery;
  });

  const listEl = document.getElementById("liveQueueList");
  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state">No matching patients in the active queue.</div>`;
    return;
  }

  listEl.innerHTML = filtered
    .map((item, idx) => {
      const arrivalTime = new Date(item.arrivedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      return `
        <div class="queue-item ${escapeHtml(item.severity)}">
          <div class="queue-top">
            <div>
              <strong>#${idx + 1} ${escapeHtml(item.patientName)}</strong>
              <span style="color:var(--muted); font-size:0.85rem;">(${item.age} yrs)</span>
            </div>
            <span class="badge ${escapeHtml(item.severity)}">${escapeHtml(item.severity)}</span>
          </div>
          <div style="font-size:0.84rem; color:#334155;">
            <strong>${escapeHtml(item.department)}</strong> • ${escapeHtml(item.doctor)}
          </div>
          <div class="clinical-note">
            <strong>Intake Notes:</strong> ${escapeHtml(item.clinicalNotes)}
          </div>
          <div class="queue-footer">
            <span>Arrived: ${escapeHtml(arrivalTime)}</span>
            <button class="btn btn-seen" type="button" onclick="markSeen(${item.id})">Mark Seen</button>
          </div>
        </div>
      `;
    })
    .join("");
}

document.getElementById("queueSearch").addEventListener("input", renderStaffQueue);
document.getElementById("queueFilter").addEventListener("change", renderStaffQueue);

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Initial render
renderPatientAppointments();