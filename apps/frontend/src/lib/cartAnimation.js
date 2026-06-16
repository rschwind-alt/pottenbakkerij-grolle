export function animateFlyToCart(sourceElement, imageUrl = "") {
  if (typeof window === "undefined" || typeof document === "undefined" || !sourceElement) {
    return;
  }

  const target = document.getElementById("header-cart-button");
  if (!target) {
    return;
  }

  const fromRect = sourceElement.getBoundingClientRect();
  const toRect = target.getBoundingClientRect();

  const ghost = document.createElement(imageUrl ? "img" : "div");
  if (imageUrl) {
    ghost.src = imageUrl;
    ghost.alt = "";
    ghost.style.objectFit = "cover";
  }

  const startWidth = Math.min(Math.max(fromRect.width, 120), 320);
  const startHeight = Math.min(Math.max(fromRect.height, 90), 240);

  ghost.style.position = "fixed";
  ghost.style.left = `${fromRect.left + fromRect.width / 2 - startWidth / 2}px`;
  ghost.style.top = `${fromRect.top + fromRect.height / 2 - startHeight / 2}px`;
  ghost.style.width = `${startWidth}px`;
  ghost.style.height = `${startHeight}px`;
  ghost.style.borderRadius = "10px";
  ghost.style.pointerEvents = "none";
  ghost.style.zIndex = "1600";
  ghost.style.border = "1px solid rgba(140, 82, 67, 0.45)";
  ghost.style.boxShadow = "0 8px 20px rgba(60, 45, 35, 0.2)";
  ghost.style.background = imageUrl
    ? "rgba(255,255,255,0.95)"
    : "linear-gradient(180deg, rgba(207, 132, 117, 0.98) 0%, rgba(195, 119, 103, 0.98) 100%)";
  ghost.style.transform = "translate3d(0, 0, 0) scale(1)";
  ghost.style.opacity = "0.98";
  ghost.style.transition = "transform 620ms cubic-bezier(0.16, 0.86, 0.24, 1), opacity 620ms ease";

  document.body.appendChild(ghost);

  const deltaX = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
  const deltaY = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);

  window.requestAnimationFrame(() => {
    ghost.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.12)`;
    ghost.style.opacity = "0.1";
  });

  window.setTimeout(() => {
    ghost.remove();
  }, 700);
}