const mdns_lib = require('../src/mdns_lib');

const options = {
    mdns_address: '224.0.0.251',
    mdns_port: 5353,
    interface: '169.254.137.22',
    service_query: '_smart_ip._tcp',
    timeout: 2000, // dynamic timeout (can be changed)
    on_service_found: (service) => {
        console.log('Service discovered:', service);
    },
    on_search_complete: (uniqueServices) => {
        console.log('Search complete. Unique services:', uniqueServices);
    }
};

// Start the search for mDNS services with a timeout and track unique services.
mdns_lib.search_mdns_services(options);
