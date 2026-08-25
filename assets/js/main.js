(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* Footer year */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------------------------------------------------------------------
     Hero film — scroll-scrubbed video, Apple product-page style.
     The hero section pins for several viewport-heights of scroll; video
     currentTime glides toward scroll progress (eased, not hard-jumped —
     that's what keeps it feeling premium instead of jittery), and the hero
     copy reveals in stages across that same pinned range. Motion-safe/GSAP
     only — with neither, the section is just a normal single-viewport hero
     showing the poster frame, copy visible immediately (nothing here is
     hidden by default in CSS). Scroll distance and easing are tuned
     separately for mobile vs. desktop via matchMedia.
  --------------------------------------------------------------------- */
  const heroScrubSection = document.querySelector("[data-hero-scrub-section]");
  if (heroScrubSection && window.gsap && window.ScrollTrigger && !prefersReducedMotion) {
    const video = document.getElementById("hero-scrub-video");
    gsap.registerPlugin(ScrollTrigger);
    // Mobile browsers resize the viewport as their address bar shows/hides
    // on scroll; without this, that resize re-triggers ScrollTrigger's
    // layout math mid-scroll and can leave a stray gap above the pin.
    ScrollTrigger.config({ ignoreMobileResize: true });

    // iOS Safari won't allow programmatic seeking until the video has
    // been "primed" with a play/pause cycle.
    const primeVideo = () => {
      const p = video.play();
      if (p && typeof p.then === "function") {
        p.then(() => video.pause()).catch(() => {});
      }
    };
    if (video.readyState > 0) primeVideo();
    else video.addEventListener("loadedmetadata", primeVideo, { once: true });

    // The eyebrow + heading play once on load and stay visible — the hero
    // should read immediately, especially on mobile, rather than leaving a
    // screenful of video with no headline until the visitor starts
    // scrolling. Everything else still reveals progressively with the scrub.
    gsap.timeline({ delay: 0.2 })
      .from("[data-hs='eyebrow']", { opacity: 0, y: 14, duration: 0.7, ease: "power2.out" })
      .from("[data-hs='heading']", { opacity: 0, y: 22, duration: 0.9, ease: "power3.out" }, "-=0.5");

    ScrollTrigger.matchMedia({
      // Desktop / tablet: long, slow, luxurious scrub.
      "(min-width: 768px)": function () {
        setupHeroScrub({ end: "+=850%", videoEase: 1.6, contentScrub: 2 });
      },
      // Phones: shorter runway so it doesn't dominate the whole visit,
      // but still eased and glide-y rather than a hard jump-cut per swipe.
      "(max-width: 767px)": function () {
        setupHeroScrub({ end: "+=420%", videoEase: 1.1, contentScrub: 1.3 });
      },
    });

    function setupHeroScrub({ end, videoEase, contentScrub }) {
      // Smoothly glides currentTime toward its target instead of snapping —
      // this is what makes the scrub feel like it has weight/inertia. A
      // gentle, long deceleration curve reads as far more premium than a
      // linear or quick ease.
      const scrubVideoTime = gsap.quickTo(video, "currentTime", {
        duration: videoEase,
        ease: "power3.out",
      });

      const tl = gsap.timeline();
      tl.to("[data-hs='scrollcue']", { opacity: 0, duration: 0.04 }, 0.01)
        .from("[data-hs='sub']", { opacity: 0, y: 16, duration: 0.12, ease: "power2.out" }, 0.1)
        .from("[data-hs='ctas']", { opacity: 0, y: 16, duration: 0.12, ease: "power2.out" }, 0.32)
        .from("[data-hs-stat]", { opacity: 0, y: 16, duration: 0.1, ease: "power2.out", stagger: 0.045 }, 0.42);

      const st = ScrollTrigger.create({
        trigger: heroScrubSection,
        start: "top top",
        end,
        pin: true,
        scrub: contentScrub,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        animation: tl,
        onUpdate: (self) => {
          if (video.duration) {
            scrubVideoTime(self.progress * video.duration);
          }
        },
      });

      return () => st.kill();
    }
  }

  /* ---------------------------------------------------------------------
     Download modal — Brochure / Floor Plans requests.
     Same front-end-only pattern: captures an email, then reveals the
     real download link. Ready to be wired to a CRM/email service later.
     Keyboard support: Escape closes, Tab is trapped inside while open,
     and focus returns to whichever button opened it.
  --------------------------------------------------------------------- */
  let lastModalTrigger = null;

  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
  }

  document.querySelectorAll("[data-download-trigger]").forEach((trigger) => {
    const key = trigger.dataset.downloadTrigger;
    const modal = document.querySelector(`[data-download-modal="${key}"]`);
    if (!modal) return;
    trigger.addEventListener("click", () => {
      lastModalTrigger = trigger;
      modal.classList.add("is-open");
      modal.querySelector("input")?.focus();
      document.body.classList.add("overflow-hidden");
    });
  });
  document.querySelectorAll("[data-download-modal]").forEach((modal) => {
    const close = () => {
      modal.classList.remove("is-open");
      document.body.classList.remove("overflow-hidden");
      lastModalTrigger?.focus();
    };
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    modal.querySelectorAll("[data-download-close]").forEach((btn) => btn.addEventListener("click", close));

    modal.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable(modal);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    const form = modal.querySelector("[data-download-form]");
    const step1 = modal.querySelector("[data-download-step='form']");
    const step2 = modal.querySelector("[data-download-step='ready']");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = form.querySelector("input[type='email']")?.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
      step1?.classList.add("hidden");
      step2?.classList.remove("hidden");
      modal.querySelector("[data-download-step='ready'] a")?.focus();
    });
  });

  /* Mobile nav toggle */
  const navToggle = document.querySelector("[data-nav-toggle]");
  const mobileNav = document.querySelector("[data-mobile-nav]");
  if (navToggle && mobileNav) {
    const closeMobileNav = () => {
      mobileNav.classList.add("hidden");
      mobileNav.classList.remove("flex");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.classList.remove("is-open");
      document.body.classList.remove("overflow-hidden");
    };
    navToggle.addEventListener("click", () => {
      const isOpen = mobileNav.classList.toggle("flex");
      mobileNav.classList.toggle("hidden");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      navToggle.classList.toggle("is-open", isOpen);
      document.body.classList.toggle("overflow-hidden", isOpen);
    });
    mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMobileNav));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
        closeMobileNav();
        navToggle.focus();
      }
    });
  }

  /* Header elevation on scroll */
  const header = document.querySelector("[data-site-header]");
  if (header) {
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------------
     Custom cursor — a small dot + trailing ring that expands over
     interactive elements. Desktop, fine-pointer, motion-safe only; the
     system cursor is left alone everywhere else.
  --------------------------------------------------------------------- */
  if (hasFinePointer && !prefersReducedMotion && window.gsap) {
    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.append(dot, ring);
    document.documentElement.classList.add("has-custom-cursor");

    const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });

    window.addEventListener("pointermove", (e) => {
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    });

    const interactiveSelector = 'a, button, input, textarea, select, [data-magnetic], .portfolio-tile, .card';
    document.addEventListener("pointerover", (e) => {
      if (e.target.closest?.(interactiveSelector)) {
        dot.classList.add("is-active");
        ring.classList.add("is-active");
      }
    });
    document.addEventListener("pointerout", (e) => {
      if (e.target.closest?.(interactiveSelector) && !e.relatedTarget?.closest?.(interactiveSelector)) {
        dot.classList.remove("is-active");
        ring.classList.remove("is-active");
      }
    });
    document.addEventListener("pointerleave", () => {
      gsap.to([dot, ring], { opacity: 0, duration: 0.2 });
    });
    document.addEventListener("pointerenter", () => {
      gsap.to([dot, ring], { opacity: 1, duration: 0.2 });
    });
  }

  /* Sliding nav indicator */
  const navGroup = document.querySelector("[data-nav]");
  if (navGroup) {
    const indicator = navGroup.querySelector("[data-nav-indicator]");
    const links = Array.from(navGroup.querySelectorAll("a"));
    const activeLink = navGroup.querySelector("a.is-active");

    const moveIndicatorTo = (link, animate) => {
      if (!link || !indicator) return;
      const groupRect = navGroup.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const left = linkRect.left - groupRect.left;
      if (animate && window.gsap && !prefersReducedMotion) {
        gsap.to(indicator, { left, width: linkRect.width, opacity: 1, duration: 0.5, ease: "back.out(1.7)" });
      } else {
        indicator.style.left = `${left}px`;
        indicator.style.width = `${linkRect.width}px`;
        indicator.style.opacity = 1;
      }
    };

    if (activeLink) {
      requestAnimationFrame(() => moveIndicatorTo(activeLink, false));
    }
    if (hasFinePointer) {
      links.forEach((link) => {
        link.addEventListener("mouseenter", () => moveIndicatorTo(link, true));
      });
      navGroup.addEventListener("mouseleave", () => moveIndicatorTo(activeLink, true));
    }
    window.addEventListener("resize", () => moveIndicatorTo(navGroup.querySelector("a:hover") || activeLink, false));
  }

  /* Scroll reveal via GSAP ScrollTrigger, with graceful no-JS/no-GSAP fallback */
  if (window.gsap && window.ScrollTrigger && !prefersReducedMotion) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray("[data-reveal]").forEach((el, i) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          delay: (i % 4) * 0.06,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }
      );
    });

    gsap.utils.toArray("[data-split]").forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words
        .map((w) => `<span class="line-mask"><span class="line-mask__inner">${w}&nbsp;</span></span>`)
        .join("");
      gsap.to(el.querySelectorAll(".line-mask__inner"), {
        y: 0,
        duration: 0.9,
        ease: "power4.out",
        stagger: 0.05,
        delay: 0.15,
      });
    });

    gsap.utils.toArray("[data-count]").forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = (el.dataset.count.split(".")[1] || "").length;
      const obj = { val: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        once: true,
        onEnter: () => {
          gsap.to(obj, {
            val: target,
            duration: 1.6,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = obj.val.toFixed(decimals);
            },
          });
        },
      });
    });

    gsap.utils.toArray("[data-image-reveal]").forEach((el) => {
      gsap.fromTo(
        el,
        { clipPath: "inset(100% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.1,
          ease: "power4.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }
      );
    });

    gsap.utils.toArray("[data-parallax]").forEach((el) => {
      gsap.to(el, {
        yPercent: parseFloat(el.dataset.parallax) || 10,
        ease: "none",
        scrollTrigger: { trigger: el.closest("[data-parallax-wrap]") || el, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
  } else {
    document.querySelectorAll("[data-reveal]").forEach((el) => (el.style.opacity = 1));
    document.querySelectorAll("[data-count]").forEach((el) => (el.textContent = el.dataset.count));
  }

  /* Magnetic buttons */
  if (hasFinePointer && !prefersReducedMotion && window.gsap) {
    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, { x: x * 0.2, y: y * 0.35, duration: 0.4, ease: "power2.out" });
      });
      btn.addEventListener("mouseleave", () => gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" }));
    });
  }

  /* Accordion (specs / FAQ) */
  document.querySelectorAll("[data-accordion-trigger]").forEach((trigger) => {
    const panel = trigger.parentElement.querySelector("[data-accordion-panel]");
    if (!panel) return;
    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        trigger.setAttribute("aria-expanded", "false");
        panel.style.height = "0px";
      } else {
        trigger.setAttribute("aria-expanded", "true");
        panel.style.height = `${panel.scrollHeight}px`;
      }
    });
  });

  /* Contact form — front-end demo, no backend wired yet */
  const contactForm = document.querySelector("[data-contact-form]");
  if (contactForm) {
    const confirmEl = document.querySelector("[data-contact-confirm]");
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      contactForm.classList.add("hidden");
      confirmEl?.classList.remove("hidden");
    });
  }
})();
