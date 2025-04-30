/**
 * Engineer Limitations - Handles the limitations calendar on the engineer dashboard.
 */

// Define Persian day names here as it was removed from the template
const persianDayNamesJS = [
    "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"
];

document.addEventListener('DOMContentLoaded', () => {
    // Get references to elements
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const calendarContainer = document.getElementById('limitationsCalendar');
    const saveButton = document.getElementById('btnSaveLimitations');

    // Initial calendar generation
    generateLimitationsCalendar();

    // Event listeners
    monthSelect.addEventListener('change', generateLimitationsCalendar);
    yearSelect.addEventListener('change', generateLimitationsCalendar);
    saveButton.addEventListener('click', saveLimitations);
});

function generateLimitationsCalendar() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const calendarContainer = document.getElementById('limitationsCalendar');

    if (!monthSelect || !yearSelect || !calendarContainer) {
        console.error("Required elements for calendar generation not found.");
        return;
    }

    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);

    console.log(`Generating limitations calendar for Jalali Year: ${year}, Month: ${month}`);

    // --- Calendar Generation Logic (Adapted from main.js or similar) ---
    if (!jalaali.isValidJalaaliDate(year, month, 1)) {
        calendarContainer.innerHTML = '<div class="alert alert-danger">Invalid Jalali date selected.</div>';
        return;
    }

    const daysInMonth = jalaali.jalaaliMonthLength(year, month);
    const firstDayGregorian = jalaali.toGregorian(year, month, 1);
    const firstDayDateObject = new Date(firstDayGregorian.gy, firstDayGregorian.gm - 1, firstDayGregorian.gd);
    let startingDayOfWeek = (firstDayDateObject.getDay() + 1) % 7; // 0=Sat

    // Create table structure
    const table = document.createElement('table');
    table.className = 'table table-bordered limitations-table text-center';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Day', 'Shift 1 (Unavailable)', 'Shift 2 (Unavailable)', 'Shift 3 (Unavailable)'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    // Get current limitations for this engineer
    const currentLimitations = engineerData.limitations || {}; 

    for (let day = 1; day <= daysInMonth; day++) {
        const jDate = jalaali.toGregorian(year, month, day);
        const dayDateObj = new Date(jDate.gy, jDate.gm - 1, jDate.gd);
        const dayOfWeek = (dayDateObj.getDay() + 1) % 7; // 0=Sat
        const isWeekend = (dayOfWeek === 6 || dayOfWeek === 5); // Adjust for Fri/Sat weekends in Persian calendar

        const row = document.createElement('tr');
        if (isWeekend) {
            row.classList.add('table-secondary'); // Style weekends
        }

        // Day cell
        const dayCell = document.createElement('td');
        dayCell.className = 'fw-bold';
        dayCell.textContent = `${day} (${persianDayNamesJS[dayOfWeek]})`;
        row.appendChild(dayCell);

        // Shift limitation checkboxes
        for (let shift = 1; shift <= 3; shift++) {
            const shiftKey = `shift${shift}`;
            const dayStr = String(day);

            const cell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input limitation-check';
            checkbox.dataset.day = dayStr;
            checkbox.dataset.shift = shiftKey;
            
            // Check if this shift is currently in limitations for this day
            // Limitations are stored as: { "day_number_str": ["shift1", "shift3"] }
            if (currentLimitations[dayStr] && currentLimitations[dayStr].includes(shiftKey)) {
                checkbox.checked = true;
            }
            
            cell.appendChild(checkbox);
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
    table.appendChild(tbody);

    // Replace container content
    calendarContainer.innerHTML = ''; 
    calendarContainer.appendChild(table);
}

function saveLimitations() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const saveButton = document.getElementById('btnSaveLimitations');

    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);

    // Collect limitations from checkboxes
    const limitations = {};
    document.querySelectorAll('.limitation-check:checked').forEach(checkbox => {
        const day = checkbox.dataset.day;
        const shift = checkbox.dataset.shift;
        
        if (!limitations[day]) {
            limitations[day] = [];
        }
        limitations[day].push(shift);
    });

    console.log(`Saving limitations for ${year}-${month}:`, limitations);

    // Disable button and show loading state
    const originalBtnText = saveButton.innerHTML;
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveButton.disabled = true;

    // Send data to API
    fetch('/api/engineer/limitations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Add CSRF token header if needed later
        },
        body: JSON.stringify({ 
            limitations: limitations,
            year: year, // Send year/month context
            month: month
         }) 
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || `Server error: ${response.status}`) });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Update the global engineerData limitations in memory 
            // (important for re-generating calendar without full page reload)
            engineerData.limitations = limitations; 
            
            // Show success feedback (maybe a temporary message near the button)
            const feedback = document.createElement('span');
            feedback.className = 'ms-2 text-success small';
            feedback.textContent = 'Saved successfully!';
            saveButton.parentNode.insertBefore(feedback, saveButton.nextSibling);
            setTimeout(() => feedback.remove(), 3000);

            // Optionally: could show a more prominent alert, but might be excessive
            // alert('Limitations saved successfully!'); 
        } else {
             throw new Error(data.error || 'Failed to save limitations.');
        }
    })
    .catch(error => {
        console.error('Error saving limitations:', error);
        // Show error feedback
        const feedback = document.createElement('span');
        feedback.className = 'ms-2 text-danger small';
        feedback.textContent = `Error: ${error.message}`;
        saveButton.parentNode.insertBefore(feedback, saveButton.nextSibling);
        setTimeout(() => feedback.remove(), 5000);
        // alert(`Failed to save limitations: ${error.message}`);
    })
    .finally(() => {
        // Restore button state
        saveButton.innerHTML = originalBtnText;
        saveButton.disabled = false;
    });
} 