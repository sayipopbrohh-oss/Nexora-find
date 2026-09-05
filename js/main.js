/* ============================================================
   Nexora.Find — Shared UI behaviors
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // Scroll reveal
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  // Mobile nav toggle
  const burger = document.querySelector(".nav-burger");
  const links = document.querySelector(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", () => links.classList.toggle("mobile-open"));
  }

  // Countdown timer — resets to a rolling 6-hour window so the deal always feels live
  const cdEls = {
    h: document.querySelector("[data-cd-hours]"),
    m: document.querySelector("[data-cd-minutes]"),
    s: document.querySelector("[data-cd-seconds]")
  };
  if (cdEls.h) {
    const STORAGE_KEY = "nexora_deal_end";
    let end = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    const now = Date.now();
    if (!end || end < now) {
      end = now + 1000 * 60 * 60 * 6; // 6 hours
      localStorage.setItem(STORAGE_KEY, end);
    }
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      cdEls.h.textContent = String(h).padStart(2, "0");
      cdEls.m.textContent = String(m).padStart(2, "0");
      cdEls.s.textContent = String(s).padStart(2, "0");
    };
    tick();
    setInterval(tick, 1000);
  }

  // Accordion (product page)
  document.querySelectorAll(".acc-head").forEach((head) => {
    head.addEventListener("click", () => {
      const item = head.closest(".acc-item");
      const body = item.querySelector(".acc-body");
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".acc-item.open").forEach((o) => {
        o.classList.remove("open");
        o.querySelector(".acc-body").style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("open");
        body.style.maxHeight = body.scrollHeight + "px";
      }
    });
  });

  // Newsletter form (front-end only)
  document.querySelectorAll(".nl-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector("button");
      const original = btn.textContent;
      btn.textContent = "Subscribed ✓";
      btn.disabled = true;
      form.querySelector("input").value = "";
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 2500);
    });
  });
});
