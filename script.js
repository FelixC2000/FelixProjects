// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            // Adjust for the sticky navbar height if needed
            const navHeight = document.querySelector('.resume-nav')?.offsetHeight || 0;
            const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 20; // 20px buffer

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Contact form handling
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        // Create email content
        const subject = `New Project Inquiry - ${data.service}`;
        const body = `
    Name: ${data.name}
    Email: ${data.email}
    Service: ${data.service}
    Message: ${data.message}
        `;
        
        // Create mailto link
        const mailtoLink = `mailto:fguzmanceri@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        // Open email client
        window.location.href = mailtoLink;
        
        // Show success message
        alert('Thank you for your message! Your email client should open now. If not, please email me directly at fguzmanceri@gmail.com');
        
        // Reset form
        this.reset();
    });
}


// Navbar scroll effect - *** FIXED ***
window.addEventListener('scroll', function() {
    // FIX: Changed selector from '.navbar' to '.resume-nav'
    const navbar = document.querySelector('.resume-nav');

    // Add a check to prevent errors if the element doesn't exist
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            // Consider adding backdrop-filter if you want a blur effect (check browser support)
            // navbar.style.backdropFilter = 'blur(10px)'; 
        } else {
            navbar.style.background = '#fff';
            navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)'; // Keep shadow consistent
            // navbar.style.backdropFilter = 'none';
        }
    }
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target); // Optional: stop observing once animated
        }
    });
}, observerOptions);

// Observe elements for animation - *** FIXED ***
// FIX: Changed selectors to match your actual HTML classes
document.querySelectorAll('.skill-category, .experience-item, .project-item, .education-item, .certification-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});


// Note: The following functions are defined but not used in your current HTML.
// I've kept them but they won't do anything unless you add corresponding elements.

// Service pricing calculator (simple example)
function calculateProjectCost(service, hours) {
    const rates = {
        'backend': 50,
        'database': 45,
        'fullstack': 60,
        'api': 40,
        'ecommerce': 70,
        'data': 55
    };
    
    return rates[service] * hours;
}

// Add typing effect to hero section - *** FIXED ***
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Initialize typing effect when page loads - *** FIXED ***
window.addEventListener('load', function() {
    // FIX: Changed selector from '.hero-content h1' to '.header-info h1'
    const titleElement = document.querySelector('.header-info h1');

    // Add a check to prevent errors
    if (titleElement) {
        const originalText = titleElement.textContent;
        // The typing effect might be too fast for a long title, so let's just make it fade in instead.
        // If you still want the typing effect, uncomment the line below.
        // typeWriter(titleElement, originalText, 50);

        // A simple fade-in effect can be cleaner:
        titleElement.style.opacity = '0';
        setTimeout(() => {
            titleElement.style.transition = 'opacity 0.8s ease';
            titleElement.style.opacity = '1';
        }, 100);
    }
});