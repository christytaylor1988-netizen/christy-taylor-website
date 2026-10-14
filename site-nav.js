/* MASTER NAVIGATION
   Add, rename or reorder links here.
*/

(() => {
    const navigationLinks = [
        { title: "Hastings", href: "hastings.html" },
        { title: "Other Work", href: "work.html" },
        { title: "Shop", href: "shop.html" },
        { title: "About / Contact", href: "about.html" }
    ];

    function updateNavigation() {
        document.querySelectorAll(".site-header .site-nav").forEach(nav => {
            const links = navigationLinks.map(item => {
                const link = document.createElement("a");
                link.href = item.href;
                link.textContent = item.title;
                if (item.title !== "Hastings") return link;

                const group = document.createElement("div");
                group.className = "nav-hastings";
                const toggle = document.createElement("button");
                toggle.type = "button";
                toggle.className = "nav-dropdown-toggle";
                toggle.setAttribute("aria-label", "Hastings submenu");
                toggle.setAttribute("aria-expanded", "false");
                const menu = document.createElement("div");
                menu.className = "nav-dropdown";
                menu.id = `hastings-submenu-${document.querySelectorAll(".nav-hastings").length}`;
                toggle.setAttribute("aria-controls", menu.id);
                menu.hidden = true;
                const drawings = document.createElement("a");
                drawings.href = "hastings.html";
                drawings.textContent = "iPad Drawings";
                const cabs = document.createElement("a");
                cabs.textContent = "Goodwill Cabs";
                cabs.href = "taxi.html";
                menu.append(drawings, cabs);
                group.append(link, toggle, menu);
                const positionMenu = () => {
                    // Clear any wrapped navigation row without moving its links.
                    menu.style.top = `${nav.getBoundingClientRect().bottom - group.getBoundingClientRect().top}px`;
                };
                const setOpen = open => {
                    if (open) positionMenu();
                    menu.hidden = !open;
                    toggle.setAttribute("aria-expanded", String(open));
                };
                toggle.addEventListener("click", () => setOpen(menu.hidden));
                group.addEventListener("pointerenter", event => {
                    if (event.pointerType === "mouse") setOpen(true);
                });
                group.addEventListener("pointerleave", event => {
                    if (event.pointerType === "mouse" && !group.contains(document.activeElement)) setOpen(false);
                });
                group.addEventListener("focusin", event => {
                    if (event.target.matches(":focus-visible")) setOpen(true);
                });
                window.addEventListener("resize", () => {
                    if (!menu.hidden) positionMenu();
                });
                group.addEventListener("focusout", event => {
                    if (!group.contains(event.relatedTarget)) setOpen(false);
                });
                group.addEventListener("keydown", event => {
                    if (event.key === "Escape" && !menu.hidden) {
                        event.preventDefault();
                        toggle.focus();
                        setOpen(false);
                    } else if (event.key === "ArrowDown" && (event.target === link || event.target === toggle)) {
                        event.preventDefault();
                        setOpen(true);
                        drawings.focus();
                    }
                });
                document.addEventListener("pointerdown", event => {
                    if (!group.contains(event.target)) setOpen(false);
                });
                return group;
            });

            nav.replaceChildren(...links);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", updateNavigation);
    } else {
        updateNavigation();
    }
})();