const { list_interfaces } = require('../src/list_interfaces');

try {
    const interfaces = list_interfaces();
    console.log('[+] Available network interfaces:');
    interfaces.forEach((iface) => {
        console.log(`[+] Name: ${iface.name}`);
        console.log(`[+] Address: ${iface.address}`);
        console.log(`[+] Family: ${iface.family}`);
        console.log(`[+] MAC: ${iface.mac}`);
        console.log(`[+] Internal: ${iface.internal}`);
        console.log('---------------------------');
    });
} catch (error) {
    console.error('Failed to list interfaces:', error.message);
}
