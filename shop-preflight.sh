#!/usr/bin/env bash

set -euo pipefail

fail() {
    echo
    echo "FAIL — $1"
    echo
    exit 1
}

echo
echo "PRINT SHOP PREFLIGHT"
echo "===================="

git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    || fail "Not inside the website Git repository."

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

BRANCH="$(git branch --show-current)"

[ -n "$BRANCH" ] \
    || fail "Detached Git state."

[ "$BRANCH" != "main" ] \
    || fail "Do not make shop updates directly on main."

[ "$BRANCH" != "stripe-checkout-backend" ] \
    || fail "Do not make frontend shop updates on the backend branch."

git rev-parse --verify origin/main >/dev/null 2>&1 \
    || fail "origin/main is unavailable. Run: git fetch origin"

git rev-parse --verify origin/stripe-checkout-backend >/dev/null 2>&1 \
    || fail "Backend branch is unavailable. Run: git fetch origin"

git merge-base --is-ancestor origin/main HEAD >/dev/null 2>&1 \
    || fail "This branch is not based on current origin/main. Start a fresh shop-update worktree."

python3 - <<'PY'
from pathlib import Path
import re
import subprocess
import sys


def fail(message):
    print()
    print("FAIL — " + message)
    print()
    sys.exit(1)


def allowed(path):
    return (
        path == "shop-products.js"
        or path.startswith("images/shop-previews/")
    )


def git_lines(*args):
    result = subprocess.run(
        ["git", *args],
        check=True,
        text=True,
        stdout=subprocess.PIPE
    )
    return [
        line for line in result.stdout.splitlines()
        if line.strip()
    ]


# ---------------------------------------------------------
# 1. EXACTLY WHICH FILES ARE STAGED?
# ---------------------------------------------------------

staged = git_lines(
    "diff",
    "--cached",
    "--name-only"
)

if not staged:
    fail(
        "Nothing is staged. Stage shop-products.js and/or "
        "images/shop-previews first."
    )

unexpected_staged = [
    path for path in staged
    if not allowed(path)
]

if unexpected_staged:
    fail(
        "Unexpected staged files:\n"
        + "\n".join(
            "  " + path
            for path in unexpected_staged
        )
    )


# ---------------------------------------------------------
# 2. NO UNRELATED UNSTAGED/UNTRACKED FILES
# ---------------------------------------------------------

unstaged = git_lines(
    "diff",
    "--name-only"
)

untracked = git_lines(
    "ls-files",
    "--others",
    "--exclude-standard"
)

unexpected_worktree = sorted({
    path
    for path in unstaged + untracked
    if not allowed(path)
})

if unexpected_worktree:
    fail(
        "Unexpected files exist in this update workspace:\n"
        + "\n".join(
            "  " + path
            for path in unexpected_worktree
        )
    )


# ---------------------------------------------------------
# 3. READ FRONTEND PRODUCT CATALOGUE
# ---------------------------------------------------------

catalogue_path = Path("shop-products.js")

if not catalogue_path.exists():
    fail("shop-products.js is missing.")

js = catalogue_path.read_text()

product_section = js.split(
    "const SHOP_SIZES",
    1
)[0]

products = re.findall(
    r'\{\s*'
    r'"id":\s*"([^"]+)"\s*,\s*'
    r'"title":\s*"([^"]+)"\s*,\s*'
    r'"image":\s*"([^"]+)"\s*'
    r'\}',
    product_section,
    re.S
)

if not products:
    fail("Could not read any products from shop-products.js.")

ids = [item[0] for item in products]
images = [item[2] for item in products]

if len(ids) != len(set(ids)):
    fail("Duplicate product IDs found in shop-products.js.")

if len(images) != len(set(images)):
    fail("Duplicate product image paths found in shop-products.js.")


# ---------------------------------------------------------
# 4. READ HIDDEN PRODUCT SET
# ---------------------------------------------------------

hidden_match = re.search(
    r'const HIDDEN_SHOP_PRODUCT_IDS'
    r'\s*=\s*new Set\(\[(.*?)\]\);',
    js,
    re.S
)

hidden = set()

if hidden_match:
    hidden = set(
        re.findall(
            r'"([^"]+)"',
            hidden_match.group(1)
        )
    )

unknown_hidden = hidden - set(ids)

if unknown_hidden:
    fail(
        "Hidden-product list contains unknown IDs:\n"
        + "\n".join(
            "  " + item
            for item in sorted(unknown_hidden)
        )
    )

visible_ids = {
    product_id
    for product_id in ids
    if product_id not in hidden
}


# ---------------------------------------------------------
# 5. EVERY PRODUCT IMAGE EXISTS AND IS IN GIT
# ---------------------------------------------------------

for image in images:
    path = Path(image)

    if not path.exists():
        fail(
            "Missing product image:\n  "
            + image
        )

    tracked = subprocess.run(
        [
            "git",
            "ls-files",
            "--error-unmatch",
            "--",
            image
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    if tracked.returncode != 0:
        fail(
            "Product image is not staged/tracked by Git:\n  "
            + image
            + "\nStage images with:\n"
            + "  git add -A -f -- images/shop-previews"
        )


# ---------------------------------------------------------
# 6. READ CHECKOUT BACKEND WITHOUT SWITCHING BRANCHES
# ---------------------------------------------------------

backend_result = subprocess.run(
    [
        "git",
        "show",
        "origin/stripe-checkout-backend:server.py"
    ],
    check=True,
    text=True,
    stdout=subprocess.PIPE
)

server = backend_result.stdout

products_match = re.search(
    r'PRODUCTS\s*=\s*\{(.*?)\n\}',
    server,
    re.S
)

if not products_match:
    fail("Could not read PRODUCTS from backend server.py.")

backend_ids = set(
    re.findall(
        r'"([^"]+)"\s*:',
        products_match.group(1)
    )
)

missing_backend = sorted(
    visible_ids - backend_ids
)

extra_backend = sorted(
    backend_ids - visible_ids
)

if missing_backend or extra_backend:
    message = [
        "Frontend/backend product catalogue mismatch."
    ]

    if missing_backend:
        message.append(
            "\nVisible in shop but MISSING from checkout backend:"
        )
        message.extend(
            "  " + item
            for item in missing_backend
        )

    if extra_backend:
        message.append(
            "\nAllowed by checkout backend but NOT visible in shop:"
        )
        message.extend(
            "  " + item
            for item in extra_backend
        )

    message.append(
        "\nSTOP. Update the backend catalogue separately "
        "before deploying this shop update."
    )

    fail("\n".join(message))


# ---------------------------------------------------------
# 7. FRONTEND/BACKEND PRICE MATCH
# ---------------------------------------------------------

frontend_prices = {
    key: int(value)
    for key, value in re.findall(
        r'(A[345])\s*:\s*\{[^}]*?'
        r'price\s*:\s*(\d+)',
        js,
        re.S
    )
}

prices_match = re.search(
    r'SIZE_PRICES\s*=\s*\{(.*?)\n\}',
    server,
    re.S
)

if not prices_match:
    fail("Could not read SIZE_PRICES from backend server.py.")

backend_prices = {
    key: int(value) // 100
    for key, value in re.findall(
        r'"(A[345])"\s*:\s*(\d+)',
        prices_match.group(1)
    )
}

if frontend_prices != backend_prices:
    fail(
        "Frontend/backend prices do not match.\n"
        f"Frontend: {frontend_prices}\n"
        f"Backend:  {backend_prices}"
    )


# ---------------------------------------------------------
# RESULT
# ---------------------------------------------------------

print()
print("Branch:", subprocess.check_output(
    ["git", "branch", "--show-current"],
    text=True
).strip())

print("Visible products:", len(visible_ids))

print()
print("Staged files:")
for path in staged:
    print("  " + path)

print()
print("PASS — shop update is safe to commit.")
print()
PY
