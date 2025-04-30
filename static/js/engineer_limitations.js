/**
 * Engineer Limitations - Handles the limitations calendar on the engineer dashboard.
 */

// Define Persian day names here as it was removed from the template
const persianDayNamesJSGlobal = [
    "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"
];

// Data passed from the template (now assigned directly)
// const engineerData = ... (assigned globally via script tag)
// const persianMonthNamesJS = ... (assigned globally via script tag)
// const initialJalaliYear = ... (assigned globally via script tag)
// const initialJalaliMonth = ... (assigned globally via script tag)

// Add initial console logs to verify global data
console.log("DEBUG: Initial engineerData (global):", typeof engineerData, JSON.stringify(engineerData));
console.log("DEBUG: Initial persianMonthNamesJS (global):", typeof persianMonthNamesJS, JSON.stringify(persianMonthNamesJS));
console.log("DEBUG: Initial initialJalaliYear (global):", typeof initialJalaliYear, initialJalaliYear);
console.log("DEBUG: Initial initialJalaliMonth (global):", typeof initialJalaliMonth, initialJalaliMonth);

document.addEventListener('DOMContentLoaded', () => {
    // Get references to elements
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const calendarContainer = document.getElementById('limitationsCalendar');
    const saveButton = document.getElementById('btnSaveLimitations');
    const sendMessageForm = document.getElementById('sendMessageForm');
    const messageContent = document.getElementById('messageContent');
    const btnSendMessage = document.getElementById('btnSendMessage');
    const sendMessageFeedback = document.getElementById('sendMessageFeedback');
    const btnViewMessages = document.getElementById('btnViewMessages');
    const viewMessagesModal = document.getElementById('viewMessagesModal');
    const messageThread = document.getElementById('messageThread');
    const engineerMessageBadge = document.getElementById('engineerMessageBadge');
    const engineerName = (typeof engineerData !== 'undefined' && engineerData) ? engineerData.name : null;
    console.log("DEBUG: Engineer name for listeners:", engineerName);

    // Initial calendar generation
    if (typeof generateLimitationsCalendar === 'function') {
        generateLimitationsCalendar();
    } else {
        console.error("generateLimitationsCalendar function not found!");
    }

    // Event listeners
    monthSelect.addEventListener('change', generateLimitationsCalendar);
    yearSelect.addEventListener('change', generateLimitationsCalendar);
    saveButton.addEventListener('click', saveLimitations);

    // --- Messaging Event Listeners ---
    if (sendMessageForm && engineerName) {
        sendMessageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const content = messageContent.value.trim();
            if (!content) return;

            btnSendMessage.disabled = true;
            btnSendMessage.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>...';
            sendMessageFeedback.textContent = ''; // Clear previous feedback
            sendMessageFeedback.className = 'mb-2'; // Reset class

            fetch('/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: content }) // Backend figures out engineer_name from session
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    messageContent.value = ''; // Clear textarea
                    sendMessageFeedback.textContent = 'پیام با موفقیت ارسال شد!';
                    sendMessageFeedback.classList.add('text-success', 'small');
                } else {
                    throw new Error(data.message || 'خطا در ارسال پیام');
                }
            })
            .catch(error => {
                sendMessageFeedback.textContent = `خطا: ${error.message}`;
                sendMessageFeedback.classList.add('text-danger', 'small');
                console.error("Error sending message:", error);
            })
            .finally(() => {
                btnSendMessage.disabled = false;
                btnSendMessage.innerHTML = '<i class="fas fa-paper-plane me-1"></i> ارسال پیام';
                // Clear feedback after a few seconds
                setTimeout(() => { sendMessageFeedback.textContent = ''; sendMessageFeedback.className = 'mb-2'; }, 5000);
            });
        });
    }

    if (viewMessagesModal && engineerName) {
        viewMessagesModal.addEventListener('show.bs.modal', () => {
            loadAndDisplayMessages(engineerName);
            // Mark messages as read when modal is opened
            fetch(`/api/messages/engineer/markread/${engineerName}`, { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success' && data.marked_read) {
                        // Hide badge immediately
                        if(engineerMessageBadge) {
                            engineerMessageBadge.classList.add('d-none');
                            engineerMessageBadge.textContent = '0';
                        }
                        console.log('Marked engineer messages as read');
                    }
                })
                .catch(error => console.error('Error marking messages as read:', error));
        });
    }
});

function generateLimitationsCalendar() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const calendarContainer = document.getElementById('limitationsCalendar');

    if (!monthSelect || !yearSelect || !calendarContainer) {
        console.error("Required elements for calendar generation not found.");
        return;
    }

    const month = parseInt(monthSelect.value) || initialJalaliMonth;
    const year = parseInt(yearSelect.value) || initialJalaliYear;

    console.log(`DEBUG: Generating limitations calendar for Jalali Year: ${year}, Month: ${month}`);

    // --- Calendar Generation Logic (Adapted from main.js or similar) ---
    if (!jalaali.isValidJalaaliDate(year, month, 1)) {
        calendarContainer.innerHTML = '<div class="alert alert-danger">تاریخ جلالی انتخاب شده نامعتبر است.</div>';
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
    const headers = ['روز', 'شیفت ۱ (عدم دسترسی)', 'شیفت ۲ (عدم دسترسی)', 'شیفت ۳ (عدم دسترسی)'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    // Use the globally defined engineerData
    console.log("DEBUG: engineerData inside generateLimitationsCalendar:", JSON.stringify(engineerData)); 
    const currentLimitations = (typeof engineerData !== 'undefined' && engineerData && engineerData.limitations) ? engineerData.limitations : {};
    console.log("DEBUG: Using limitations for calendar:", JSON.stringify(currentLimitations)); 

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
        // Use the globally defined persianMonthNamesJS
        const dayName = (typeof persianMonthNamesJS !== 'undefined' && persianMonthNamesJS[dayOfWeek]) ? persianMonthNamesJS[dayOfWeek] : ''
        dayCell.textContent = `${day} (${dayName})`; 
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
            
            // Log the check itself
            const dayHasLimit = currentLimitations.hasOwnProperty(dayStr);
            const shiftsForDay = dayHasLimit ? currentLimitations[dayStr] : [];
            const shouldBeChecked = dayHasLimit && Array.isArray(shiftsForDay) && shiftsForDay.includes(shiftKey);
            
            // console.log(`DEBUG: Checking Day: ${dayStr}, Shift: ${shiftKey}. Day Exists: ${dayHasLimit}, Shifts: ${JSON.stringify(shiftsForDay)}, Includes: ${shiftsForDay.includes(shiftKey)}, Should Check: ${shouldBeChecked}`); // Verbose log

            if (shouldBeChecked) {
                 console.log(`---> DEBUG: CHECKING BOX for Day ${dayStr}, Shift ${shiftKey}`); // Log when checking
                checkbox.checked = true;
            } else {
                 // Optional: Log when NOT checking
                 // console.log(`---> DEBUG: NOT checking box for Day ${dayStr}, Shift ${shiftKey}`);
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
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> در حال ذخیره...';
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
            if (engineerData) { // Check if engineerData exists
                engineerData.limitations = limitations; 
            }
            
            // Show success feedback (maybe a temporary message near the button)
            const feedback = document.createElement('span');
            feedback.className = 'ms-2 text-success small';
            feedback.textContent = 'با موفقیت ذخیره شد!';
            saveButton.parentNode.insertBefore(feedback, saveButton.nextSibling);
            setTimeout(() => feedback.remove(), 3000);

            // Optionally: could show a more prominent alert, but might be excessive
            // alert('محدودیت‌ها با موفقیت ذخیره شدند!');
        } else {
             throw new Error(data.error || 'ذخیره محدودیت‌ها ناموفق بود.');
        }
    })
    .catch(error => {
        console.error('Error saving limitations:', error);
        // Show error feedback
        const feedback = document.createElement('span');
        feedback.className = 'ms-2 text-danger small';
        feedback.textContent = `خطا: ${error.message}`;
        saveButton.parentNode.insertBefore(feedback, saveButton.nextSibling);
        setTimeout(() => feedback.remove(), 5000);
        // alert(`ذخیره محدودیت‌ها ناموفق بود: ${error.message}`);
    })
    .finally(() => {
        // Restore button state
        saveButton.innerHTML = originalBtnText;
        saveButton.disabled = false;
    });
}

// Function to load and display messages in the modal
function loadAndDisplayMessages(engineerName) {
    const messageThread = document.getElementById('messageThread');
    if (!messageThread || !engineerName) return;

    messageThread.innerHTML = '<p class="text-center text-muted">در حال بارگذاری پیام‌ها...</p>'; // Loading indicator

    fetch(`/api/messages/${engineerName}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && Array.isArray(data.messages)) {
                messageThread.innerHTML = ''; // Clear loading/previous
                if (data.messages.length === 0) {
                    messageThread.innerHTML = '<p class="text-center text-muted">هنوز پیامی وجود ندارد.</p>';
                    return;
                }

                data.messages.forEach(msg => {
                    const msgDiv = document.createElement('div');
                    const isEngineerSender = msg.sender_role === 'engineer';
                    const timestamp = new Date(msg.timestamp).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });

                    msgDiv.classList.add('mb-3', 'p-2', 'rounded');
                    msgDiv.style.maxWidth = '80%';

                    if (isEngineerSender) {
                        msgDiv.classList.add('bg-light', 'ms-auto'); // Engineer message align right
                        msgDiv.style.textAlign = 'right';
                    } else {
                        msgDiv.classList.add('bg-primary', 'text-white'); // Admin message align left
                        msgDiv.style.textAlign = 'left';
                    }

                    msgDiv.innerHTML = `
                        <p class="mb-1">${escapeHTML(msg.content)}</p>
                        <small class="text-muted ${isEngineerSender ? '' : 'text-white-50'}" style="font-size: 0.75em;">
                            ${isEngineerSender ? 'شما' : 'ادمین'} - ${timestamp}
                        </small>
                    `;
                    messageThread.appendChild(msgDiv);
                });
                // Scroll to bottom
                messageThread.scrollTop = messageThread.scrollHeight;
            } else {
                throw new Error(data.message || 'Failed to load messages');
            }
        })
        .catch(error => {
            messageThread.innerHTML = `<p class="text-center text-danger">خطا در بارگذاری پیام‌ها: ${error.message}</p>`;
            console.error('Error loading messages:', error);
        });
}

// Helper to escape HTML to prevent XSS
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
} 