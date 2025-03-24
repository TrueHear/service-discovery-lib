# Service Discovery Library

A lightweight **Node.js** library for discovering smart IP devices (such as Genelec speakers or other PoE devices) using **mDNS (Multicast DNS)**. This library offers both callback-based and async/await (Promise-based) APIs along with an interactive CLI for device discovery on your local network.

---

## Overview

This library allows you to:

- Discover smart IP devices by querying specific mDNS services.
- Parse mDNS messages including PTR, SRV, TXT, and A records.
- Filter and track unique devices using a Map.
- Choose network interfaces by filtering based on IP version (IPv4, IPv6, or Both) and internal/external status.
- Control the search duration via a configurable timeout.
- Use either a modern async/await approach or the older callback-based API.

---

## Features

- **mDNS Service Discovery:** Find smart IP devices on your network.
- **Async/Await Support:** Use `search_mdns_servicesmv1` for a modern, promise-based API.
- **Callback-Based Discovery:** Use `search_mdns_services` for a traditional callback approach.
- **Dynamic Timeout:** Configure search duration (default: 5000ms).
- **Interface Filtering:** Filter by IP version (IPv4/IPv6/Both) and by internal vs. non-internal interfaces.
- **Unique Device Tracking:** Duplicates are automatically filtered out.
- **Interactive CLI:** A fully interactive command-line tool for listing interfaces and performing device searches.
- **Robust Error Handling:** Graceful exit on Ctrl+C and detailed error messages.

---

## Installation

Install via **npm**:

```bash
npm install service-discovery-lib
```

For local development, see the [Local Testing](#local-testing) section below.

---

## Usage

### Async/Await API (v1)

The new `search_mdns_servicesmv1` function returns a Promise that resolves with an array of unique devices after the search timeout.

#### **Example:**

```js
const { search_mdns_servicesmv1, list_interfaces } = require('service-discovery-lib');

(async () => {
    // List available network interfaces
    const interfaces = list_interfaces();
    console.log('Available network interfaces:');
    console.log(interfaces);
    
    // Define options for discovery
    const options = {
        timeout: 5000,                    // Search duration in milliseconds
        service_query: '_smart_ip._tcp',  // mDNS service query
        interface: interfaces[0].address, // Use the first available interface
        mdns_address: '224.0.0.251',        // mDNS multicast address
        mdns_port: 5353                   // mDNS port
    };

    try {
        console.log('Starting smart IP device discovery...');
        const devices = await search_mdns_servicesmv1(options);
        console.log('Discovery complete. Unique devices found:');
        console.log(devices);
    } catch (error) {
        console.error('Error during mDNS search:', error);
    }
})();
```

#### **Sample Response:**

```json
[
  {
    "name": "Genelec-1",
    "addresses": ["192.168.1.105"],
    "port": 5353,
    "properties": { "location": "Office", "model": "1234" }
  },
  {
    "name": "Genelec-2",
    "addresses": ["192.168.1.106"],
    "port": 5353,
    "properties": { "location": "Studio", "model": "5678" }
  }
]
```

---

### Callback-Based API (v0)

If you prefer a callback-based approach, use `search_mdns_services`. It relies on callbacks for processing each discovered service and for signaling when the search is complete.

#### **Example:**

```js
const { search_mdns_services } = require('service-discovery-lib');

const options = {
    timeout: 5000,
    service_query: '_smart_ip._tcp',
    interface: 'YOUR_LOCAL_INTERFACE_IP',
    mdns_address: '224.0.0.251',
    mdns_port: 5353,
    on_service_found: (service) => {
        console.log('Smart IP device found:', service);
    },
    on_search_complete: (devices) => {
        console.log('Discovery finished. Unique devices found:');
        console.log(devices);
    }
};

search_mdns_services(options);
```

#### **Sample Response:**

As devices are discovered, you might see:

```
Smart IP device found: { name: 'Genelec-1', port: 5353, addresses: [ '192.168.1.105' ], properties: { location: 'Office' } }
Smart IP device found: { name: 'Genelec-2', port: 5353, addresses: [ '192.168.1.106' ], properties: { location: 'Studio' } }
Discovery finished. Unique devices found: [ ... ]
```

---

### Listing Network Interfaces

The `list_interfaces` function returns an array of network interface objects containing details such as name, address, family, MAC, and whether the interface is internal.

#### **Example:**

```js
const { list_interfaces } = require('service-discovery-lib');

const interfaces = list_interfaces();
console.log('Network interfaces:', interfaces);
```

#### **Sample Response:**

```json
[
  {
    "name": "eth0",
    "address": "192.168.1.100",
    "family": "IPv4",
    "mac": "00:1a:2b:3c:4d:5e",
    "internal": false
  },
  {
    "name": "lo",
    "address": "127.0.0.1",
    "family": "IPv4",
    "mac": "00:00:00:00:00:00",
    "internal": true
  }
]
```

---

## CLI Usage

An interactive CLI tool is provided in the `bin` directory as `smart-ip-cli.js`. This CLI allows you to:

- **List Network Interfaces:** View details (name, address, family, MAC, and internal flag) of all available interfaces.
- **Search for Devices:** Select the IP version (IPv4, IPv6, or Both), filter interfaces by internal status, and customize parameters like mDNS address, port, service query, and timeout.
- **Graceful Exit:** Exit the tool cleanly using Ctrl+C or through menu options.

#### **To run the CLI:**

1. Ensure the CLI file is executable:

   ```bash
   chmod +x bin/smart-ip-cli.js
   ```

2. Run it directly:

   ```bash
   ./bin/smart-ip-cli.js
   ```

   Or, if configured in your `package.json` under the `"bin"` field, run:

   ```bash
   smart-ip
   ```

#### CLI Interface

For detailed instructions on how to install and use the CLI tool globally, please see the [Smart IP CLI Interface Documentation](./CLI-Readme.md).

---

## API Documentation

### `search_mdns_servicesmv1(options)`

- **Description:** Asynchronously searches for mDNS devices using the provided options. Returns a Promise that resolves with an array of unique devices.
- **Parameters:**
  - `timeout` (Number): Duration of the search in milliseconds (default: 5000).
  - `service_query` (String): The mDNS service to query (e.g., `_smart_ip._tcp`).
  - `interface` (String): IP address of the network interface to use.
  - `mdns_address` (String): Multicast address for mDNS (default: `'224.0.0.251'`).
  - `mdns_port` (Number): Port for mDNS (default: `5353`).
  - `on_service_found` (Function, Optional): Callback for each discovered device.
- **Returns:** A Promise that resolves with an array of unique devices.
- **Usage:** See the Async/Await API example above.

### `search_mdns_services(options)`

- **Description:** Callback-based version for searching mDNS devices.
- **Parameters:** Same as above, plus:
  - `on_search_complete` (Function): Callback invoked after the timeout with the unique devices array.
- **Usage:** See the Callback-Based API example above.

### `list_interfaces()`

- **Description:** Returns an array of network interface objects. Each object contains properties like:
  - `name`: Interface name.
  - `address`: IP address.
  - `family`: IP family (e.g., 'IPv4' or 'IPv6').
  - `mac`: MAC address.
  - `internal`: Boolean indicating if the interface is internal (loopback).
- **Usage:** See the Listing Network Interfaces example above.

---

## Local Testing

For local development:

1. **Link the Library:**

   ```bash
   npm link
   ```

2. **In Your Test Project:**

   ```bash
   npm link service-discovery-lib
   ```

3. **Create a Test File (e.g., `test.js`) and run it:**

   ```bash
   node test.js
   ```

---

## Contributing

Contributions, bug reports, and feature requests are welcome!  
Feel free to submit a **Pull Request (PR)** or open an issue on the repository.

---

## Contact

For support or inquiries, contact: [truehearteam@gmail.com](mailto:truehearteam@gmail.com).

---

## Disclaimer

This library is intended for discovering smart IP devices (such as Genelec speakers or similar PoE devices) via mDNS on local networks. Ensure that multicast traffic is enabled and your devices are configured to respond to mDNS queries.

---

## What’s New in v1?

- **Async/Await Support:** Use `search_mdns_servicesmv1` for a clean, promise-based workflow.
- **Enhanced Error Handling:** Improved validations and logging for a smoother experience.
- **Flexible Interface Filtering:** Choose between IPv4, IPv6, or both; filter by internal or non-internal interfaces.
- **Interactive CLI:** User-friendly CLI tool for listing interfaces and discovering devices.
- **Improved Duplicate Filtering:** Automatically filters duplicates using a Map.

Upgrade to v1 for a modern, efficient device discovery experience!
