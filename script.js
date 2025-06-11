document.addEventListener("DOMContentLoaded", () => {
    // Footer: current date
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const footerParagraph = document.querySelector("footer p");
    if (footerParagraph) {
        footerParagraph.innerHTML += ` - ${formattedDate}`;
    }

    // ScrollReveal: advanced animation per section
    if (typeof ScrollReveal !== "undefined") {
        ScrollReveal().reveal('header', {
            origin: 'top',
            distance: '60px',
            duration: 1000,
            delay: 100,
            opacity: 0,
            reset: true
        });

        ScrollReveal().reveal('nav', {
            origin: 'left',
            distance: '80px',
            duration: 1000,
            delay: 300,
            opacity: 0,
            reset: true
        });

        ScrollReveal().reveal('#projects h2', {
            origin: 'top',
            distance: '50px',
            duration: 800,
            delay: 300,
            reset: true
        });

        ScrollReveal().reveal('.project', {
            interval: 200,
            origin: 'bottom',
            distance: '40px',
            duration: 800,
            opacity: 0,
            reset: true
        });

        ScrollReveal().reveal('#about h2, #about p', {
            origin: 'right',
            distance: '60px',
            duration: 900,
            delay: 200,
            reset: true
        });

        ScrollReveal().reveal('footer', {
            origin: 'bottom',
            distance: '40px',
            duration: 1000,
            delay: 500,
            reset: true
        });
    }

    // Typed.js animated subtitle
    if (typeof Typed !== "undefined") {
        new Typed('.typed', {
            strings: ['Web Developer', 'Creative Thinker', 'Problem Solver'],
            typeSpeed: 60,
            backSpeed: 60,
            backDelay: 1200,
            loop: true,
            showCursor: true,
            cursorChar: '|'
        });
    }
});
