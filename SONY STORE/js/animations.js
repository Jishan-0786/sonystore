/**
 * SONY STORE - Master Animation & Interactive Engine
 * Controls scroll reveals, 3D card tilt, stats counter animation, brand timeline progress,
 * testimonial carousel (with swipe), newsletter interaction, and accessibility overrides.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. PAGE FADE-IN EFFECT
    if (!prefersReducedMotion) {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => {
            document.body.style.opacity = '1';
        }, 50);
    }

    // 2. SCROLL REVEAL OBSERVER WITH STAGGERING
    const observerOptions = {
        threshold: 0.12,
        rootMargin: '0px 0px -30px 0px'
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const staggerDelay = el.getAttribute('data-stagger-delay') || '0s';
                
                if (!prefersReducedMotion) {
                    el.style.transitionDelay = staggerDelay;
                }
                
                el.classList.add('revealed');

                // Trigger Stats Counter if this is a stat card
                if (el.classList.contains('stat-card')) {
                    animateStatCard(el);
                }

                observer.unobserve(el);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal, .animated-card, .watch-card, .feature-card, .section-header');
    
    revealElements.forEach((el) => {
        if (!el.hasAttribute('data-stagger-delay')) {
            const parentGrid = el.closest('.why-grid, .stats-grid, .mission-vision-grid, .products-grid, .promise-stages-container, .timeline-container');
            if (parentGrid) {
                const siblings = Array.from(parentGrid.children).filter(child => 
                    child.classList.contains('reveal') || 
                    child.classList.contains('animated-card') || 
                    child.classList.contains('watch-card')
                );
                const indexInGrid = siblings.indexOf(el);
                if (indexInGrid >= 0) {
                    el.setAttribute('data-stagger-delay', `${(indexInGrid * 0.15).toFixed(2)}s`);
                }
            }
        }

        if (!prefersReducedMotion) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(35px)';
            el.style.transition = 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.4s ease, filter 0.4s ease';
        }
        revealObserver.observe(el);
    });

    // Helper CSS injection for revealed state & reduced motion
    const style = document.createElement('style');
    style.innerHTML = `
        .revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        @media (prefers-reduced-motion: reduce) {
            .reveal, .animated-card, .watch-card, .feature-card, .section-header, .revealed, .timeline-line-progress {
                opacity: 1 !important;
                transform: none !important;
                transition: none !important;
                animation: none !important;
            }
        }
    `;
    document.head.appendChild(style);

    // 3. STATS NUMBER COUNTER ANIMATION
    function animateStatCard(card) {
        const numberEl = card.querySelector('.stat-number');
        if (!numberEl || numberEl.getAttribute('data-animated') === 'true') return;
        
        numberEl.setAttribute('data-animated', 'true');
        const target = parseInt(numberEl.getAttribute('data-target'), 10);
        if (isNaN(target)) return;

        if (prefersReducedMotion) {
            numberEl.textContent = target;
            return;
        }

        const duration = 1800; // ms
        const startTime = performance.now();

        function updateCounter(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.floor(easeProgress * target);

            numberEl.textContent = currentVal;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                numberEl.textContent = target;
            }
        }

        requestAnimationFrame(updateCounter);
    }

    // 4. INTERACTIVE WHY CARDS SIBLING EFFECT
    const whyCards = document.querySelectorAll('.interactive-card');
    const whyGrid = document.querySelector('.interactive-why-grid');

    if (whyGrid && whyCards.length > 0) {
        whyCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                whyCards.forEach(c => {
                    if (c !== card) {
                        c.classList.add('sibling-dimmed');
                    }
                });
            });

            card.addEventListener('mouseleave', () => {
                whyCards.forEach(c => c.classList.remove('sibling-dimmed'));
            });

            // Touch support for mobile tap toggle
            card.addEventListener('click', () => {
                const isActive = card.classList.contains('mobile-expanded');
                whyCards.forEach(c => c.classList.remove('mobile-expanded', 'sibling-dimmed'));
                if (!isActive) {
                    card.classList.add('mobile-expanded');
                }
            });
        });
    }

    // 5. BRAND TIMELINE SCROLL PROGRESS LINE
    const timelineContainer = document.querySelector('.timeline-container');
    const timelineProgress = document.getElementById('timelineProgress');

    if (timelineContainer && timelineProgress && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const rect = timelineContainer.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            if (rect.top < windowHeight && rect.bottom > 0) {
                const totalHeight = rect.height;
                const visiblePart = windowHeight - rect.top;
                let percentage = (visiblePart / (totalHeight + windowHeight / 2)) * 100;
                percentage = Math.max(0, Math.min(100, percentage));
                timelineProgress.style.height = `${percentage}%`;
            }
        });
    }

    // 6. TESTIMONIAL CAROUSEL ENGINE (AUTO-SLIDE, BUTTONS, SWIPE)
    const track = document.getElementById('testimonialTrack');
    const prevBtn = document.getElementById('prevReviewBtn');
    const nextBtn = document.getElementById('nextReviewBtn');
    const dots = document.querySelectorAll('.carousel-dots .dot');

    if (track && dots.length > 0) {
        let currentIndex = 0;
        const totalSlides = dots.length;
        let autoSlideTimer = null;

        function updateCarousel(index) {
            currentIndex = (index + totalSlides) % totalSlides;
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
            
            dots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx === currentIndex);
            });
        }

        function nextSlide() {
            updateCarousel(currentIndex + 1);
        }

        function prevSlide() {
            updateCarousel(currentIndex - 1);
        }

        if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetTimer(); });
        if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetTimer(); });

        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'), 10);
                updateCarousel(idx);
                resetTimer();
            });
        });

        function startTimer() {
            if (!autoSlideTimer && !prefersReducedMotion) {
                autoSlideTimer = setInterval(nextSlide, 5000);
            }
        }

        function resetTimer() {
            if (autoSlideTimer) {
                clearInterval(autoSlideTimer);
                autoSlideTimer = null;
            }
            startTimer();
        }

        // Pause on hover
        const carouselWrapper = document.querySelector('.testimonial-carousel-wrapper');
        if (carouselWrapper) {
            carouselWrapper.addEventListener('mouseenter', () => clearInterval(autoSlideTimer));
            carouselWrapper.addEventListener('mouseleave', startTimer);
        }

        // Mobile Touch Swipe Support
        let touchStartX = 0;
        let touchEndX = 0;

        track.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        track.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 50) {
                nextSlide();
                resetTimer();
            } else if (touchEndX - touchStartX > 50) {
                prevSlide();
                resetTimer();
            }
        }, { passive: true });

        startTimer();
    }

    // 7. NEWSLETTER FORM SUBMISSION INTERACTION
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('newsletterEmail');
            if (emailInput && emailInput.value) {
                if (typeof showToast === 'function') {
                    showToast('Welcome to the SONY STORE Family! 👑', '✨');
                } else {
                    alert('Thank you for subscribing to SONY STORE!');
                }
                emailInput.value = '';
            }
        });
    }

    // 8. 3D CARD HOVER TILT ENGINE (DESKTOP & FINE POINTER ONLY)
    const isFinePointer = window.matchMedia('(pointer: fine)').matches && window.innerWidth > 768;
    
    if (isFinePointer && !prefersReducedMotion) {
        document.addEventListener('mousemove', (e) => {
            const tiltableCards = document.querySelectorAll('.animated-card, .watch-card, .why-card, .mv-card, .hero-typography-card, .stat-card, .timeline-item, .promise-stage-card');
            
            tiltableCards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    const maxRotation = card.classList.contains('hero-typography-card') ? 2 : 3.5;
                    const rotateX = ((y - centerY) / centerY) * -maxRotation;
                    const rotateY = ((x - centerX) / centerX) * maxRotation;

                    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
                } else {
                    card.style.transform = '';
                }
            });
        });
    }
});
