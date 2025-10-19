// 0 
(function() {
  // 1 
  let shownNames = new Set();

  setInterval(() => {
    const usersContainer = document.querySelector("#users");
    if (!usersContainer) return;

    const members = usersContainer.querySelectorAll(".uzr");
    members.forEach(el => {
      const nameEl = el.querySelector(".u-topic");
      const name = nameEl ? nameEl.innerText.trim() : "(غير معروف)";
      const style = getComputedStyle(el);

      const hidden =
        style.display === "none" 
        style.visibility === "hidden" 
        parseFloat(style.opacity) === 0 
        el.hasAttribute("hidden") 
        el.classList.contains("hidden") 
        el.classList.contains("hide") 
        el.offsetHeight === 0 ||
        el.offsetWidth === 0;

      if (hidden) {
        // 2 
        el.style.setProperty("display", "flex", "important");
        el.style.setProperty("visibility", "visible", "important");
        el.style.setProperty("opacity", "1", "important");
        el.style.setProperty("height", "auto", "important");
        el.style.setProperty("transform", "none", "important");
        el.removeAttribute("hidden");
        el.classList.remove("hidden", "hide");

        // 3 
        if (!shownNames.has(name)) {
          shownNames.add(name);
console.log(`👁 تم إظهار العضو المخفي: ${name}`);
        }
      }
    });

    // 4 
    if (shownNames.size > 1000) shownNames.clear();
  }, 7000); 

  console.log("كود لإضهار المخفي في الشات إهداء للشيخ نبيل)"); 
})();
