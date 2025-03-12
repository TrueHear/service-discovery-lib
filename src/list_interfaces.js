const os = require('os');

/**
 * Retrieves a list of available network interfaces on the computer.
 *
 * This function uses Node.js's built-in `os.networkInterfaces()` method to obtain
 * the available interfaces. Each interface is represented as an object containing
 * properties such as the interface name, IP address, address family, MAC address, and
 * whether it is an internal (loopback) interface.
 *
 * @returns {Array<Object>} An array of network interface objects.
 * Each object has the following structure:
 * {
 *   name: string,      // The name of the interface (e.g. 'eth0', 'Wi-Fi')
 *   address: string,   // The IP address assigned to the interface
 *   family: string,    // The IP address family ('IPv4' or 'IPv6')
 *   mac: string,       // The MAC address of the interface
 *   internal: boolean  // True if the interface is internal (e.g. loopback)
 * }
 *
 * @throws Will throw an error if there is an issue retrieving the network interfaces.
 */
function list_interfaces() {
    try {
        const interfaces = os.networkInterfaces();
        const result = [];

        // Iterate over each interface
        for (const name in interfaces) {
            const iface = interfaces[name];
            // Some interfaces may have multiple addresses (IPv4, IPv6)
            for (const alias of iface) {
                result.push({
                    name,
                    address: alias.address,
                    family: alias.family,
                    mac: alias.mac,
                    internal: alias.internal,
                });
            }
        }
        return result;
    } catch (error) {
        throw new Error(`Error retrieving network interfaces: ${error.message}`);
    }
}

module.exports = {
    list_interfaces,
};
