// window.addEventListener('load', () => {
//   document.body.classList.add('loaded');
// });

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

window.addEventListener("load", () => {
  window.scrollTo(0, 0);
  document.body.classList.add("loaded");
});
