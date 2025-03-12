const dgram = require('dgram');

/**
 * Build a DNS query packet for the specified mDNS service.
 *
 * @param {string} [service_query='_smart_ip._tcp'] - The mDNS service query.
 * @returns {Buffer} The DNS query packet.
 * @throws Will throw an error if the query cannot be built.
 */
function build_query(service_query = '_smart_ip._tcp') {
    try {
        const full_service_query = service_query + '.local';
        const header = Buffer.alloc(12);
        header.writeUInt16BE(0, 0);      // ID = 0 (mDNS uses 0)
        header.writeUInt16BE(0, 2);      // Flags = 0
        header.writeUInt16BE(1, 4);      // QDCOUNT = 1
        header.writeUInt16BE(0, 6);      // ANCOUNT = 0
        header.writeUInt16BE(0, 8);      // NSCOUNT = 0
        header.writeUInt16BE(0, 10);     // ARCOUNT = 0

        // Build the QNAME for the full service query (e.g. "_smart_ip._tcp.local")
        const qname_parts = full_service_query.split('.');
        let qname_buffer_array = [];
        for (const part of qname_parts) {
            if (!part) continue;
            const len = Buffer.alloc(1);
            len.writeUInt8(part.length, 0);
            qname_buffer_array.push(len);
            qname_buffer_array.push(Buffer.from(part));
        }
        // Terminate with a zero byte
        qname_buffer_array.push(Buffer.from([0]));
        const qname_buffer = Buffer.concat(qname_buffer_array);

        // Question section: QTYPE (PTR = 12) and QCLASS (IN = 1)
        const question = Buffer.alloc(4);
        question.writeUInt16BE(12, 0);
        question.writeUInt16BE(1, 2);

        return Buffer.concat([header, qname_buffer, question]);
    } catch (error) {
        throw new Error(`Error building query: ${error.message}`);
    }
}

/**
 * Reads a domain name from a buffer, supporting DNS compression.
 *
 * @param {Buffer} buffer - The buffer to read from.
 * @param {number} offset - The offset in the buffer.
 * @returns {{name: string, read_bytes: number}} The domain name and the number of bytes read.
 * @throws Will throw an error if the name cannot be read.
 */
function read_name(buffer, offset) {
    try {
        let labels = [];
        let jumped = false;
        let original_offset = offset;
        while (true) {
            const length = buffer.readUInt8(offset);
            if (length === 0) {
                offset += 1;
                break;
            }
            // Check for pointer (two highest bits set)
            if ((length & 0xC0) === 0xC0) {
                const pointer = ((length & 0x3F) << 8) | buffer.readUInt8(offset + 1);
                if (!jumped) {
                    original_offset = offset + 2;
                }
                offset = pointer;
                jumped = true;
                continue;
            }
            offset += 1;
            const label = buffer.toString('utf8', offset, offset + length);
            labels.push(label);
            offset += length;
        }
        return { name: labels.join('.'), read_bytes: jumped ? original_offset : offset };
    } catch (error) {
        throw new Error(`Error reading name from buffer: ${error.message}`);
    }
}

/**
 * Parses a single DNS record from the buffer starting at the given offset.
 *
 * @param {Buffer} buffer - The buffer containing the DNS record.
 * @param {number} offset - The starting offset.
 * @returns {object} The parsed DNS record and the new offset.
 * @throws Will throw an error if the record cannot be parsed.
 */
function parse_record(buffer, offset) {
    try {
        const name_result = read_name(buffer, offset);
        const name = name_result.name;
        offset = name_result.read_bytes;

        const type = buffer.readUInt16BE(offset);
        offset += 2;
        const cls = buffer.readUInt16BE(offset);
        offset += 2;
        const ttl = buffer.readUInt32BE(offset);
        offset += 4;
        const rdlength = buffer.readUInt16BE(offset);
        offset += 2;

        let rdata;
        if (type === 12) { // PTR record
            rdata = read_name(buffer, offset).name;
        } else if (type === 33) { // SRV record
            const priority = buffer.readUInt16BE(offset);
            const weight = buffer.readUInt16BE(offset + 2);
            const port = buffer.readUInt16BE(offset + 4);
            const target = read_name(buffer, offset + 6).name;
            rdata = { priority, weight, port, target };
        } else if (type === 16) { // TXT record
            let txts = {};
            const end = offset + rdlength;
            while (offset < end) {
                const txt_len = buffer.readUInt8(offset);
                offset += 1;
                const txt = buffer.toString('utf8', offset, offset + txt_len);
                offset += txt_len;
                const equal_index = txt.indexOf('=');
                if (equal_index !== -1) {
                    const key = txt.substring(0, equal_index);
                    const value = txt.substring(equal_index + 1);
                    txts[key] = value;
                } else {
                    txts[txt] = true;
                }
            }
            rdata = txts;
            return { name, type, cls, ttl, rdlength, rdata, offset };
        } else if (type === 1) { // A record
            const ip_bytes = [];
            for (let i = 0; i < rdlength; i++) {
                ip_bytes.push(buffer.readUInt8(offset + i));
            }
            rdata = ip_bytes.join('.');
        } else {
            rdata = buffer.slice(offset, offset + rdlength);
        }
        offset += rdlength;
        return { name, type, cls, ttl, rdlength, rdata, offset };
    } catch (error) {
        throw new Error(`Error parsing record: ${error.message}`);
    }
}

/**
 * Parses a complete DNS message from a buffer.
 *
 * @param {Buffer} buffer - The buffer containing the DNS message.
 * @returns {object} An object containing the header and parsed records.
 * @throws Will throw an error if the DNS message cannot be parsed.
 */
function parse_dns_message(buffer) {
    try {
        const header = {
            id: buffer.readUInt16BE(0),
            flags: buffer.readUInt16BE(2),
            qdcount: buffer.readUInt16BE(4),
            ancount: buffer.readUInt16BE(6),
            nscount: buffer.readUInt16BE(8),
            arcount: buffer.readUInt16BE(10),
        };
        let offset = 12;

        // Skip question section
        for (let i = 0; i < header.qdcount; i++) {
            const res = read_name(buffer, offset);
            offset = res.read_bytes + 4; // Skip QTYPE and QCLASS
        }

        const records = [];
        const total_records = header.ancount + header.nscount + header.arcount;
        for (let i = 0; i < total_records; i++) {
            const record = parse_record(buffer, offset);
            records.push(record);
            offset = record.offset;
        }
        return { header, records };
    } catch (error) {
        throw new Error(`Error parsing DNS message: ${error.message}`);
    }
}

/**
 * Checks if a given service name is associated with the smart_ip service.
 *
 * @param {string} name - The service instance name.
 * @param {string} full_service_query - The full service query (e.g. '_smart_ip._tcp.local').
 * @returns {boolean} True if the name is associated with the smart_ip service.
 * @throws Will throw an error if the check fails.
 */
function is_smart_ip_service(name, full_service_query) {
    try {
        return name === full_service_query || name.endsWith('.' + full_service_query);
    } catch (error) {
        throw new Error(`Error checking smart IP service: ${error.message}`);
    }
}

/**
 * Starts an mDNS listener to query and discover smart_ip services.
 *
 * @param {object} [options] - Options for the mDNS listener.
 * @param {string} [options.mdns_address='224.0.0.251'] - The mDNS multicast address.
 * @param {number} [options.mdns_port=5353] - The mDNS port.
 * @param {string} [options.interface='169.254.137.22'] - The local network interface IP address.
 * @param {string} [options.service_query='_smart_ip._tcp'] - The service query.
 * @param {function} [options.on_service_found] - Callback invoked when a service is found.
 * @returns {dgram.Socket} The UDP socket used for mDNS.
 */
function start_mdns_listener(options = {}) {
    const mdns_address = options.mdns_address || '224.0.0.251';
    const mdns_port = options.mdns_port || 5353;
    const local_interface = options.interface || '169.254.137.22';
    const service_query = options.service_query || '_smart_ip._tcp';
    const full_service_query = service_query + '.local';
    const on_service_found = typeof options.on_service_found === 'function' ? options.on_service_found : null;

    // Object to hold discovered services by name.
    const services = {};
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    socket.on('message', (msg, rinfo) => {
        console.log(`\nReceived mDNS response from ${rinfo.address}:${rinfo.port}`);
        try {
            const parsed = parse_dns_message(msg);
            // Process each record and register only those related to our service.
            for (const rec of parsed.records) {
                // PTR record: links the query to a service instance name.
                if (rec.type === 12 && rec.name === full_service_query) {
                    const service_instance = rec.rdata;
                    if (!services[service_instance]) {
                        services[service_instance] = { name: service_instance };
                    }
                }
                // SRV record: provides target and port.
                else if (rec.type === 33 && is_smart_ip_service(rec.name, full_service_query)) {
                    if (!services[rec.name]) {
                        services[rec.name] = { name: rec.name };
                    }
                    services[rec.name].port = rec.rdata.port;
                    services[rec.name].target = rec.rdata.target;
                }
                // TXT record: holds additional properties.
                else if (rec.type === 16 && is_smart_ip_service(rec.name, full_service_query)) {
                    if (!services[rec.name]) {
                        services[rec.name] = { name: rec.name };
                    }
                    services[rec.name].txt = rec.rdata;
                }
                // A record: maps target name to IP address.
                else if (rec.type === 1) {
                    for (const instance in services) {
                        if (services[instance].target === rec.name) {
                            if (!services[instance].addresses) {
                                services[instance].addresses = [];
                            }
                            services[instance].addresses.push(rec.rdata);
                        }
                    }
                }
            }

            // Process and output discovered smart_ip services.
            for (const instance in services) {
                if (!is_smart_ip_service(services[instance].name, full_service_query)) continue;
                let display_name = services[instance].name;
                const suffix = '.' + full_service_query;
                if (display_name.endsWith(suffix)) {
                    display_name = display_name.substring(0, display_name.length - suffix.length);
                }
                console.log('----------------------------------------');
                console.log(`Service found:`);
                console.log(`Name: ${display_name}`);
                console.log(`IP Address(es): ${services[instance].addresses || []}`);
                console.log(`Port: ${services[instance].port}`);
                console.log(`Properties: ${JSON.stringify(services[instance].txt || {})}`);

                if (on_service_found) {
                    on_service_found({
                        name: display_name,
                        addresses: services[instance].addresses || [],
                        port: services[instance].port,
                        properties: services[instance].txt || {}
                    });
                }
            }
        } catch (e) {
            console.error('Error parsing mDNS response:', e);
        }
    });

    socket.on('error', (err) => {
        console.error(`Socket error:\n${err.stack}`);
        socket.close();
    });

    socket.bind(mdns_port, local_interface, () => {
        try {
            socket.addMembership(mdns_address, local_interface);
            console.log(`Listening for mDNS responses on ${mdns_address}:${mdns_port} via interface ${local_interface}`);
            const query = build_query(service_query);
            socket.send(query, 0, query.length, mdns_port, mdns_address, (err) => {
                if (err) {
                    console.error('Error sending mDNS query:', err);
                } else {
                    console.log(`Sent mDNS query for ${service_query}`);
                }
            });
        } catch (error) {
            console.error(`Error initializing mDNS listener: ${error.message}`);
        }
    });

    return socket;
}

/**
 * Searches for mDNS services with a dynamic timeout and tracks unique service objects.
 *
 * @param {object} [options] - Options for the search.
 * @param {number} [options.timeout=5000] - Search timeout in milliseconds.
 * @param {function} [options.on_search_complete] - Callback invoked when search completes.
 *   Receives an array of unique service objects.
 * @param {function} [options.on_service_found] - Callback invoked when a service is found.
 * @returns {dgram.Socket} The UDP socket used for mDNS.
 */
function search_mdns_services(options = {}) {
    const timeout = options.timeout || 5000; // Default timeout of 5 seconds
    // Create a Map to track unique service objects keyed by their unique name.
    const unique_services = new Map();

    // Wrap the original on_service_found to add the whole service object to the Map.
    const original_on_service_found = options.on_service_found;
    options.on_service_found = (service) => {
        // If a service with this name has not been added yet, add it.
        if (!unique_services.has(service.name)) {
            unique_services.set(service.name, service);
        }
        if (original_on_service_found) {
            original_on_service_found(service);
        }
    };

    // Start the mDNS listener.
    const socket = start_mdns_listener(options);

    // Stop the search after the timeout expires.
    setTimeout(() => {
        socket.close();
        const uniqueServiceArray = Array.from(unique_services.values());
        if (options.on_search_complete) {
            options.on_search_complete(uniqueServiceArray);
        } else {
            console.log('Search complete. Unique services found:', uniqueServiceArray);
        }
    }, timeout);

    return socket;
}

/**
 * Searches for mDNS services with a dynamic timeout and waits for the timeout before returning results.
 *
 * @param {object} [options] - Options for the search.
 * @param {number} [options.timeout=5000] - Search timeout in milliseconds.
 * @returns {Promise<Array>} A promise that resolves with an array of unique services found.
 */
async function search_mdns_servicesmv1(options = {}) {
    return new Promise((resolve) => {
        const timeout = typeof options.timeout === 'number' && options.timeout > 0 ? options.timeout : 5000; // Default timeout of 5s
        const unique_services = new Map();

        // Ensure callback functions are valid before assigning
        const original_on_service_found = typeof options.on_service_found === 'function' ? options.on_service_found : null;
        options.on_service_found = (service) => {
            if (!unique_services.has(service.name)) {
                unique_services.set(service.name, service);
            }
            if (original_on_service_found) {
                original_on_service_found(service);
            }
        };

        console.log(`Starting mDNS search for '${options.service_query || '_smart_ip._tcp'}' with a timeout of ${timeout}ms...`);

        // Start the mDNS listener.
        const socket = start_mdns_listener(options);

        // Stop the search after the timeout and resolve the promise with the unique services array.
        setTimeout(() => {
            socket.close();
            const uniqueServiceArray = Array.from(unique_services.values());

            // Call `on_search_complete` callback if it's a valid function
            if (typeof options.on_search_complete === 'function') {
                options.on_search_complete(uniqueServiceArray);
            }

            console.log('Search complete. Unique services found:', uniqueServiceArray);
            resolve(uniqueServiceArray);
        }, timeout);
    });
}

module.exports = {
    build_query,
    read_name,
    parse_record,
    parse_dns_message,
    is_smart_ip_service,
    start_mdns_listener,
    search_mdns_services,
    search_mdns_servicesmv1
};
