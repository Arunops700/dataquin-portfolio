/* ============================================================
   DataQuin — Portfolio Scripts
   Preloader, nav, particles, reveals, counters, bars, rotator
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Preloader ---------- */
  window.addEventListener("load", function () {
    var pre = document.getElementById("preloader");
    if (pre) {
      setTimeout(function () { pre.classList.add("done"); }, 500);
    }
  });

  /* ---------- Sticky / hide-on-scroll nav ---------- */
  var nav = document.querySelector(".nav");
  var lastY = 0;
  function onScrollNav() {
    var y = window.scrollY;
    if (nav) {
      nav.classList.toggle("scrolled", y > 40);
      if (y > 320 && y > lastY) nav.classList.add("hidden");
      else nav.classList.remove("hidden");
    }
    lastY = y;
  }
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- Mobile menu ---------- */
  var burger = document.querySelector(".hamburger");
  var mobileMenu = document.querySelector(".mobile-menu");
  if (burger && mobileMenu) {
    burger.addEventListener("click", function () {
      var open = mobileMenu.classList.toggle("open");
      burger.classList.toggle("open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    mobileMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobileMenu.classList.remove("open");
        burger.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- Active nav link ---------- */
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".nav-links a, .mobile-menu a").forEach(function (a) {
    var href = (a.getAttribute("href") || "").toLowerCase();
    if (href === here) a.classList.add("active");
  });

  /* ---------- Page fade transitions ---------- */
  var overlay = document.getElementById("page-transition");
  if (overlay) {
    document.querySelectorAll('a[href$=".html"]').forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (href.indexOf("http") === 0 || a.target === "_blank") return;
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        overlay.classList.add("active");
        setTimeout(function () { location.href = href; }, 320);
      });
    });
    window.addEventListener("pageshow", function () {
      overlay.classList.remove("active");
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ---------- Animated counters ---------- */
  function animateCounter(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = (el.dataset.count.split(".")[1] || "").length;
    var prefix = el.dataset.prefix || "";
    var suffix = el.dataset.suffix || "";
    var duration = 1800;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll("[data-count]").forEach(function (el) {
    counterObserver.observe(el);
  });

  /* ---------- Animated width bars (time bars & skill meters) ---------- */
  var barObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.width = entry.target.dataset.width;
        barObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll("[data-width]").forEach(function (el) {
    barObserver.observe(el);
  });

  /* ---------- Card cursor glow ---------- */
  document.querySelectorAll(".card").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* ---------- Rotating hero word ---------- */
  var rotator = document.querySelector(".rotator");
  if (rotator) {
    var words = rotator.querySelectorAll("span");
    var idx = 0;
    words[0].classList.add("current");
    setInterval(function () {
      var current = words[idx];
      idx = (idx + 1) % words.length;
      var next = words[idx];
      current.classList.remove("current");
      current.classList.add("leaving");
      setTimeout(function () { current.classList.remove("leaving"); }, 600);
      next.classList.add("current");
    }, 2600);
  }

  /* ---------- Particle network canvas ---------- */
  var canvas = document.getElementById("particles");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var particles = [];
    var mouse = { x: null, y: null };
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    function sizeCanvas() {
      var rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * DPR;
      canvas.height = rect.height * DPR;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function initParticles() {
      sizeCanvas();
      var w = canvas.width / DPR, h = canvas.height / DPR;
      var count = Math.min(Math.floor((w * h) / 16000), 90);
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.6 + 0.6
        });
      }
    }

    function drawParticles() {
      var w = canvas.width / DPR, h = canvas.height / DPR;
      ctx.clearRect(0, 0, w, h);
      var LINK = 130;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // gentle pull toward mouse
        if (mouse.x !== null) {
          var dxm = mouse.x - p.x, dym = mouse.y - p.y;
          var dm = Math.sqrt(dxm * dxm + dym * dym);
          if (dm < 190 && dm > 0.001) {
            p.x += dxm / dm * 0.35;
            p.y += dym / dm * 0.35;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(200,169,81,0.55)";
        ctx.fill();

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = "rgba(200,169,81," + (0.16 * (1 - d / LINK)) + ")";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(drawParticles);
    }

    canvas.parentElement.addEventListener("mousemove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener("mouseleave", function () {
      mouse.x = null;
      mouse.y = null;
    });
    window.addEventListener("resize", initParticles);

    initParticles();
    drawParticles();
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll(".js-year").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Contact form (mailto) ---------- */
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.querySelector("#cf-name").value.trim();
      var company = form.querySelector("#cf-company").value.trim();
      var email = form.querySelector("#cf-email").value.trim();
      var topic = form.querySelector("#cf-topic").value;
      var msg = form.querySelector("#cf-message").value.trim();
      var subject = encodeURIComponent("[DataQuin] " + topic + " — " + (company || name));
      var body = encodeURIComponent(
        "Name: " + name + "\nCompany: " + company + "\nEmail: " + email +
        "\nTopic: " + topic + "\n\n" + msg
      );
      location.href = "mailto:kavita@dataquin.com?subject=" + subject + "&body=" + body;
    });
  }
})();
