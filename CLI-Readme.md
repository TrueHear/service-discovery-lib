# Smart IP CLI Interface

The **Smart IP CLI Interface** allows you to discover smart IP devices (e.g., Genelec speakers or similar PoE devices) on your local network via mDNS in an interactive, user-friendly way.

## Global Installation

To install the CLI tool globally, run:

```bash
npm install -g service-discovery-lib
```

This command installs the package globally and creates a symlink for the CLI command defined in your package’s `bin` field (e.g., `smart-ip`).

## Using the CLI

Once installed globally, you can launch the CLI by running:

```bash
smart-ip
```

### What to Expect

- **Main Menu:**  
  When you run `smart-ip`, you’ll see a main menu offering options to:
  - **List Network Interfaces:** View available interfaces with details (name, IP address, family, etc.).
  - **Search for smart_ip Devices:** Start a guided discovery process with customizable options.
  - **Exit:** Close the CLI tool gracefully.

- **Interactive Prompts:**  
  The CLI will prompt you to select:
  - The IP version to include (IPv4, IPv6, or Both).
  - Whether to filter by all, internal, or non-internal interfaces.
  - The specific network interface you’d like to use.
  - Custom values such as service query (default: `_smart_ip._tcp`), search timeout (in ms), mDNS address (default: `224.0.0.251`), and mDNS port (default: `5353`).

- **Search Results:**  
  After configuring your options, the tool performs an mDNS search and displays discovered devices in a formatted list with details like:
  - Device name
  - IP addresses
  - Port
  - Additional properties

- **Graceful Exit:**  
  You can exit the CLI at any time by choosing the “Exit” option or by pressing **Ctrl+C**, which terminates the process cleanly.

## Example Session

1. **Launch the CLI:**

   ```bash
   smart-ip
   ```

2. **Select an Option:**  
   You might see a prompt like:

   ```
   ? What would you like to do? 
     › 📡 List Network Interfaces 
       🔍 Search for smart_ip Devices 
       ❌ Exit
   ```

3. **Device Discovery:**  
   If you select **Search for smart_ip Devices**, you’ll be guided through prompts such as:

   ```
   ? Select IP version to include: (Use arrow keys)
     › IPv4
       IPv6
       Both

   ? Select interface filtering mode:
     › All interfaces
       Non-internal interfaces
       Internal interfaces

   ? Select the network interface to use:
     › eth0 (192.168.1.100) [IPv4]
       lo (127.0.0.1) [IPv4]
   ```

4. **Enter Custom Options:**  
   Then enter the service query, timeout, mDNS address, and port. Defaults are provided, so you can simply press **Enter** if you’re okay with the defaults.

5. **View Results:**  
   After a short search period, the CLI displays the discovered devices with their details.

## Troubleshooting

- **Ctrl+C Handling:**  
  If you need to cancel the process at any point, press **Ctrl+C**. The CLI is designed to exit gracefully without error messages.

- **Updating:**  
  If you make changes to your local package and wish to test updates, use `npm link` in development. Then re-install globally if needed.

## Conclusion

The **Smart IP CLI Interface** is a quick and interactive way to discover mDNS-enabled devices on your network. It simplifies the process with guided prompts and clear output—making device discovery easy and efficient.

For further details or contributions, please refer to the repository's documentation.
