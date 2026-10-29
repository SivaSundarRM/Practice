const apiUrl = "https://dummyjson.com/products?limit=100";

const elements = {
    productsGrid: document.getElementById("productsGrid"),
    categoryFilter: document.getElementById("categoryFilter"),
    sortFilter: document.getElementById("sortFilter"),
    searchInput: document.getElementById("searchInput"),
    cartItems: document.getElementById("cartItems"),
    cartCount: document.getElementById("cartCount"),
    totalItems: document.getElementById("totalItems"),
    totalPrice: document.getElementById("totalPrice"),
    checkoutButton: document.getElementById("checkoutButton"),
    cartMessage: document.getElementById("cartMessage"),
    cartButton: document.getElementById("cartButton")
};

const fallbackImage =
    "https://placehold.co/500x400/10243b/ffffff?text=No+Image";

let allProducts = [];
let cart = [];

async function getProducts() {
    try {
        const response = await fetch(apiUrl);
        console.log(response);
        if (!response.ok) {
            throw new Error("Failed to fetch products");
        }

        const data = await response.json();
        console.log("Fetched products data:", data);
        allProducts = data.products || [];
        console.log("Total products fetched:", allProducts.length);
        populateCategories();
        filterProducts();
    } catch (error) {
        console.error("Error fetching products:", error);

        if (elements.productsGrid) {
            elements.productsGrid.textContent =
                "Unable to load products. Please try again later.";
        }
    }
}

function displayProducts(products) {
    const container = elements.productsGrid;

    if (!container) {
        console.error("Products container not found");
        return;
    }

    container.replaceChildren();

    if (products.length === 0) {
        const message = document.createElement("p");
        message.className = "products__empty";
        message.textContent = "No products found.";
        container.appendChild(message);
        return;
    }

    products.forEach(product => {
        const card = document.createElement("article");
        card.className = "product-card";

        const image = document.createElement("img");
        image.className = "product-card__image";
        image.src = product.thumbnail || fallbackImage;
        image.alt = product.title;
        image.loading = "lazy";

        image.addEventListener("error", () => {
            image.onerror = null;
            image.src = fallbackImage;
        });

        const content = document.createElement("div");
        content.className = "product-card__content";

        const title = document.createElement("h3");
        title.className = "product-card__title";
        title.textContent = product.title;

        const description = document.createElement("p");
        description.className = "product-card__description";
        description.textContent = product.description;

        const price = document.createElement("p");
        price.className = "product-card__price";
        price.textContent = `₹${product.price.toFixed(2)}`;

        const button = document.createElement("button");
        button.className = "product-card__button";
        button.textContent = "Add to Cart";
        button.type = "button";
        button.dataset.action = "add";
        button.dataset.productId = product.id;

        content.append(title, description, price, button);
        card.append(image, content);
        container.appendChild(card);
    });
}

function addToCart(productId) {
    const product = allProducts.find(
        item => item.id === Number(productId)
    );

    if (!product) {
        return;
    }

    const existingItem = cart.find(
        item => item.id === product.id
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            thumbnail: product.thumbnail,
            quantity: 1
        });
    }

    saveCart();
    updateCart();

    if (elements.cartMessage) {
        elements.cartMessage.textContent =
            `${product.title} added to cart.`;
    }
}

function removeFromCart(productId) {
    cart = cart.filter(
        item => item.id !== Number(productId)
    );

    saveCart();
    updateCart();

    if (elements.cartMessage) {
        elements.cartMessage.textContent =
            "Product removed from cart.";
    }
}

function updateCart() {
    const container = elements.cartItems;

    if (!container) {
        return;
    }

    container.replaceChildren();

    if (cart.length === 0) {
        const message = document.createElement("p");
        message.textContent = "Your cart is empty.";
        container.appendChild(message);
    } else {
        cart.forEach(item => {
            const cartItem = document.createElement("article");
            cartItem.className = "cart__item";

            const title = document.createElement("h3");
            title.className = "cart__item-title";
            title.textContent = item.title;

            const price = document.createElement("p");
            price.className = "cart__item-price";
            price.textContent =
                `₹${item.price.toFixed(2)} × ${item.quantity}`;

            const subtotal = document.createElement("p");
            subtotal.className = "cart__item-subtotal";
            subtotal.textContent =
                `Subtotal: ₹${(item.price * item.quantity).toFixed(2)}`;

            const quantityControls = document.createElement("div");
            quantityControls.className = "cart__item-controls";

            const decreaseButton = document.createElement("button");
            decreaseButton.type = "button";
            decreaseButton.textContent = "−";
            decreaseButton.setAttribute(
                "aria-label",
                `Decrease quantity of ${item.title}`
            );
            decreaseButton.dataset.action = "decrease";
            decreaseButton.dataset.productId = item.id;

            const quantity = document.createElement("span");
            quantity.className = "cart__item-quantity";
            quantity.textContent = item.quantity;

            const increaseButton = document.createElement("button");
            increaseButton.type = "button";
            increaseButton.textContent = "+";
            increaseButton.setAttribute(
                "aria-label",
                `Increase quantity of ${item.title}`
            );
            increaseButton.dataset.action = "increase";
            increaseButton.dataset.productId = item.id;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "cart__remove";
            removeButton.textContent = "Remove";
            removeButton.dataset.action = "remove";
            removeButton.dataset.productId = item.id;

            quantityControls.append(
                decreaseButton,
                quantity,
                increaseButton
            );

            cartItem.append(
                title,
                price,
                subtotal,
                quantityControls,
                removeButton
            );

            container.appendChild(cartItem);
        });
    }

    const itemCount = cart.reduce(
        (total, item) => total + item.quantity,
        0
    );

    const totalPrice = cart.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    if (elements.cartCount) {
        elements.cartCount.textContent = itemCount;
    }

    if (elements.totalItems) {
        elements.totalItems.textContent = itemCount;
    }

    if (elements.totalPrice) {
        elements.totalPrice.textContent = totalPrice.toFixed(2);
    }

    if (elements.checkoutButton) {
        elements.checkoutButton.disabled = cart.length === 0;
    }
}

function filterProducts() {
    const selectedCategory =
        elements.categoryFilter?.value || "all";

    const searchTerm =
        elements.searchInput?.value.trim().toLowerCase() || "";

    let filteredProducts = allProducts.filter(product => {
        const matchesCategory =
            selectedCategory === "all" ||
            product.category === selectedCategory;

        const matchesSearch =
            product.title.toLowerCase().includes(searchTerm);

        return matchesCategory && matchesSearch;
    });

    filteredProducts = sortProducts(filteredProducts);

    displayProducts(filteredProducts);
}

function sortProducts(products) {
    const sortValue = elements.sortFilter?.value || "default";

    const sortedProducts = [...products];

    if (sortValue === "low-high") {
        sortedProducts.sort((a, b) => a.price - b.price);
    } else if (sortValue === "high-low") {
        sortedProducts.sort((a, b) => b.price - a.price);
    }

    return sortedProducts;
}

function checkout() {
    if (cart.length === 0) {
        if (elements.cartMessage) {
            elements.cartMessage.textContent =
                "Your cart is empty!";
        }

        return;
    }

    const totalPrice = cart.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    const orderSummary = `Order placed successfully! Total: ₹${totalPrice.toFixed(2)}`;

    cart = [];

    saveCart();
    updateCart();

    if (elements.cartMessage) {
        elements.cartMessage.textContent = orderSummary;
    }
}

function saveCart() {
    try {
        localStorage.setItem("shopSmartCart", JSON.stringify(cart));
    } catch (error) {
        console.error("Unable to save cart:", error);
    }
}

function loadCart() {
    try {
        const savedCart = localStorage.getItem("shopSmartCart");

        if (!savedCart) {
            cart = [];
            return;
        }

        const parsedCart = JSON.parse(savedCart);

        if (!Array.isArray(parsedCart)) {
            cart = [];
            return;
        }

        cart = parsedCart.filter(item =>
            Number.isInteger(item.id) &&
            typeof item.title === "string" &&
            Number.isFinite(item.price) &&
            item.price >= 0 &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0
        );
    } catch (error) {
        console.error("Unable to load cart:", error);
        cart = [];
    }
}

function populateCategories() {
    const select = elements.categoryFilter;

    if (!select) {
        return;
    }

    const categories = [
        ...new Set(allProducts.map(product => product.category))
    ];

    select.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Categories";
    select.appendChild(allOption);

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

function changeQuantity(productId, change) {
    const item = cart.find(
        product => product.id === Number(productId)
    );

    if (!item) {
        return;
    }

    item.quantity += change;

    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    saveCart();
    updateCart();
}

function init() {
    loadCart();
    updateCart();

    if (elements.productsGrid) {
        elements.productsGrid.addEventListener("click", event => {
            const button = event.target.closest("button[data-action]");

            if (!button) {
                return;
            }

            if (button.dataset.action === "add") {
                addToCart(button.dataset.productId);
            }
        });
    }

    if (elements.cartItems) {
        elements.cartItems.addEventListener("click", event => {
            const button = event.target.closest("button[data-action]");

            if (!button) {
                return;
            }

            const productId = button.dataset.productId;

            if (button.dataset.action === "remove") {
                removeFromCart(productId);
            } else if (button.dataset.action === "increase") {
                changeQuantity(productId, 1);
            } else if (button.dataset.action === "decrease") {
                changeQuantity(productId, -1);
            }
        });
    }

    elements.categoryFilter?.addEventListener(
        "change",
        filterProducts
    );

    elements.sortFilter?.addEventListener(
        "change",
        filterProducts
    );

    elements.searchInput?.addEventListener(
        "input",
        filterProducts
    );

    elements.checkoutButton?.addEventListener(
        "click",
        checkout
    );

    elements.cartButton?.addEventListener("click", () => {
        document.getElementById("cart")?.scrollIntoView({
            behavior: "smooth"
        });
    });

    getProducts();
}

init();