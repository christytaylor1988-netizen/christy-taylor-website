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
                return link;
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