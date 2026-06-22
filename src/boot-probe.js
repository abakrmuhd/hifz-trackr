(function () {
  var app = document.querySelector("#app");
  if (!app) return;

  app.setAttribute("data-boot-probe", "classic-script-ran");
  var probe = document.createElement("p");
  probe.textContent = "Classic script executed. Waiting for module startup.";
  probe.setAttribute("data-boot-probe-message", "true");
  probe.style.marginTop = "12px";
  app.appendChild(probe);
})();
