document.addEventListener("DOMContentLoaded", function() {
    // Display the current date in the footer
    const currentDate = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = currentDate.toLocaleDateString('en-US', options);
    document.querySelector("footer p").textContent += ` ${formattedDate}`;

    // Scroll reveal animation
    ScrollReveal().reveal('#projects, #about', {
        distance: '60px',
        duration: 2500,
        delay: 400
    });

    // Typed.js animation for header
    new Typed('.typed', {
        strings: ['Web Developer', 'Creative Thinker', 'Problem Solver'],
        typeSpeed: 60,
        backSpeed: 60,
        loop: true
    });
});
