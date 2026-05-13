document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const modals = document.querySelectorAll('.modal-overlay');
    const closeButtons = document.querySelectorAll('.close-modal');
    const contactBtns = document.querySelectorAll('[data-contact-trigger]');
    const nextSectionButtons = document.querySelectorAll('.next-section-btn');

    // --- Modal Logic ---
    function openModal(modalId) {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
            activeModal.classList.remove('active');
            activeModal.setAttribute('aria-hidden', 'true');
        }

        const targetModal = document.getElementById(modalId);
        if (targetModal) {
            // "Horizon Time Jump" effect: quick fade and slide
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
        btn.addEventListener('click', (e) => {
            const nextModalId = btn.getAttribute('data-next');
            if (nextModalId) {
                openModal(nextModalId);
            }
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
            const response = await fetch('projects.json');
            if (!response.ok) throw new Error('Failed to load projects.json');
            const data = await response.json();

            if (data.projects) {
                renderProjects(data.projects);
            }
        } catch (error) {
            console.error('Error loading content:', error);
            // Fallback for static projects already in HTML if any
        }
    }

    function parseMarkdown(text) {
        if (!text) return '';
        // Bold: **text**
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Links: [text](url)
        text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
        return text;
    }

    function renderProjects(projects) {
        const grid = document.querySelector('.project-grid');
        if (!grid) return;

        grid.innerHTML = projects.map(project => {
            const mediaHtml = renderMedia(project);
            const tagsHtml = project.tags.map(tag => `<span>${tag}</span>`).join('');

            // Handle multiple links
            let linksHtml = '';
            if (project.links) {
                linksHtml = project.links.map(link =>
                    `<a href="${link.url}" target="_blank" class="tech-specs-link">${link.text || link.label} →</a>`
                ).join('');
            }

            // Handle details (usually an array in projects.json)
            const detailsHtml = Array.isArray(project.details)
                ? project.details.map(d => `<p>${parseMarkdown(d)}</p>`).join('')
                : `<p>${parseMarkdown(project.details || '')}</p>`;

            return `
                <div class="project-card" data-tier="${project.tier}">
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
            const imgStyle = project.media.style === 'icon'
                ? 'width: 80px; height: 80px; object-fit: contain; margin: 0 auto 10px; display: block;'
                : 'width: 100%; height: 100%; object-fit: cover; border-radius: 8px;';
            return `
                <div class="project-media">
                    <img src="${src}" alt="${project.title}" style="${imgStyle}">
                </div>
            `;
        }

        if (type === 'gallery') {
            const images = items.map(img => {
                const style = img.style === 'icon'
                    ? 'width: 60px; height: 60px; object-fit: contain; flex-shrink: 0;'
                    : 'height: 150px; width: auto; border-radius: 6px; flex-shrink: 0;';
                return `<img src="${img.src}" alt="Gallery" style="${style}">`;
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

    // --- Mission Control Hidden Access ---
    let clickCount = 0;
    let lastClickTime = 0;
    const missionTrigger = document.getElementById('mission-control-trigger');
    if (missionTrigger) {
        missionTrigger.addEventListener('click', () => {
            const now = Date.now();
            if (now - lastClickTime < 500) {
                clickCount++;
            } else {
                clickCount = 1;
            }
            lastClickTime = now;

            if (clickCount === 3) {
                const pw = prompt('// ENTER SOVEREIGN KEY:');
                if (pw !== 'nexus2026') {
                    alert('ACCESS_DENIED');
                    clickCount = 0;
                    return;
                }
                
                // Triple tap success - animate and redirect
                missionTrigger.style.transform = 'scale(1.5) rotate(45deg)';
                missionTrigger.style.color = 'var(--primary-accent)';
                setTimeout(() => {
                    window.location.href = 'https://victorious-coast-049c93d1e.7.azurestaticapps.net';
                }, 400);
            }
        });
    }

    // --- Global Link Protection ---
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href.includes('victorious-coast-049c93d1e.7.azurestaticapps.net')) {
            e.preventDefault();
            const pw = prompt('// ENTER SOVEREIGN KEY:');
            if (pw === 'nexus2026') {
                window.location.href = link.href;
            } else {
                alert('ACCESS_DENIED');
            }
        }
    });

    // --- Sovereign Config Injection ---
    async function loadSovereignConfig() {
        try {
            const response = await fetch('site_config.json');
            const config = await response.json();
            
            // Inject SEO Metadata
            document.title = config.siteName;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.setAttribute('content', config.description);
            
            const metaKeywords = document.querySelector('meta[name="keywords"]');
            if (metaKeywords) metaKeywords.setAttribute('content', config.keywords);
            
            // Update Schema URL
            const schemaScript = document.querySelector('script[type="application/ld+json"]');
            if (schemaScript) {
                const schema = JSON.parse(schemaScript.textContent);
                schema.url = config.baseUrl;
                schema.name = config.author;
                schemaScript.textContent = JSON.stringify(schema, null, 2);
            }
            
            // Update Canonical
            let canonical = document.querySelector('link[rel="canonical"]');
            if (!canonical) {
                canonical = document.createElement('link');
                canonical.setAttribute('rel', 'canonical');
                document.head.appendChild(canonical);
            }
            canonical.setAttribute('href', config.baseUrl);
            
            console.log('// SOVEREIGN_CONFIG_LOADED:', config.siteName);
        } catch (err) {
            console.warn('// SOVEREIGN_CONFIG_ERROR: Falling back to defaults.', err);
        }
    }

    // --- Starfield Generation ---
    function initStarfield() {
        const starfield = document.getElementById('starfield');
        if (!starfield) return;
        
        const count = 100;
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            const size = Math.random() * 2 + 1;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.animationDelay = `${Math.random() * 5}s`;
            star.style.animationDuration = `${Math.random() * 3 + 2}s`;
            starfield.appendChild(star);
        }
    }

    loadSovereignConfig();
    initStarfield();
    loadContent();
});
