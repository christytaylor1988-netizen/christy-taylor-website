import os

from flask import Flask, request, jsonify, send_from_directory
import stripe


app = Flask(__name__)


stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")


PRODUCTS = {
    "another-seagull": {
        "name": "Another Seagull",
        "price": 6500
    },
    "bus-stop": {
        "name": "Bus Stop",
        "price": 6500
    },
    "bus-stop-2": {
        "name": "Bus Stop 2",
        "price": 6500
    },
    "bus-stop-3": {
        "name": "Bus Stop 3",
        "price": 6500
    },
    "bus-stop-4": {
        "name": "Bus Stop 4",
        "price": 6500
    },
    "bus-stop-5": {
        "name": "Bus Stop 5",
        "price": 6500
    },
    "cafe": {
        "name": "Cafe",
        "price": 6500
    },
    "isabel-blackman-centre": {
        "name": "Isabel Blackman Centre",
        "price": 6500
    },
    "london-road": {
        "name": "London Road",
        "price": 6500
    },
    "opposite-playland": {
        "name": "Opposite Playland",
        "price": 6500
    },
    "signs": {
        "name": "Signs",
        "price": 6500
    },
    "the-selkie": {
        "name": "The Selkie",
        "price": 6500
    }
}


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/create-checkout-session", methods=["POST"])
def create_checkout_session():

    basket = request.json.get("basket", [])

    line_items = []

    for item in basket:

        product_id = item.get("id")
        quantity = item.get("quantity", 1)

        if product_id not in PRODUCTS:
            continue

        product = PRODUCTS[product_id]

        line_items.append({
            "price_data": {
                "currency": "gbp",
                "product_data": {
                    "name": product["name"]
                },
                "unit_amount": product["price"]
            },
            "quantity": quantity
        })

    if not line_items:
        return jsonify({
            "error": "Basket is empty"
        }), 400


    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=line_items,
        success_url="http://localhost:5000/success.html",
        cancel_url="http://localhost:5000/basket.html"
    )


    return jsonify({
        "url": session.url
    })


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(".", path)


if __name__ == "__main__":
    app.run(debug=True)