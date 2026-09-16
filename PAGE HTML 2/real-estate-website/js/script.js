document.addEventListener("DOMContentLoaded", function() {
    // Form validation for pre-registration
    const preRegForm = document.getElementById("preRegForm");
    if (preRegForm) {
        preRegForm.addEventListener("submit", function(event) {
            event.preventDefault();
            const name = document.getElementById("name").value;
            const email = document.getElementById("email").value;
            const phone = document.getElementById("phone").value;

            if (validateForm(name, email, phone)) {
                alert("Thank you for pre-registering! We will contact you soon.");
                preRegForm.reset();
            } else {
                alert("Please fill in all fields correctly.");
            }
        });
    }

    // Function to validate form fields
    function validateForm(name, email, phone) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return name && emailPattern.test(email) && phone;
    }

    // Dynamic content loading for announcements
    const announcementsSection = document.getElementById("announcements");
    if (announcementsSection) {
        loadAnnouncements();
    }

    function loadAnnouncements() {
        const announcements = [
            "New property listings available!",
            "Special promotion: 10% off on your first purchase!",
            "Join our upcoming webinar on real estate investment."
        ];

        announcements.forEach(function(announcement) {
            const announcementItem = document.createElement("li");
            announcementItem.textContent = announcement;
            announcementsSection.appendChild(announcementItem);
        });
    }
});