import os

from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory, abort

import stripe


WEBSITE_DIR = Path(__file__).resolve().parent


app = Flask(__name__, static_folder=None)

app.config["MAX_CONTENT_LENGTH"] = 64 * 1024


STRIPE_SECRET_KEY = os.environ.get(
    "STRIPE_SECRET_KEY",
    ""
).strip()

stripe.api_key = STRIPE_SECRET_KEY


BASE_URL = os.environ.get(
    "BASE_URL",
    "http://localhost:8000"
).rstrip("/")


LIVE_CHECKOUT_ENABLED = (
    os.environ.get(
        "LIVE_CHECKOUT_ENABLED",
        ""
    ).strip().lower()
    in {"1", "true", "yes", "on"}
)


ALLOWED_ORIGINS = {
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "https://christytaylor.co.uk",
    "https://www.christytaylor.co.uk",
    BASE_URL
}

ALLOWED_ORIGINS.discard("")


# Only the 21 currently visible prints are available at checkout.

PRODUCTS = {
    "50-850267-0-536971": "50.850267, 0.536971",
    "50-850310-0-534667": "50.850310, 0.534667",
    "50-851616-0-560318": "50.851616, 0.560318",
    "50-852023-0-563457-tall": "50.852023, 0.563457 tall",
    "50-852085-0-560369": "50.852085, 0.560369",
    "50-852111-0-563835-day": "50.852111, 0.563835 day",
    "50-852135-0-563377": "50.852135, 0.563377",
    "50-852202-0-565854": "50.852202, 0.565854",
    "50-852243-0-565940": "50.852243, 0.565940",
    "50-852659-0-560467": "50.852659, 0.560467",
    "50-853112-0-559995": "50.853112, 0.559995",
    "50-853145-0-559987": "50.853145, 0.559987",
    "50-853526-0-572662": "50.853526, 0.572662",
    "50-853549-0-572646": "50.853549, 0.572646",
    "50-853551-0-572615": "50.853551, 0.572615",
    "50-853665-0-573997": "50.853665, 0.573997",
    "50-854734-0-585455-peach": "50.854734, 0.585455 peach",
    "50-855020-0-584362": "50.855020, 0.584362",
    "50-855084-0-585302": "50.855084, 0.585302",
    "50-855638-0-577302": "50.855638, 0.577302",
    "50-856033-0-593798": "50.856033, 0.593798"
}


# Stripe amounts are in pence.

SIZE_PRICES = {
    "A5": 2000,
    "A4": 3500,
    "A3": 6000
}


DELIVERY_PRICE = 600


@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")

    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin

        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, OPTIONS"
        )

        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type"
        )

        response.vary.add("Origin")

    if request.path in {
        "/create-checkout-session",
        "/checkout-session"
    }:
        response.headers["Cache-Control"] = "no-store"

    return response


def stripe_key_mode():
    if STRIPE_SECRET_KEY.startswith("sk_test_"):
        return "test"

    if STRIPE_SECRET_KEY.startswith("sk_live_"):
        return "live"

    return None


def stripe_key_error():
    if not STRIPE_SECRET_KEY:
        return jsonify({
            "error": "Stripe secret key has not been configured."
        }), 503

    mode = stripe_key_mode()

    if mode is None:
        return jsonify({
            "error": "Invalid Stripe secret key."
        }), 503

    if mode == "live":
        if not LIVE_CHECKOUT_ENABLED:
            return jsonify({
                "error": "Live checkout is currently disabled."
            }), 503

        if not BASE_URL.startswith("https://"):
            return jsonify({
                "error": "Live checkout requires a secure HTTPS website URL."
            }), 503

    return None


@app.route(
    "/create-checkout-session",
    methods=["POST", "OPTIONS"]
)
def create_checkout_session():
    origin = request.headers.get("Origin")

    if origin and origin not in ALLOWED_ORIGINS:
        return jsonify({
            "error": "This website is not allowed to use checkout."
        }), 403

    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Invalid basket data."
        }), 400

    basket = data.get("basket")

    if not isinstance(basket, list) or not basket:
        return jsonify({
            "error": "Basket is empty."
        }), 400

    if len(basket) > 63:
        return jsonify({
            "error": "Too many basket items."
        }), 400

    grouped_items = {}

    for item in basket:
        if not isinstance(item, dict):
            return jsonify({
                "error": "Invalid basket item."
            }), 400

        product_id = item.get("id")
        size = item.get("size")
        quantity = item.get("quantity")

        if (
            not isinstance(product_id, str)
            or product_id not in PRODUCTS
        ):
            return jsonify({
                "error": (
                    "A print in your basket "
                    "is no longer available."
                )
            }), 400

        if (
            not isinstance(size, str)
            or size not in SIZE_PRICES
        ):
            return jsonify({
                "error": "Please choose A5, A4 or A3."
            }), 400

        if (
            type(quantity) is not int
            or not 1 <= quantity <= 20
        ):
            return jsonify({
                "error": (
                    "Quantity must be "
                    "between 1 and 20."
                )
            }), 400

        item_key = (product_id, size)

        grouped_items[item_key] = (
            grouped_items.get(item_key, 0)
            + quantity
        )

        if grouped_items[item_key] > 20:
            return jsonify({
                "error": (
                    "Maximum 20 copies "
                    "per print and size."
                )
            }), 400

    key_error = stripe_key_error()

    if key_error is not None:
        return key_error

    line_items = []

    for (
        product_id,
        size
    ), quantity in grouped_items.items():

        line_items.append({
            "price_data": {
                "currency": "gbp",

                "product_data": {
                    "name": (
                        f"{PRODUCTS[product_id]}"
                        f" — {size} print"
                    ),

                    "metadata": {
                        "product_id": product_id,
                        "size": size
                    }
                },

                "unit_amount": SIZE_PRICES[size]
            },

            "quantity": quantity
        })

    try:
        session = stripe.checkout.Session.create(
            mode="payment",

            line_items=line_items,

            shipping_address_collection={
                "allowed_countries": ["GB"]
            },

            shipping_options=[{
                "shipping_rate_data": {
                    "type": "fixed_amount",

                    "fixed_amount": {
                        "amount": DELIVERY_PRICE,
                        "currency": "gbp"
                    },

                    "display_name": "UK delivery"
                }
            }],

            success_url=(
                f"{BASE_URL}/success.html"
                "?session_id={CHECKOUT_SESSION_ID}"
            ),

            cancel_url=(
                f"{BASE_URL}/basket.html"
            )
        )

        return jsonify({
            "url": session.url,
            "session_id": session.id
        })

    except Exception:
        app.logger.exception(
            "Stripe checkout creation failed"
        )

        return jsonify({
            "error": (
                "Unable to start checkout. "
                "Please try again."
            )
        }), 502


def get_purchased_items(session_id):
    line_items = (
        stripe.checkout.Session.list_line_items(
            session_id,
            limit=100,
            expand=["data.price.product"]
        )
    )

    purchased_items = []

    for line_item in line_items.auto_paging_iter():

        # Convert nested Stripe objects before
        # reading them as dictionaries.
        line_item = line_item.to_dict()

        price = line_item.get("price")

        if not price:
            raise ValueError(
                "Missing price on checkout item."
            )

        product = price.get("product")

        if not isinstance(product, dict):
            raise ValueError(
                "Missing expanded checkout product."
            )

        metadata = product.get("metadata") or {}

        product_id = metadata.get("product_id")
        size = metadata.get("size")
        quantity = line_item.get("quantity")

        if (
            not isinstance(product_id, str)
            or not product_id
        ):
            raise ValueError(
                "Missing print ID on checkout item."
            )

        if (
            not isinstance(size, str)
            or size not in SIZE_PRICES
        ):
            raise ValueError(
                "Invalid print size on checkout item."
            )

        if (
            type(quantity) is not int
            or not 1 <= quantity <= 20
        ):
            raise ValueError(
                "Invalid quantity on checkout item."
            )

        purchased_items.append({
            "id": product_id,
            "size": size,
            "quantity": quantity
        })

    if not purchased_items:
        raise ValueError(
            "No purchased prints found."
        )

    return purchased_items


# Verify payment and return purchased items
# only after payment.

@app.route(
    "/checkout-session",
    methods=["GET"]
)
def checkout_session_status():
    key_error = stripe_key_error()

    if key_error is not None:
        return key_error

    session_id = request.args.get(
        "session_id",
        ""
    )

    mode = stripe_key_mode()

    if mode == "live":
        required_prefix = "cs_live_"
    else:
        required_prefix = "cs_test_"

    if not session_id.startswith(
        required_prefix
    ):
        return jsonify({
            "error": "Invalid checkout session."
        }), 400

    try:
        session = (
            stripe.checkout.Session.retrieve(
                session_id
            )
        )

        result = {
            "session_id": session.id,
            "status": session.status,

            "payment_status": (
                session.payment_status
            ),

            "amount_total": (
                session.amount_total
            ),

            "currency": session.currency,

            "purchased_items": None
        }

        if (
            session.status == "complete"
            and
            session.payment_status == "paid"
        ):
            try:
                result["purchased_items"] = (
                    get_purchased_items(
                        session.id
                    )
                )

            except Exception:
                # Payment remains verified,
                # but the basket must be kept
                # if purchased items cannot
                # be retrieved.

                app.logger.exception(
                    "Unable to retrieve "
                    "purchased checkout items"
                )

        return jsonify(result)

    except Exception:
        app.logger.exception(
            "Stripe payment verification failed"
        )

        return jsonify({
            "error": (
                "Unable to verify this payment."
            )
        }), 400


@app.route("/")
def index():
    return send_from_directory(
        str(WEBSITE_DIR),
        "index.html"
    )


@app.route("/<path:path>")
def static_files(path):
    # Serve website assets without exposing
    # Python or config files.

    if any(
        part.startswith(".")
        for part in Path(path).parts
    ):
        abort(404)

    allowed_extensions = {
        ".html",
        ".css",
        ".js",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".ico",
        ".otf",
        ".ttf",
        ".woff",
        ".woff2",
        ".mp4",
        ".webm",
        ".mp3",
        ".wav",
        ".pdf"
    }

    if (
        Path(path).suffix.lower()
        not in allowed_extensions
    ):
        abort(404)

    return send_from_directory(
        str(WEBSITE_DIR),
        path
    )


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )