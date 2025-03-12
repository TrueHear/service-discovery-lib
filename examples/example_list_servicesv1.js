const mdns_lib = require('../src/mdns_lib');

const options = {
    mdns_address: '224.0.0.251',
    mdns_port: 5353,
    interface: '169.254.137.22',
    service_query: '_smart_ip._tcp',
    timeout: 2000, // Dynamic timeout (can be changed)
    on_service_found: (service) => {
        console.log('Service discovered:', service);
    }
};

// Start the search for mDNS services and wait for the timeout before logging the results
(async () => {
    try {
        console.log('Starting mDNS search...');
        const uniqueServices = await mdns_lib.search_mdns_servicesmv1(options);
        console.log('Search complete. Unique services found:', uniqueServices);
    } catch (error) {
        console.error('Error during mDNS search:', error);
    }
})();
