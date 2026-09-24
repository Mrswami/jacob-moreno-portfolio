document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const modals = document.querySelectorAll('.modal-overlay');
    const closeButtons = document.querySelectorAll('.close-modal');
    const contactBtns = document.querySelectorAll('[data-contact-trigger]');
    const nextSectionButtons = document.querySelectorAll('.next-section-btn');
    const prevSectionButtons = document.querySelectorAll('.prev-section-btn');

    // --- Modal Logic ---
    function openModal(modalId) {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
            activeModal.classList.remove('active');
            activeModal.setAttribute('aria-hidden', 'true');
        }

        const targetModal = document.getElementById(modalId);
        if (targetModal) {
            targetModal.style.transition = 'opacity 0.4s var(--fluid-motion), transform 0.4s var(--fluid-motion)';
            targetModal.classList.add('active');
            targetModal.setAttribute('aria-hidden', 'false');

            const focusable = targetModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length > 0) focusable[0].focus();
        }
    }

    function closeModal(modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            if (target) openModal(target);
        });
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) closeModal(modal);
        });
    });

    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    contactBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            openModal('modal-contact');
        });
    });

    nextSectionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const nextModalId = btn.getAttribute('data-next');
            if (nextModalId) openModal(nextModalId);
        });
    });

    prevSectionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const prevModalId = btn.getAttribute('data-prev');
            if (prevModalId) openModal(prevModalId);
        });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal) closeModal(activeModal);
        }
    });

    // --- Dynamic Content Rendering (Projects) ---
    async function loadContent() {
        try {
            const response = await fetch('projects.json?v=' + Date.now());
            if (!response.ok) throw new Error('Failed to load projects.json');
            const data = await response.json();

            if (data.projects) {
                const visibleProjects = data.projects.filter(p => p.visible !== false);
                renderProjects(visibleProjects);
            }
        } catch (error) {
            console.error('Error loading content:', error);
        }
    }

    function parseMarkdown(text) {
        if (!text) return '';
        // Bold: **text**
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Links: [text](url)
        text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        return text;
    }

    function renderProjects(projects) {
        const grid = document.querySelector('.project-grid');
        if (!grid) return;

        grid.innerHTML = projects.map(project => {
            const mediaHtml = renderMedia(project);
            const tagsHtml = project.tags ? project.tags.map(tag => `<span>${tag}</span>`).join('') : '';

            // Handle multiple links
            let linksHtml = '';
            if (project.links) {
                linksHtml = project.links.map(link => {
                    const rawLabel = link.text || link.label || 'View Project';
                    const cleanLabel = rawLabel.replace(/\s*→+\s*$/, '').trim();
                    return `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="tech-specs-link">${cleanLabel} →</a>`;
                }).join('');
            }

            // Handle details
            const detailsHtml = Array.isArray(project.details)
                ? project.details.map(d => `<p>${parseMarkdown(d)}</p>`).join('')
                : `<p>${parseMarkdown(project.details || '')}</p>`;

            return `
                <div class="project-card" data-tier="${project.tier || 'standard'}">
                    <div class="project-header">
                        <h3>${project.title}</h3>
                        ${project.subtitle ? `<span class="project-subtitle">${project.subtitle}</span>` : ''}
                    </div>
                    ${mediaHtml}
                    <div class="project-details">
                        ${detailsHtml}
                    </div>
                    <div class="tags">
                        ${tagsHtml}
                    </div>
                    <div class="project-links">
                        ${linksHtml}
                    </div>
                </div>
            `;
        }).join('');

        initVideoHandlers();
        initProjectCardTilt();
    }

    function renderMedia(project) {
        if (!project.media) return '';
        const { type, src, items, poster } = project.media;

        if (type === 'video') {
            return `
                <div class="project-media hover-video-container">
                    <video loop muted playsinline class="project-video" poster="${poster || ''}"
                        style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                        <source src="${src}" type="video/mp4">
                    </video>
                </div>
            `;
        }

        if (type === 'image') {
            const isIcon = project.media.style === 'icon';
            const imgStyle = isIcon
                ? 'width: 76px; height: 76px; object-fit: contain; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));'
                : 'width: 100%; height: 100%; object-fit: cover; border-radius: 8px;';
            const mobileSrc = project.media.mobile_src;

            if (mobileSrc) {
                return `
                    <div class="project-media ${isIcon ? 'icon-mode' : ''}">
                        <picture style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                            <source media="(max-width: 767px)" srcset="${mobileSrc}">
                            <img src="${src}" alt="${project.title}" style="${imgStyle}">
                        </picture>
                    </div>
                `;
            }

            return `
                <div class="project-media ${isIcon ? 'icon-mode' : ''}">
                    <img src="${src}" alt="${project.title}" style="${imgStyle}">
                </div>
            `;
        }

        if (type === 'gallery' && items) {
            const images = items.map(img => {
                const style = img.style === 'icon'
                    ? 'width: 60px; height: 60px; object-fit: contain; flex-shrink: 0;'
                    : 'height: 120px; width: auto; border-radius: 6px; flex-shrink: 0;';
                return `<img src="${img.src}" alt="Gallery item" style="${style}">`;
            }).join('');
            return `
                <div class="project-media" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px;">
                    ${images}
                </div>
            `;
        }
        return '';
    }

    function initVideoHandlers() {
        const containers = document.querySelectorAll('.hover-video-container');
        containers.forEach(container => {
            const video = container.querySelector('video');
            if (!video) return;

            const card = container.closest('.project-card');
            if (!card) return;
            card.addEventListener('mouseenter', () => {
                video.play().catch(() => { });
            });
            card.addEventListener('mouseleave', () => {
                video.pause();
            });
        });
    }

    // --- Form Handling ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const status = document.getElementById('form-status');
            const button = contactForm.querySelector('button');
            const data = new FormData(contactForm);

            try {
                button.disabled = true;
                button.innerText = 'Sending...';

                const response = await fetch(contactForm.action, {
                    method: contactForm.method,
                    body: data,
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    status.innerHTML = "SYSTEM_SYNC_SUCCESS: Message transmitted.";
                    status.style.color = "var(--primary-accent)";
                    contactForm.reset();
                } else {
                    status.innerHTML = "SYSTEM_ERROR: Transmission failed.";
                }
            } catch (error) {
                status.innerHTML = "Oops! Connection error.";
            } finally {
                button.disabled = false;
                button.innerText = 'Send Message';
            }
        });
    }

    // --- Mission Control Admin Access ---
    const missionTrigger = document.getElementById('mission-control-trigger');
    if (missionTrigger) {
        missionTrigger.addEventListener('click', () => {
            const pw = prompt('// ENTER SOVEREIGN KEY FOR ADMIN ACCESS:');
            if (pw !== '3141') {
                alert('ACCESS_DENIED: Invalid Sovereign Key');
                return;
            }

            missionTrigger.style.transform = 'scale(1.1)';
            missionTrigger.style.color = 'var(--primary-accent)';
            setTimeout(() => {
                window.location.href = 'https://victorious-coast-049c93d1e.7.azurestaticapps.net';
            }, 400);
        });
    }

    // --- Global Link Protection ---
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href.includes('victorious-coast-049c93d1e.7.azurestaticapps.net')) {
            e.preventDefault();
            const pw = prompt('// ENTER SOVEREIGN KEY FOR ADMIN ACCESS:');
            if (pw === '3141') {
                window.location.href = link.href;
            } else {
                alert('ACCESS_DENIED: Invalid Sovereign Key');
            }
        }
    });

    // --- Sovereign Config Injection ---
    async function loadSovereignConfig() {
        try {
            const response = await fetch('site_config.json');
            if (!response.ok) return;
            const config = await response.json();

            // Inject SEO Metadata
            if (config.siteName) document.title = config.siteName;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc && config.description) metaDesc.setAttribute('content', config.description);

            const metaKeywords = document.querySelector('meta[name="keywords"]');
            if (metaKeywords && config.keywords) metaKeywords.setAttribute('content', config.keywords);

            const schemaScript = document.querySelector('script[type="application/ld+json"]');
            if (schemaScript && config.baseUrl) {
                const schema = JSON.parse(schemaScript.textContent);
                schema.url = config.baseUrl;
                schema.name = config.author || schema.name;
                schemaScript.textContent = JSON.stringify(schema, null, 2);
            }
        } catch (err) {
            console.warn('// SOVEREIGN_CONFIG_ERROR: Falling back to defaults.', err);
        }
    }

    // --- Interactive Starfield with Parallax Response ---
    function initStarfield() {
        const starfield = document.getElementById('starfield');
        if (!starfield) return;

        starfield.innerHTML = '';
        const count = 120;
        const stars = [];

        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            const size = Math.random() * 2 + 1;
            const depth = Math.random() * 0.8 + 0.2; // Parallax depth factor
            const baseX = Math.random() * 100;
            const baseY = Math.random() * 100;

            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.left = `${baseX}%`;
            star.style.top = `${baseY}%`;
            star.style.animationDelay = `${Math.random() * 5}s`;
            star.style.animationDuration = `${Math.random() * 3 + 2}s`;
            star.style.opacity = (Math.random() * 0.6 + 0.2).toString();

            starfield.appendChild(star);
            stars.push({ el: star, depth, baseX, baseY });
        }

        // Mouse Parallax reaction
        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;

        window.addEventListener('mousemove', (e) => {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            targetX = (e.clientX - centerX) / centerX;
            targetY = (e.clientY - centerY) / centerY;
        }, { passive: true });

        function updateParallax() {
            currentX += (targetX - currentX) * 0.05;
            currentY += (targetY - currentY) * 0.05;

            stars.forEach(s => {
                const shiftX = currentX * 15 * s.depth;
                const shiftY = currentY * 15 * s.depth;
                s.el.style.transform = `translate3d(${shiftX}px, ${shiftY}px, 0)`;
            });

            requestAnimationFrame(updateParallax);
        }
        requestAnimationFrame(updateParallax);
    }

    // --- Interactive Profile & Logo Color Glow Effects ---
    function initLogoColorEffects() {
        const profileContainer = document.querySelector('.profile-container');
        const waveBg = document.querySelector('.wave-bg');
        const profilePhoto = document.querySelector('.profile-photo');
        if (!profileContainer || !waveBg) return;

        // Interactive mouse reactive lighting aura
        profileContainer.addEventListener('mousemove', (e) => {
            const rect = profileContainer.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const rotateX = -(y / rect.height) * 16;
            const rotateY = (x / rect.width) * 16;

            if (profilePhoto) {
                profilePhoto.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
                profilePhoto.style.boxShadow = `0 10px 40px rgba(224, 187, 107, 0.4), 0 0 50px rgba(0, 240, 255, 0.3)`;
                profilePhoto.style.borderColor = `rgba(0, 240, 255, 0.8)`;
            }

            const angle = Math.atan2(y, x) * (180 / Math.PI);
            waveBg.style.transform = `translate(-50%, -50%) rotate(${angle}deg) scale(1.2)`;
            waveBg.style.opacity = '0.35';
        });

        profileContainer.addEventListener('mouseleave', () => {
            if (profilePhoto) {
                profilePhoto.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)';
                profilePhoto.style.boxShadow = '0 0 60px rgba(224, 187, 107, 0.15)';
                profilePhoto.style.borderColor = 'rgba(224, 187, 107, 0.4)';
            }
            waveBg.style.transform = 'translate(-50%, -50%) scale(1)';
            waveBg.style.opacity = '0.15';
        });
    }

    // --- Cyberpunk / Matrix Text Decryption on Nav Items ---
    function initTextScramble() {
        // Skip on touch/mobile devices to protect native tap responsiveness
        if (window.matchMedia('(pointer: coarse)').matches) return;

        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_<>[]!@#";
        navItems.forEach(item => {
            const originalText = item.getAttribute('data-text') || item.innerText.trim();
            let interval = null;

            item.addEventListener('mouseenter', () => {
                let iteration = 0;
                clearInterval(interval);

                interval = setInterval(() => {
                    item.innerText = originalText
                        .split("")
                        .map((char, index) => {
                            if (char === " ") return " ";
                            if (index < iteration) {
                                return originalText[index];
                            }
                            return letters[Math.floor(Math.random() * letters.length)];
                        })
                        .join("");

                    if (iteration >= originalText.length) {
                        clearInterval(interval);
                        item.innerText = originalText;
                    }

                    iteration += 1 / 2;
                }, 30);
            });

            const resetText = () => {
                clearInterval(interval);
                item.innerText = originalText;
            };

            item.addEventListener('mouseleave', resetText);
            item.addEventListener('pointerdown', resetText);
        });
    }

    // --- 3D Card Tilt with Specular Glare ---
    function initCardTilt() {
        navItems.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = -((y - centerY) / centerY) * 10;
                const rotateY = ((x - centerX) / centerX) * 10;

                card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)';
            });
        });
    }

    function initProjectCardTilt() {
        const cards = document.querySelectorAll('.project-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = -((y - centerY) / centerY) * 5;
                const rotateY = ((x - centerX) / centerX) * 5;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
            });
        });
    }

    // Initialize all dynamic components
    loadSovereignConfig();
    initStarfield();
    initLogoColorEffects();
    initTextScramble();
    initCardTilt();
    loadContent();
});
