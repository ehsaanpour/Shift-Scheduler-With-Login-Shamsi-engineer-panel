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

// Helper function to convert English digits to Persian digits
const toPersianDigits = (num) => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/[0-9]/g, (digit) => persianDigits[parseInt(digit)]);
};

document.addEventListener('DOMContentLoaded', () => {
    // Get references to elements
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const calendarContainer = document.getElementById('limitationsCalendar');
    const btnSaveLimitations = document.getElementById('btnSaveLimitations');
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
    const btnDownloadPdf = document.getElementById('btnDownloadPdf');

    // Initial calendar generation
    if (typeof generateLimitationsCalendar === 'function') {
        // --- NEW: Ensure engineerData.limitations is properly structured ---
        if (engineerData && engineerData.limitations && typeof engineerData.limitations !== 'object') {
             console.warn("DEBUG: engineerData.limitations is not an object, initializing to empty object.");
             engineerData.limitations = {}; // Ensure it's at least an empty object
        } else if (engineerData && !engineerData.limitations) {
             console.warn("DEBUG: engineerData.limitations is missing, initializing to empty object.");
             engineerData.limitations = {};
        }
        // --- END NEW ---
        generateLimitationsCalendar();
    } else {
        console.error("generateLimitationsCalendar function not found!");
    }

    // Event listeners
    monthSelect.addEventListener('change', generateLimitationsCalendar);
    yearSelect.addEventListener('change', generateLimitationsCalendar);
    btnSaveLimitations.addEventListener('click', saveLimitations);

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

    // Function to download the page content as PDF
    function downloadLimitationsAsPDF() {
        const { jsPDF } = window.jspdf;
        const elementToCapture = document.querySelector('.engineer-dashboard');
        const filename = 'دانلود محدودیت ها.pdf';

        // Temporarily hide buttons to avoid them appearing in the PDF
        btnSaveLimitations.style.display = 'none';
        btnDownloadPdf.style.display = 'none';

        html2canvas(elementToCapture, {
             scale: 2,
             useCORS: true,
             logging: false
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(filename);

            // Show buttons again after capturing
            btnSaveLimitations.style.display = 'inline-block';
            btnDownloadPdf.style.display = 'inline-block';

        }).catch(err => {
            console.error("Error generating PDF:", err);
            alert('خطا در تولید فایل PDF. لطفا دوباره تلاش کنید.');
            // Ensure buttons are shown even if there's an error
            btnSaveLimitations.style.display = 'inline-block';
            btnDownloadPdf.style.display = 'inline-block';
        });
    }

    // Add event listener for the PDF download button
    if (btnDownloadPdf) {
        btnDownloadPdf.addEventListener('click', downloadLimitationsAsPDF);
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
    // --- Get limitations for the SPECIFIC year and month ---
    const engineerLims = (typeof engineerData !== 'undefined' && engineerData && engineerData.limitations && typeof engineerData.limitations === 'object') ? engineerData.limitations : {};
    const yearLims = engineerLims[year] || {}; // Get limits for the selected year
    const monthLims = yearLims[month] || {}; // Get limits for the selected month
    console.log(`DEBUG: Generating table for Year: ${year}, Month: ${month}. Found limitations:`, JSON.stringify(monthLims));
    // --- End Specific Limitations ---

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
        // Use the globally defined persianDayNamesJSGlobal for day names
        const dayName = (typeof persianDayNamesJSGlobal !== 'undefined' && persianDayNamesJSGlobal[dayOfWeek]) ? persianDayNamesJSGlobal[dayOfWeek] : '';
        // Convert day number to Persian digits
        dayCell.textContent = `${toPersianDigits(day)} (${dayName})`;
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
            
            // Check against the specific month's limitations (monthLims)
            const shiftsForDay = monthLims[dayStr] || []; // Get limitations for this specific day
            const shouldBeChecked = Array.isArray(shiftsForDay) && shiftsForDay.includes(shiftKey);
            // console.log(`DEBUG: Checking Day: ${dayStr}, Shift: ${shiftKey}. MonthLims[${dayStr}]: ${JSON.stringify(shiftsForDay)}, Includes: ${shiftsForDay.includes(shiftKey)}, Should Check: ${shouldBeChecked}`); // Verbose log

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
    const btnSaveLimitations = document.getElementById('btnSaveLimitations');

    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);

    // Collect limitations from checkboxes FOR THIS MONTH/YEAR
    const limitationsForMonth = {}; // Renamed for clarity
    document.querySelectorAll('.limitation-check:checked').forEach(checkbox => {
        const day = checkbox.dataset.day;
        const shift = checkbox.dataset.shift;

        if (!limitationsForMonth[day]) {
            limitationsForMonth[day] = [];
        }
        limitationsForMonth[day].push(shift);
    });

    console.log(`Saving limitations for ${year}-${month}:`, limitationsForMonth);

    // Disable button and show loading state
    const originalBtnText = btnSaveLimitations.innerHTML;
    btnSaveLimitations.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> در حال ذخیره...';
    btnSaveLimitations.disabled = true;

    // Send data to API
    fetch('/api/engineer/limitations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            year: year,
            month: month,
            limitations: limitationsForMonth // Send collected limitations for this month
        })
    })
    .then(response => {
        if (!response.ok) {
             return response.json().then(err => { throw new Error(err.message || `Server error: ${response.status}`); });
         }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            if (typeof engineerData !== 'undefined' && engineerData) {
                if (!engineerData.limitations || typeof engineerData.limitations !== 'object') {
                    engineerData.limitations = {}; // Initialize if not present or wrong type
                }
                if (!engineerData.limitations[year]) {
                    engineerData.limitations[year] = {}; // Initialize year if not present
                }
                engineerData.limitations[year][month] = limitationsForMonth; // Update only this month's limitations
                 console.log("DEBUG: Updated local engineerData.limitations:", JSON.stringify(engineerData.limitations));
            }
            alert('محدودیت‌ها با موفقیت ذخیره شدند!');
        } else {
            throw new Error(data.message || 'Failed to save limitations.');
        }
    })
    .catch(error => {
        console.error('Error saving limitations:', error);
        // Show error feedback
        const feedback = document.createElement('span');
        feedback.className = 'ms-2 text-danger small';
        feedback.textContent = `خطا: ${error.message}`;
        btnSaveLimitations.parentNode.insertBefore(feedback, btnSaveLimitations.nextSibling);
        setTimeout(() => feedback.remove(), 5000);
        // alert(`ذخیره محدودیت‌ها ناموفق بود: ${error.message}`);
    })
    .finally(() => {
        // Restore button state
        btnSaveLimitations.innerHTML = originalBtnText;
        btnSaveLimitations.disabled = false;
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