# **Service Discovery Library**

A lightweight **Node.js** library for discovering **Genelec speakers** that use **PoE (Power over Ethernet)** via **mDNS (Multicast DNS).**

---

## **Overview**

This library provides an easy-to-use API for discovering **Genelec speakers** and other **mDNS-enabled devices** on your local network. It allows querying **specific service types**, parsing mDNS messages, filtering unique devices, and customizing network settings.  

With the introduction of **`search_mdns_servicesmv1`**, you can now use an **async/await approach** for better control over your discovery process.

---

## **Features**

✅ **mDNS Service Discovery:** Find **Genelec speakers (or similar devices)** on your network.  
✅ **Async/Await Support:** **New in v1!** `search_mdns_servicesmv1` allows async discovery.  
✅ **DNS Message Parsing:** Supports **PTR, SRV, TXT, and A records** from mDNS responses.  
✅ **Dynamic Timeout:** Configurable timeout (default **5000ms**) to control search duration.  
✅ **Unique Device Tracking:** Uses a **Map** to filter out duplicate discoveries.  
✅ **Network Interface Selection:** Allows specifying a network interface for multicast traffic.  
✅ **Error Handling & Validations:** Checks callback types, validates timeout values, and improves logging.  
✅ **Modular & Extendable:** Easy to integrate into **Node.js** projects.  

---

## **Installation**

Install via **npm**:

```bash
npm install service-discovery-lib
```

For local development, see [Local Testing](#local-testing).

---

## **Usage**

### **v1: New Async Approach (`search_mdns_servicesmv1`)**

The **new version (`search_mdns_servicesmv1`)** allows you to **await** the discovery results after the timeout period.

```js
const { search_mdns_servicesmv1, list_interfaces } = require('service-discovery-lib');

(async () => {
    console.log('Available network interfaces:');
    list_interfaces().forEach((iface) => {
        console.log(`${iface.name}: ${iface.address} (${iface.family})`);
    });

    const options = {
        timeout: 5000, // Search duration in milliseconds
        service_query: '_genelec_poE._tcp', // Service query for Genelec speakers
        interface: 'YOUR_LOCAL_INTERFACE_IP', // (Optional) Specify a network interface
        on_service_found: (service) => {
            console.log('Genelec Speaker Found:', service);
        }
    };

    try {
        console.log('Starting Genelec Speaker Discovery...');
        const uniqueSpeakers = await search_mdns_servicesmv1(options);
        console.log('Discovery Complete. Unique Speakers Found:', uniqueSpeakers);
    } catch (error) {
        console.error('Error during mDNS search:', error);
    }
})();
```

✅ **Advantages of v1 (`search_mdns_servicesmv1`)**:

- **Fully asynchronous** (uses `await`).
- **Returns a `Promise`** with the unique service list after the timeout.
- **Avoids callback nesting** (cleaner and easier to use).
- **Safer error handling** and **better logging**.

---

### **v0: Previous Callback-Based Method (`search_mdns_services`)**

The **older version (`search_mdns_services`)** relies on **callbacks** instead of async/await.

```js
const { search_mdns_services } = require('service-discovery-lib');

const options = {
    timeout: 5000,
    service_query: '_genelec_poE._tcp',
    interface: 'YOUR_LOCAL_INTERFACE_IP',
    on_service_found: (service) => {
        console.log('Genelec Speaker Found:', service);
    },
    on_search_complete: (uniqueServices) => {
        console.log('Discovery Finished. Unique Speakers:', uniqueServices);
    }
};

// Start discovery (without async/await)
search_mdns_services(options);
```

⚠️ **Limitations of v0 (`search_mdns_services`)**:

- **No `await` support** (must rely on callbacks).
- **Immediate function execution** (does not return a `Promise`).
- **Callback-based approach** can be less readable in complex workflows.

---

## **API Comparison: v0 vs v1**

| Feature | `search_mdns_services` (Old) | `search_mdns_servicesmv1` (New) |
|---------|------------------------------|---------------------------------|
| API Type | **Callback-based** | **Async/Await-based** |
| Returns | Nothing (triggers `on_search_complete`) | **Promise** (await results) |
| Timeout Handling | Calls `on_search_complete` | **Resolves after timeout** |
| Duplicate Filtering | Uses a `Map` | **Same (uses a `Map`)** |
| Logging | Basic | **Structured debugging logs** |
| Error Handling | Limited | **Improved type checking & validation** |

🚀 **Recommendation:** **Use `search_mdns_servicesmv1`** for a modern, async workflow.

---

## **Customization**

| Option | Description |
|--------|-------------|
| `timeout` | Timeout duration in **milliseconds** (default: `5000`) |
| `service_query` | The **mDNS service** being queried (e.g., `_genelec_poE._tcp`) |
| `interface` | **Specify a network interface** (optional) |
| `on_service_found` | Callback for **each discovered** service |
| `on_search_complete` | Callback **after timeout** with unique results (**only in v0**) |

---

## **Local Testing**

For local development:

### **1. In Your Library Directory**

Run:

```bash
npm link
```

### **2. In Your Test Project Directory**

Navigate to your test project and link the library:

```bash
npm link service-discovery-lib
```

Then create a test file (`test.js`) and run:

```bash
node test.js
```

---

## **Contributing**

We welcome **feature requests, bug reports, and contributions**!  
Feel free to submit a **Pull Request (PR)** or **open an issue**.

---

## **Contact**

📧 For support, contact **[truehearteam@example.com](mailto:truehearteam@example.com)**.

---

## **Disclaimer**

This library is **intended for discovering Genelec speakers (or similar PoE devices)** via **mDNS** on a **local network**.  
Ensure **multicast traffic is enabled** and your **devices respond to mDNS queries**.

---

### **What’s New in v1?**

✅ **Now supports `async/await`** for a smoother workflow!  
✅ **Better error handling** and **structured logging**.  
✅ **Automatically filters out duplicates** using a `Map`.  
✅ **Easy to integrate into modern JavaScript projects**.  

🚀 **Upgrade to `search_mdns_servicesmv1` today!**
