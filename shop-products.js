const SHOP_PRODUCTS = [
  {
    "id": "50-850267-0-536971",
    "title": "50.850267, 0.536971",
    "image": "images/shop-previews/50.850267, 0.536971.jpg"
  },
  {
    "id": "50-850310-0-534667",
    "title": "50.850310, 0.534667",
    "image": "images/shop-previews/50.850310, 0.534667.jpg"
  },
  {
    "id": "50-851616-0-560318",
    "title": "50.851616, 0.560318",
    "image": "images/shop-previews/50.851616, 0.560318.jpg"
  },
  {
    "id": "50-852023-0-563457-tall",
    "title": "50.852023, 0.563457 tall",
    "image": "images/shop-previews/50.852023, 0.563457 tall.jpg"
  },
  {
    "id": "50-852085-0-560369",
    "title": "50.852085, 0.560369",
    "image": "images/shop-previews/50.852085, 0.560369.jpg"
  },
  {
    "id": "50-852111-0-563835-day",
    "title": "50.852111, 0.563835 day",
    "image": "images/shop-previews/50.852111, 0.563835 day.jpg"
  },
  {
    "id": "50-852135-0-563377",
    "title": "50.852135, 0.563377",
    "image": "images/shop-previews/50.852135, 0.563377.jpg"
  },
  {
    "id": "50-852202-0-565854",
    "title": "50.852202, 0.565854",
    "image": "images/shop-previews/50.852202, 0.565854.jpg"
  },
  {
    "id": "50-852243-0-565940",
    "title": "50.852243, 0.565940",
    "image": "images/shop-previews/50.852243, 0.565940.jpg"
  },
  {
    "id": "50-852659-0-560467",
    "title": "50.852659, 0.560467",
    "image": "images/shop-previews/50.852659, 0.560467.jpg"
  },
  {
    "id": "50-853112-0-559995",
    "title": "50.853112, 0.559995",
    "image": "images/shop-previews/50.853112, 0.559995.jpg"
  },
  {
    "id": "50-853145-0-559987",
    "title": "50.853145, 0.559987",
    "image": "images/shop-previews/50.853145, 0.559987.jpg"
  },
  {
    "id": "50-853526-0-572662",
    "title": "50.853526, 0.572662",
    "image": "images/shop-previews/50.853526, 0.572662.jpg"
  },
  {
    "id": "50-853549-0-572646-2",
    "title": "50.853549, 0.572646 2",
    "image": "images/shop-previews/50.853549, 0.572646 2.jpg"
  },
  {
    "id": "50-853549-0-572646",
    "title": "50.853549, 0.572646",
    "image": "images/shop-previews/50.853549, 0.572646.jpg"
  },
  {
    "id": "50-853551-0-572615",
    "title": "50.853551, 0.572615",
    "image": "images/shop-previews/50.853551, 0.572615.jpg"
  },
  {
    "id": "50-853665-0-573997",
    "title": "50.853665, 0.573997",
    "image": "images/shop-previews/50.853665, 0.573997.jpg"
  },
  {
    "id": "50-854734-0-585455-peach",
    "title": "50.854734, 0.585455 peach",
    "image": "images/shop-previews/50.854734, 0.585455 peach.jpg"
  },
  {
    "id": "50-855020-0-584362",
    "title": "50.855020, 0.584362",
    "image": "images/shop-previews/50.855020, 0.584362.jpg"
  },
  {
    "id": "50-855084-0-585302",
    "title": "50.855084, 0.585302",
    "image": "images/shop-previews/50.855084, 0.585302.jpg"
  },
  {
    "id": "50-855213-0-582515",
    "title": "50.855213, 0.582515",
    "image": "images/shop-previews/50.855213, 0.582515.jpg"
  },
  {
    "id": "50-855278-0-585273",
    "title": "50.855278, 0.585273",
    "image": "images/shop-previews/50.855278, 0.585273.jpg"
  },
  {
    "id": "50-855572-0-582126",
    "title": "50.855572, 0.582126",
    "image": "images/shop-previews/50.855572, 0.582126.jpg"
  },
  {
    "id": "50-855613-0-575311",
    "title": "50.855613, 0.575311",
    "image": "images/shop-previews/50.855613, 0.575311.jpg"
  },
  {
    "id": "50-855638-0-577302",
    "title": "50.855638, 0.577302",
    "image": "images/shop-previews/50.855638, 0.577302.jpg"
  },
  {
    "id": "50-856033-0-593798",
    "title": "50.856033, 0.593798",
    "image": "images/shop-previews/50.856033, 0.593798.jpg"
  },
  {
    "id": "50-860918-0-561829",
    "title": "50.860918, 0.561829",
    "image": "images/shop-previews/50.860918, 0.561829.jpg"
  }
];

const SHOP_SIZES = {
  A5: { label: "A5", dimensions: "14.8 × 21 cm", price: 20 },
  A4: { label: "A4", dimensions: "21 × 29.7 cm", price: 35 },
  A3: { label: "A3", dimensions: "29.7 × 42 cm", price: 60 }
};

function getShopBasket() {
  try {
    return JSON.parse(localStorage.getItem("christyBasket")) || [];
  } catch (error) {
    return [];
  }
}

function saveShopBasket(basket) {
  localStorage.setItem("christyBasket", JSON.stringify(basket));
}

function updateBasketLink() {
  const link = document.getElementById("basketLink");
  if (!link) return;
  const count = getShopBasket().reduce((total, item) => total + item.quantity, 0);
  link.textContent = `Basket (${count})`;
}
const HIDDEN_SHOP_PRODUCT_IDS = new Set([
  "50-855213-0-582515",
  "50-855572-0-582126",
  "50-855278-0-585273",
  "50-855613-0-575311",
  "50-860918-0-561829",
  "50-853549-0-572646-2"
]);

for (let i = SHOP_PRODUCTS.length - 1; i >= 0; i--) {
  if (HIDDEN_SHOP_PRODUCT_IDS.has(SHOP_PRODUCTS[i].id)) {
    SHOP_PRODUCTS.splice(i, 1);
  }
}