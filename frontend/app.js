const { createApp } = Vue;


/* =========================================================
   API
   ========================================================= */

const API_BASE = "http://127.0.0.1:8000";


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

const STORAGE_PENDING = "himalaya_pending_sales";
const STORAGE_USER = "himalaya_logged_user";
const STORAGE_LAST_SYNC = "himalaya_last_sync";


/* =========================================================
   APPLICATION
   ========================================================= */

createApp({

    data() {

        const today =
            new Date().toISOString().split("T")[0];

        return {

            /* ================= AUTH ================= */

            user: JSON.parse(
                localStorage.getItem(STORAGE_USER) || "null"
            ),

            loginForm: {
                employee_id: "",
                password: ""
            },

            loggingIn: false,
            loginError: "",


            /* ================= NAVIGATION ================= */

            page: "crew",


            /* ================= CONNECTION ================= */

            online: navigator.onLine,

            syncMessage: "",

            lastSyncTime:
                localStorage.getItem(STORAGE_LAST_SYNC) || "",

            syncTimer: null,


            /* ================= FLIGHTS ================= */

            flights: [],

            selectedFlight: null,

            flightForm: {
                flight_number: "",
                flight_date: today,
                aircraft: "",
                passengers: 0,
                origin: "",
                destination: ""
            },

            creatingFlight: false,

            flightError: "",


            /* ================= PRODUCTS ================= */

            products: [],

            cart: {},


            /* ================= INVENTORY ================= */

            inventory: [],

            inventoryForm: {
                product_id: null,
                loaded_quantity: 0,
                returned_quantity: 0,
                wasted_quantity: 0
            },

            inventorySaving: false,

            inventoryMessage: "",

            inventoryMessageType: "success",

            editingInventoryId: null,

            editingInventory: {},


            /* ================= PRODUCT MANAGEMENT ================= */

            newProduct: {
                product_code: "",
                product_name: "",
                category: "",
                selling_price: 0,
                cost: 0
            },

            productSaving: false,

            productMessage: "",

            productMessageType: "success",


            /* ================= CURRENCY ================= */

            currencies: [],

            selectedCurrency: "USD",

            exchangeRate: 1,

            exchangeLoading: false,

            exchangeError: "",


            /* ================= OFFLINE SALES ================= */

            pendingSales: JSON.parse(
                localStorage.getItem(
                    STORAGE_PENDING
                ) || "[]"
            ),


            /* ================= DASHBOARD ================= */

            dashboard: {

                rpp: 0,

                target_rpp: 2,

                gap: 0,

                achievement: 0,

                revenue: 0,

                passengers: 0,

                flights: [],

                products: []

            },


            dashboardFilter: {

                year:
                    new Date().getFullYear(),

                month: null,

                day: null

            },


            chartVisible: false,

            chartType: "line",

            chartInstance: null,


            /* ================= ADMIN ================= */

            users: [],

            newUser: {

                employee_id: "",

                name: "",

                password: "",

                role: "crew"

            },

            creatingUser: false,

            userMessage: "",

            userMessageType: "success",

            editingUserId: null,

            editingUser: {}

        };

    },


    /* =========================================================
       COMPUTED
       ========================================================= */

    computed: {

        isAdmin() {

            return !!(
                this.user &&
                this.user.role === "admin"
            );

        },


        isManagement() {

            return !!(
                this.user &&
                this.user.role === "management"
            );

        },


        isInventoryManager() {

            return !!(
                this.user &&
                (
                    this.user.role === "inventory" ||
                    this.user.role === "management"
                )
            );

        },


        cartTotal() {

            let total = 0;


            for (
                const product
                of this.products
            ) {

                if (
                    !product ||
                    product.id === undefined ||
                    product.id === null
                ) {
                    continue;
                }


                const quantity =
                    Number(
                        this.cart[product.id] || 0
                    );


                total +=
                    quantity *
                    Number(
                        product.selling_price || 0
                    );

            }


            return total;

        },


        formattedUsdTotal() {

            return Number(
                this.cartTotal || 0
            ).toFixed(2);

        },


        formattedCustomerAmount() {

            const amount =
                Number(this.cartTotal || 0) *
                Number(this.exchangeRate || 1);


            return amount.toFixed(2);

        },


        currencySymbol() {

            const symbols = {

                USD: "$",

                NPR: "Rs.",

                GBP: "£",

                EUR: "€",

                AED: "د.إ",

                QAR: "﷼",

                MYR: "RM",

                THB: "฿",

                INR: "₹"

            };


            return (
                symbols[this.selectedCurrency] ||
                this.selectedCurrency
            );

        },


        totalLoaded() {

            return this.inventory.reduce(

                (total, item) =>

                    total +
                    Number(
                        item.loaded_quantity || 0
                    ),

                0

            );

        },


        totalSold() {

            return this.inventory.reduce(

                (total, item) =>

                    total +
                    Number(
                        item.sold_quantity || 0
                    ),

                0

            );

        },


        totalRemaining() {

            return this.inventory.reduce(

                (total, item) =>

                    total +
                    Number(
                        item.remaining_quantity || 0
                    ),

                0

            );

        },


        yearOptions() {

            const current =
                new Date().getFullYear();


            return [

                current - 2,

                current - 1,

                current,

                current + 1

            ];

        },


        monthOptions() {

            return [

                {
                    value: 1,
                    label: "January"
                },

                {
                    value: 2,
                    label: "February"
                },

                {
                    value: 3,
                    label: "March"
                },

                {
                    value: 4,
                    label: "April"
                },

                {
                    value: 5,
                    label: "May"
                },

                {
                    value: 6,
                    label: "June"
                },

                {
                    value: 7,
                    label: "July"
                },

                {
                    value: 8,
                    label: "August"
                },

                {
                    value: 9,
                    label: "September"
                },

                {
                    value: 10,
                    label: "October"
                },

                {
                    value: 11,
                    label: "November"
                },

                {
                    value: 12,
                    label: "December"
                }

            ];

        },


        dayOptions() {

            return Array.from(
                {
                    length: 31
                },
                (_, index) =>
                    index + 1
            );

        }

    },


    /* =========================================================
       WATCHERS
       ========================================================= */

    watch: {

        selectedFlight() {

            this.cart = {};

            this.loadInventory();

        },


        selectedCurrency() {

            this.loadExchangeRate();

        },


        chartType() {

            if (this.chartVisible) {

                this.$nextTick(() => {

                    this.renderChart();

                });

            }

        },


        chartVisible(value) {

            if (value) {

                this.$nextTick(() => {

                    this.renderChart();

                });

            } else {

                this.destroyChart();

            }

        }

    },


    /* =========================================================
       CREATED
       ========================================================= */

    async created() {

        window.addEventListener(
            "online",
            this.handleOnline
        );

        window.addEventListener(
            "offline",
            this.handleOffline
        );


        if (this.user) {

            this.setInitialPage();

            await this.loadInitialData();

        }


        this.syncTimer =
            setInterval(() => {

                if (
                    navigator.onLine &&
                    !this.online
                ) {

                    this.online = true;

                }


                if (
                    this.online &&
                    this.pendingSales.length > 0
                ) {

                    this.autoSync();

                }

            }, 10000);

    },


    /* =========================================================
       METHODS
       ========================================================= */

    methods: {


        /* =====================================================
           API FETCH
           ===================================================== */

        async apiFetch(
            endpoint,
            options = {}
        ) {

            const headers = {

                ...(options.headers || {})

            };


            if (
                this.user &&
                this.user.employee_id
            ) {

                headers["X-Employee-ID"] =
                    this.user.employee_id;

            }


            if (
                options.body &&
                !headers["Content-Type"]
            ) {

                headers["Content-Type"] =
                    "application/json";

            }


            const response =
                await fetch(

                    `${API_BASE}${endpoint}`,

                    {
                        ...options,
                        headers
                    }

                );


            if (response.status === 401) {

                console.warn(
                    "Authentication failed."
                );

            }


            return response;

        },


        /* =====================================================
           LOGIN
           ===================================================== */

        async login() {

            this.loginError = "";


            if (
                !this.loginForm.employee_id ||
                !this.loginForm.password
            ) {

                this.loginError =
                    "Please enter Employee ID and password.";

                return;

            }


            this.loggingIn = true;


            try {

                const response =
                    await fetch(

                        `${API_BASE}/login`,

                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body: JSON.stringify({

                                employee_id:
                                    this.loginForm
                                        .employee_id
                                        .trim(),

                                password:
                                    this.loginForm.password

                            })

                        }

                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(

                        data.detail ||
                        "Login failed."

                    );

                }


                this.user = data;


                localStorage.setItem(

                    STORAGE_USER,

                    JSON.stringify(
                        this.user
                    )

                );


                this.loginForm.password = "";


                this.setInitialPage();


                await this.loadInitialData();


            } catch (error) {

                this.loginError =
                    error.message ||
                    "Unable to login.";

            } finally {

                this.loggingIn = false;

            }

        },


        /* =====================================================
           LOGOUT
           ===================================================== */

        logout() {

            this.user = null;

            localStorage.removeItem(
                STORAGE_USER
            );

            this.page = "crew";

            this.cart = {};

            this.flights = [];

            this.products = [];

            this.inventory = [];

            this.users = [];

        },


        /* =====================================================
           ROLE
           ===================================================== */

        setInitialPage() {

            if (!this.user) {
                return;
            }


            switch (this.user.role) {

                case "crew":

                    this.page = "crew";

                    break;


                case "inventory":

                    this.page = "inventory";

                    break;


                case "management":

                    this.page = "dashboard";

                    break;


                case "admin":

                    this.page = "admin";

                    break;


                default:

                    this.page = "crew";

            }

        },


        canAccess(page) {

            if (!this.user) {
                return false;
            }


            const role =
                this.user.role;


            if (role === "crew") {

                return [
                    "crew",
                    "sync"
                ].includes(page);

            }


            if (role === "inventory") {

                return [
                    "inventory",
                    "sync"
                ].includes(page);

            }


            if (role === "management") {

                return [
                    "crew",
                    "inventory",
                    "dashboard",
                    "sync"
                ].includes(page);

            }


            if (role === "admin") {

                return [
                    "admin"
                ].includes(page);

            }


            return false;

        },


        goTo(page) {

            if (!this.canAccess(page)) {
                return;
            }


            this.page = page;


            if (page === "dashboard") {

                this.loadDashboard();

            }


            if (page === "inventory") {

                this.loadInventory();

            }


            if (page === "admin") {

                this.loadUsers();

            }

        },


        formatRole(role) {

            if (!role) {
                return "";
            }


            return (

                role.charAt(0).toUpperCase() +

                role.slice(1)

            );

        },


        getInitials(name) {

            if (!name) {
                return "U";
            }


            return name

                .split(" ")

                .filter(Boolean)

                .map(
                    word =>
                        word.charAt(0)
                )

                .join("")

                .substring(0, 2)

                .toUpperCase();

        },


        /* =====================================================
           INITIAL DATA
           ===================================================== */

        async loadInitialData() {

            await Promise.allSettled([

                this.loadFlights(),

                this.loadProducts(),

                this.loadCurrencies()

            ]);


            if (this.selectedFlight) {

                await this.loadInventory();

            }


            if (
                this.canAccess("dashboard")
            ) {

                await this.loadDashboard();

            }


            if (
                this.isAdmin
            ) {

                await this.loadUsers();

            }


            if (
                this.online &&
                this.pendingSales.length
            ) {

                this.autoSync();

            }

        },


        /* =====================================================
           FLIGHTS
           ===================================================== */

        async loadFlights() {

            try {

                const response =
                    await this.apiFetch(
                        "/flights"
                    );


                const data =
                    await response.json()
                        .catch(() => []);


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Failed to load flights."
                    );

                }


                this.flights =
                    Array.isArray(data)
                        ? data
                        : [];


                if (
                    this.flights.length &&
                    !this.selectedFlight
                ) {

                    this.selectedFlight =
                        Number(
                            this.flights[0].id
                        );

                }

            } catch (error) {

                console.error(
                    "Flight loading error:",
                    error
                );

            }

        },


        async createFlight() {

            this.flightError = "";


            if (
                !this.flightForm.flight_number ||
                !this.flightForm.flight_date ||
                !this.flightForm.aircraft ||
                !this.flightForm.origin ||
                !this.flightForm.destination ||
                !this.flightForm.passengers
            ) {

                this.flightError =
                    "Please complete all flight details.";

                return;

            }


            this.creatingFlight = true;


            try {

                const response =
                    await this.apiFetch(

                        "/flights",

                        {

                            method: "POST",

                            body: JSON.stringify(
                                this.flightForm
                            )

                        }

                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to create flight."
                    );

                }


                this.flights.unshift(data);


                this.selectedFlight =
                    Number(data.id);


                this.flightForm = {

                    flight_number: "",

                    flight_date:
                        new Date()
                            .toISOString()
                            .split("T")[0],

                    aircraft: "",

                    passengers: 0,

                    origin: "",

                    destination: ""

                };


                await this.loadInventory();


            } catch (error) {

                this.flightError =
                    error.message;

            } finally {

                this.creatingFlight = false;

            }

        },


        /* =====================================================
           PRODUCTS
           ===================================================== */

        async loadProducts() {

            try {

                const response =
                    await this.apiFetch(
                        "/products"
                    );


                const data =
                    await response.json()
                        .catch(() => []);


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to load products."
                    );

                }


                this.products =
                    Array.isArray(data)

                        ? data.filter(
                            product =>
                                product &&
                                product.id !== undefined &&
                                product.id !== null
                        )

                        : [];

            } catch (error) {

                console.error(
                    "Product loading error:",
                    error
                );

            }

        },


        async createProduct() {

            this.productMessage = "";


            if (
                !this.newProduct.product_code ||
                !this.newProduct.product_name ||
                !this.newProduct.category
            ) {

                this.productMessage =
                    "Please complete product code, name and category.";

                this.productMessageType =
                    "error";

                return;

            }


            this.productSaving = true;


            try {

                const response =
                    await this.apiFetch(

                        "/products",

                        {

                            method: "POST",

                            body: JSON.stringify(
                                this.newProduct
                            )

                        }

                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to create product."
                    );

                }


                this.products.push(data);


                this.newProduct = {

                    product_code: "",

                    product_name: "",

                    category: "",

                    selling_price: 0,

                    cost: 0

                };


                this.productMessage =
                    "Product created successfully.";

                this.productMessageType =
                    "success";

            } catch (error) {

                this.productMessage =
                    error.message;

                this.productMessageType =
                    "error";

            } finally {

                this.productSaving = false;

            }

        },


        /* =====================================================
           INVENTORY
           ===================================================== */

        async loadInventory() {

            if (!this.selectedFlight) {

                this.inventory = [];

                return;

            }


            try {

                const response =
                    await this.apiFetch(

                        `/inventory/${this.selectedFlight}`

                    );


                const data =
                    await response.json()
                        .catch(() => []);


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to load inventory."
                    );

                }


                this.inventory =
                    Array.isArray(data)

                        ? data.filter(
                            item =>
                                item &&
                                item.product_id !== undefined
                        )

                        : [];

            } catch (error) {

                console.error(
                    "Inventory loading error:",
                    error
                );

            }

        },


        getAvailableQuantity(productId) {

            const item =
                this.inventory.find(

                    inventory =>

                        Number(
                            inventory.product_id
                        ) ===
                        Number(productId)

                );


            if (!item) {
                return 0;
            }


            return Math.max(

                0,

                Number(
                    item.remaining_quantity || 0
                )

            );

        },


        async addInventory() {

            this.inventoryMessage = "";


            if (!this.selectedFlight) {

                this.inventoryMessage =
                    "Please select a flight.";

                this.inventoryMessageType =
                    "error";

                return;

            }


            if (!this.inventoryForm.product_id) {

                this.inventoryMessage =
                    "Please select a product.";

                this.inventoryMessageType =
                    "error";

                return;

            }


            const existing =
                this.inventory.find(

                    item =>
                        Number(item.product_id) ===
                        Number(
                            this.inventoryForm.product_id
                        )

                );


            if (existing) {

                this.inventoryMessage =
                    "This product already exists for this flight. Use Edit instead.";

                this.inventoryMessageType =
                    "error";

                return;

            }


            this.inventorySaving = true;


            try {

                const response =
                    await this.apiFetch(

                        `/inventory/${this.selectedFlight}`,

                        {

                            method: "POST",

                            body: JSON.stringify({

                                product_id:
                                    Number(
                                        this.inventoryForm.product_id
                                    ),

                                loaded_quantity:
                                    Number(
                                        this.inventoryForm.loaded_quantity || 0
                                    ),

                                returned_quantity:
                                    Number(
                                        this.inventoryForm.returned_quantity || 0
                                    ),

                                wasted_quantity:
                                    Number(
                                        this.inventoryForm.wasted_quantity || 0
                                    )

                            })

                        }

                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to add inventory."
                    );

                }


                this.inventoryForm = {

                    product_id: null,

                    loaded_quantity: 0,

                    returned_quantity: 0,

                    wasted_quantity: 0

                };


                this.inventoryMessage =
                    "Inventory added successfully.";

                this.inventoryMessageType =
                    "success";


                await this.loadInventory();

            } catch (error) {

                this.inventoryMessage =
                    error.message;

                this.inventoryMessageType =
                    "error";

            } finally {

                this.inventorySaving = false;

            }

        },


        startInventoryEdit(item) {

            this.editingInventoryId =
                item.id;


            this.editingInventory = {

                loaded_quantity:
                    Number(
                        item.loaded_quantity || 0
                    ),

                returned_quantity:
                    Number(
                        item.returned_quantity || 0
                    ),

                wasted_quantity:
                    Number(
                        item.wasted_quantity || 0
                    )

            };

        },


        cancelInventoryEdit() {

            this.editingInventoryId =
                null;

            this.editingInventory = {};

        },


        async saveInventory(item) {

            try {

                const response =
                    await this.apiFetch(

                        `/inventory/${item.id}`,

                        {

                            method: "PUT",

                            body: JSON.stringify({

                                loaded_quantity:
                                    Number(
                                        this.editingInventory
                                            .loaded_quantity || 0
                                    ),

                                returned_quantity:
                                    Number(
                                        this.editingInventory
                                            .returned_quantity || 0
                                    ),

                                wasted_quantity:
                                    Number(
                                        this.editingInventory
                                            .wasted_quantity || 0
                                    )

                            })

                        }

                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to update inventory."
                    );

                }


                this.cancelInventoryEdit();


                await this.loadInventory();

            } catch (error) {

                alert(
                    error.message
                );

            }

        },


        async deleteInventory(item) {

            if (
                !confirm(
                    `Delete ${item.product_name} from this flight inventory?`
                )
            ) {

                return;

            }


            try {

                const response =
                    await this.apiFetch(

                        `/inventory/${item.id}`,

                        {

                            method: "DELETE"

                        }

                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to delete inventory."
                    );

                }


                await this.loadInventory();

            } catch (error) {

                alert(
                    error.message
                );

            }

        },


        /* =====================================================
           CART
           ===================================================== */

        increase(product) {

            if (!product) {
                return;
            }


            const available =
                this.getAvailableQuantity(
                    product.id
                );


            const current =
                Number(
                    this.cart[product.id] || 0
                );


            if (
                current >= available
            ) {

                return;

            }


            this.cart[product.id] =
                current + 1;

        },


        decrease(product) {

            if (!product) {
                return;
            }


            const current =
                Number(
                    this.cart[product.id] || 0
                );


            if (current <= 0) {

                return;

            }


            this.cart[product.id] =
                current - 1;


            if (
                this.cart[product.id] === 0
            ) {

                delete this.cart[
                    product.id
                ];

            }

        },


        /* =====================================================
           CURRENCY
           ===================================================== */

        async loadCurrencies() {

            try {

                const response =
                    await this.apiFetch(
                        "/currencies"
                    );


                const data =
                    await response.json()
                        .catch(() => []);


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to load currencies."
                    );

                }


                this.currencies =
                    Array.isArray(data)
                        ? data
                        : [];

            } catch (error) {

                console.error(
                    "Currency loading error:",
                    error
                );

            }

        },


        async loadExchangeRate() {

            if (!this.selectedCurrency) {
                return;
            }


            this.exchangeLoading = true;

            this.exchangeError = "";


            try {

                const response =
                    await this.apiFetch(

                        `/exchange-rate/${this.selectedCurrency}`

                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to get exchange rate."
                    );

                }


                this.exchangeRate =
                    Number(
                        data.rate || 1
                    );

            } catch (error) {

                this.exchangeError =
                    "Using previous exchange rate.";

            } finally {

                this.exchangeLoading = false;

            }

        },


        /* =====================================================
           SALES
           ===================================================== */

        async recordSale() {

            if (!this.selectedFlight) {

                alert(
                    "Please select a flight."
                );

                return;

            }


            if (
                Number(this.cartTotal || 0) <= 0
            ) {

                return;

            }


            const sales = [];


            for (
                const product
                of this.products
            ) {

                if (!product) {
                    continue;
                }


                const quantity =
                    Number(
                        this.cart[
                            product.id
                        ] || 0
                    );


                if (quantity <= 0) {
                    continue;
                }


                sales.push({

                    transaction_id:
                        this.generateTransactionId(),

                    flight_id:
                        Number(
                            this.selectedFlight
                        ),

                    product_id:
                        Number(
                            product.id
                        ),

                    crew_id:
                        this.user.employee_id,

                    quantity:
                        quantity,

                    unit_price:
                        Number(
                            product.selling_price || 0
                        ),

                    total_amount:
                        quantity *
                        Number(
                            product.selling_price || 0
                        ),

                    payment_method:
                        this.selectedCurrency,

                    transaction_time:
                        new Date().toISOString()

                });

            }


            let offlineCount = 0;


            if (this.online) {

                for (
                    const sale
                    of sales
                ) {

                    try {

                        await this.sendSale(
                            sale
                        );

                    } catch (error) {

                        console.error(
                            "Sale failed:",
                            error
                        );

                        this.addPendingSale(
                            sale
                        );

                        offlineCount++;

                    }

                }

            } else {

                sales.forEach(
                    sale =>
                        this.addPendingSale(
                            sale
                        )
                );

                offlineCount =
                    sales.length;

            }


            this.cart = {};


            await this.loadInventory();


            if (offlineCount > 0) {

                alert(

                    `${offlineCount} transaction(s) saved locally and will synchronize automatically.`

                );

            } else {

                alert(
                    "Sale recorded successfully."
                );

            }

        },


        generateTransactionId() {

            return (

                "OBS-" +

                Date.now() +

                "-" +

                Math.floor(
                    Math.random() * 10000
                )

            );

        },


        async sendSale(sale) {

            const response =
                await this.apiFetch(

                    "/sales",

                    {

                        method: "POST",

                        body:
                            JSON.stringify(
                                sale
                            )

                    }

                );


            const data =
                await response.json()
                    .catch(() => ({}));


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Sale synchronization failed."
                );

            }


            return data;

        },


        /* =====================================================
           OFFLINE
           ===================================================== */

        addPendingSale(sale) {

            const exists =
                this.pendingSales.some(

                    item =>
                        item.transaction_id ===
                        sale.transaction_id

                );


            if (!exists) {

                this.pendingSales.push(
                    sale
                );

            }


            this.savePendingSales();

        },


        savePendingSales() {

            localStorage.setItem(

                STORAGE_PENDING,

                JSON.stringify(
                    this.pendingSales
                )

            );

        },


        handleOnline() {

            this.online = true;


            this.syncMessage =
                "Connection restored. Synchronizing pending transactions...";


            this.autoSync();

        },


        handleOffline() {

            this.online = false;


            this.syncMessage =
                "Offline. Pending transactions will synchronize automatically.";

        },


        async autoSync() {

            if (!this.online) {
                return;
            }


            if (!this.pendingSales.length) {

                this.syncMessage =
                    "All transactions are synchronized.";

                return;

            }


            const pending =
                [...this.pendingSales];


            this.syncMessage =
                `Synchronizing ${pending.length} pending transaction(s)...`;


            let successCount = 0;


            for (
                const sale
                of pending
            ) {

                try {

                    await this.sendSale(
                        sale
                    );


                    this.pendingSales =
                        this.pendingSales.filter(

                            item =>
                                item.transaction_id !==
                                sale.transaction_id

                        );


                    successCount++;


                    this.savePendingSales();

                } catch (error) {

                    console.error(
                        "Synchronization failed:",
                        error
                    );

                }

            }


            if (
                this.pendingSales.length === 0
            ) {

                this.lastSyncTime =
                    new Date()
                        .toLocaleString();


                localStorage.setItem(

                    STORAGE_LAST_SYNC,

                    this.lastSyncTime

                );


                this.syncMessage =

                    successCount > 0

                        ? `${successCount} transaction(s) synchronized successfully.`

                        : "All transactions are synchronized.";

            } else {

                this.syncMessage =

                    `${this.pendingSales.length} transaction(s) are still waiting for synchronization.`;

            }


            await this.loadInventory();

        },


        /* =====================================================
           DASHBOARD
           ===================================================== */

        async loadDashboard() {

            try {

                let url =
                    `/dashboard?year=${this.dashboardFilter.year}`;


                if (
                    this.dashboardFilter.month !== null &&
                    this.dashboardFilter.month !== undefined
                ) {

                    url +=
                        `&month=${this.dashboardFilter.month}`;

                }


                if (
                    this.dashboardFilter.day !== null &&
                    this.dashboardFilter.day !== undefined
                ) {

                    url +=
                        `&day=${this.dashboardFilter.day}`;

                }


                const response =
                    await this.apiFetch(
                        url
                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Dashboard loading failed."
                    );

                }


                this.dashboard = data;


                if (this.chartVisible) {

                    this.$nextTick(() => {

                        this.renderChart();

                    });

                }

            } catch (error) {

                console.error(
                    "Dashboard error:",
                    error
                );

            }

        },


        resetDashboardFilter() {

            this.dashboardFilter = {

                year:
                    new Date().getFullYear(),

                month: null,

                day: null

            };


            this.loadDashboard();

        },


        toggleChart() {

            this.chartVisible =
                !this.chartVisible;

        },


        renderChart() {

            const canvas =
                document.getElementById(
                    "flightPerformanceChart"
                );


            if (!canvas) {
                return;
            }


            if (
                typeof Chart ===
                "undefined"
            ) {

                return;

            }


            this.destroyChart();


            const flights =
                this.dashboard.flights || [];


            const labels =
                flights.map(

                    flight =>
                        flight.flight_number

                );


            const values =
                flights.map(

                    flight =>

                        this.chartType === "line"

                            ? Number(
                                flight.rpp || 0
                            )

                            : Number(
                                flight.revenue || 0
                            )

                );


            this.chartInstance =
                new Chart(

                    canvas.getContext("2d"),

                    {

                        type:
                            this.chartType === "line"
                                ? "line"
                                : "bar",

                        data: {

                            labels,

                            datasets: [

                                {

                                    label:
                                        this.chartType === "line"
                                            ? "RPP"
                                            : "Revenue",

                                    data:
                                        values,

                                    borderWidth:
                                        2,

                                    tension:
                                        0.3,

                                    fill:
                                        this.chartType === "line"
                                            ? false
                                            : true

                                }

                            ]

                        },

                        options: {

                            responsive: true,

                            maintainAspectRatio:
                                false,

                            plugins: {

                                legend: {

                                    display: true

                                }

                            },

                            scales: {

                                y: {

                                    beginAtZero:
                                        true

                                }

                            }

                        }

                    }

                );

        },


        destroyChart() {

            if (
                this.chartInstance
            ) {

                this.chartInstance.destroy();

                this.chartInstance =
                    null;

            }

        },


        /* =====================================================
           ADMIN - USERS
           ===================================================== */

        async loadUsers() {

            if (!this.isAdmin) {
                return;
            }


            try {

                const response =
                    await this.apiFetch(
                        "/users"
                    );


                const data =
                    await response.json()
                        .catch(() => []);


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to load users."
                    );

                }


                this.users =
                    Array.isArray(data)
                        ? data
                        : [];

            } catch (error) {

                console.error(
                    "User loading error:",
                    error
                );

            }

        },


        async createUser() {

            this.userMessage = "";


            if (
                !this.newUser.employee_id ||
                !this.newUser.name ||
                !this.newUser.password ||
                !this.newUser.role
            ) {

                this.userMessage =
                    "Please complete all user fields.";

                this.userMessageType =
                    "error";

                return;

            }


            this.creatingUser = true;


            try {

                const response =
                    await this.apiFetch(

                        "/users",

                        {

                            method: "POST",

                            body:
                                JSON.stringify(
                                    this.newUser
                                )

                        }

                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to create user."
                    );

                }


                this.userMessage =
                    "User created successfully.";

                this.userMessageType =
                    "success";


                this.newUser = {

                    employee_id: "",

                    name: "",

                    password: "",

                    role: "crew"

                };


                await this.loadUsers();

            } catch (error) {

                this.userMessage =
                    error.message;

                this.userMessageType =
                    "error";

            } finally {

                this.creatingUser = false;

            }

        },


        startUserEdit(account) {

            this.editingUserId =
                account.id;


            this.editingUser = {

                name:
                    account.name,

                role:
                    account.role

            };

        },


        cancelUserEdit() {

            this.editingUserId =
                null;

            this.editingUser = {};

        },


        async saveUser(account) {

            try {

                const response =
                    await this.apiFetch(

                        `/users/${account.id}`,

                        {

                            method: "PUT",

                            body:
                                JSON.stringify({

                                    name:
                                        this.editingUser.name,

                                    role:
                                        this.editingUser.role

                                })

                        }

                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to update user."
                    );

                }


                this.cancelUserEdit();


                await this.loadUsers();


                /*
                 * If the current user's account
                 * was changed, refresh local session.
                 */

                if (
                    account.employee_id ===
                    this.user.employee_id
                ) {

                    this.user =
                        data;

                    localStorage.setItem(

                        STORAGE_USER,

                        JSON.stringify(
                            this.user
                        )

                    );

                    this.setInitialPage();

                }

            } catch (error) {

                alert(
                    error.message
                );

            }

        },


        async changePassword(account) {

            const password =
                prompt(
                    `Enter new password for ${account.employee_id}:`
                );


            if (
                password === null
            ) {

                return;

            }


            if (
                password.trim().length < 4
            ) {

                alert(
                    "Password must contain at least 4 characters."
                );

                return;

            }


            try {

                const response =
                    await this.apiFetch(

                        `/users/${account.id}/password`,

                        {

                            method: "PUT",

                            body:
                                JSON.stringify({

                                    password:
                                        password

                                })

                        }

                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to change password."
                    );

                }


                alert(
                    "Password changed successfully."
                );

            } catch (error) {

                alert(
                    error.message
                );

            }

        },


        async deleteUser(account) {

            if (
                account.employee_id ===
                this.user.employee_id
            ) {

                alert(
                    "You cannot delete your own administrator account."
                );

                return;

            }


            if (
                !confirm(

                    `Delete user ${account.employee_id} (${account.name})?`

                )
            ) {

                return;

            }


            try {

                const response =
                    await this.apiFetch(

                        `/users/${account.id}`,

                        {

                            method: "DELETE"

                        }

                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to delete user."
                    );

                }


                await this.loadUsers();

            } catch (error) {

                alert(
                    error.message
                );

            }

        },


        /* =====================================================
           ROLE INFORMATION
           ===================================================== */

        roleTitle(role) {

            const titles = {

                crew:
                    "Crew Access",

                inventory:
                    "Inventory Access",

                management:
                    "Management Access",

                admin:
                    "Administrator Access"

            };


            return (

                titles[role] ||
                "System Access"

            );

        },


        roleDescription(role) {

            const descriptions = {

                crew:
                    "Crew users can record onboard sales and synchronize transactions.",

                inventory:
                    "Inventory users can add, edit and delete flight inventory and products.",

                management:
                    "Management users can access sales, inventory and the management dashboard.",

                admin:
                    "Administrators can manage users, roles and passwords."

            };


            return (

                descriptions[role] ||
                ""

            );

        }

    }

}).mount("#app");