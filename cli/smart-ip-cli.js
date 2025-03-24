#!/usr/bin/env node

(async () => {
    const chalk = (await import("chalk")).default;
    const inquirer = (await import("inquirer")).default;
    const ora = (await import("ora")).default;

    const { search_mdns_servicesmv1 } = await import('../src/mdns_lib.js');
    const { list_interfaces } = await import('../src/list_interfaces.js');

    /**
     * Gracefully handles exit (Ctrl+C) to prevent ugly errors.
     */
    process.on("SIGINT", () => {
        console.log(chalk.yellow("\n❌ Process terminated by user. Exiting gracefully...\n"));
        process.exit(0);
    });

    /**
     * Displays the main CLI menu.
     */
    async function mainMenu() {
        console.clear();
        console.log(chalk.blue.bold("\n🌐 Smart IP mDNS CLI Interface 🌐\n"));

        let continueLoop = true;
        while (continueLoop) {
            try {
                const { action } = await inquirer.prompt([
                    {
                        type: "list",
                        name: "action",
                        message: "What would you like to do?",
                        choices: [
                            { name: "📡 List Network Interfaces", value: "list" },
                            { name: "🔍 Search for smart_ip Devices", value: "search" },
                            { name: "❌ Exit", value: "exit" }
                        ]
                    }
                ]);

                // Handle User Selection using switch-case
                switch (action) {
                    case "list":
                        await handleListInterfaces();
                        break;
                    case "search":
                        await handleSearchDevices();
                        break;
                    case "exit":
                        console.log(chalk.green("\n👋 Exiting. Have a great day!\n"));
                        continueLoop = false;
                        break;
                    default:
                        console.log(chalk.red("❓ Unknown action. Try again."));
                }

                if (continueLoop) {
                    const { repeat } = await inquirer.prompt([
                        {
                            type: "confirm",
                            name: "repeat",
                            message: "Do you want to perform another action?",
                            default: true
                        }
                    ]);
                    continueLoop = repeat;
                }
            } catch (error) {
                // Check for forced prompt closure
                if (error?.message && error.message.includes("User force closed")) {
                    console.log(chalk.yellow("\n❌ Process terminated by user. Exiting gracefully...\n"));
                    process.exit(0);
                }
                console.log(chalk.red("❌ An unexpected error occurred:"), error.message);
                process.exit(1);
            }
        }

        process.exit(0);
    }

    /**
     * Handles listing all network interfaces.
     */
    async function handleListInterfaces() {
        console.log(chalk.blue("\n📡 Fetching available network interfaces...\n"));
        const spinner = ora("Fetching network interfaces...").start();
        try {
            const interfaces = list_interfaces();
            spinner.stop();

            if (!interfaces.length) {
                console.log(chalk.yellow("⚠️ No network interfaces found."));
            } else {
                interfaces.forEach((iface, index) => {
                    console.log(chalk.cyan(`Interface ${index + 1}:`));
                    console.log(`  • Name: ${iface.name}`);
                    console.log(`  • Address: ${iface.address}`);
                    console.log(`  • Family: ${iface.family}`);
                    console.log(`  • MAC: ${iface.mac}`);
                    console.log(`  • Internal: ${iface.internal}`);
                    console.log("----------------------------");
                });
            }
        } catch (error) {
            spinner.stop();
            console.log(chalk.red("❌ Failed to list interfaces:"), error.message);
        }
    }

    /**
     * Handles searching for smart_ip devices.
     */
    async function handleSearchDevices() {
        try {
            const allIfaces = list_interfaces();

            // Prompt user to select which IP versions to include
            const { ipVersion } = await inquirer.prompt([
                {
                    type: "list",
                    name: "ipVersion",
                    message: "Select IP version to include:",
                    choices: [
                        { name: "IPv4", value: "IPv4" },
                        { name: "IPv6", value: "IPv6" },
                        { name: "Both", value: "Both" }
                    ],
                    default: "IPv4"
                }
            ]);

            // Filter interfaces based on selected IP version
            let filteredIfaces = allIfaces.filter(iface => {
                if (ipVersion === "Both") {
                    return iface.family === "IPv4" || iface.family === "IPv6";
                }
                return iface.family === ipVersion;
            });

            // Prompt for further filtering based on internal flag
            const { ifaceType } = await inquirer.prompt([
                {
                    type: "list",
                    name: "ifaceType",
                    message: "Select interface filtering mode:",
                    choices: [
                        { name: "All interfaces", value: "all" },
                        { name: "Non-internal interfaces", value: "nonInternal" },
                        { name: "Internal interfaces", value: "internal" }
                    ],
                    default: "nonInternal"
                }
            ]);

            let availableIfaces;
            switch (ifaceType) {
                case "all":
                    availableIfaces = filteredIfaces;
                    break;
                case "nonInternal":
                    availableIfaces = filteredIfaces.filter(iface => !iface.internal);
                    break;
                case "internal":
                    availableIfaces = filteredIfaces.filter(iface => iface.internal);
                    break;
                default:
                    availableIfaces = filteredIfaces;
            }

            if (!availableIfaces.length) {
                console.log(chalk.yellow("⚠️ No matching network interfaces found."));
                return;
            }

            const defaultIface = availableIfaces[0].address;

            // Prompt for additional search options
            const responses = await inquirer.prompt([
                {
                    type: "list",
                    name: "interface",
                    message: "Select the network interface to use:",
                    choices: availableIfaces.map(iface => ({
                        name: `${iface.name} (${iface.address}) [${iface.family}]`,
                        value: iface.address
                    })),
                    default: defaultIface
                },
                {
                    type: "input",
                    name: "service_query",
                    message: "Enter the service query (e.g., _smart_ip._tcp):",
                    default: "_smart_ip._tcp"
                },
                {
                    type: "input",
                    name: "timeout",
                    message: "Enter the timeout duration in ms:",
                    default: "3000",
                    validate: input =>
                        !isNaN(input) && Number(input) > 0 ? true : "Enter a valid number greater than 0"
                },
                {
                    type: "input",
                    name: "mdns_address",
                    message: "Enter the mDNS address:",
                    default: "224.0.0.251"
                },
                {
                    type: "input",
                    name: "mdns_port",
                    message: "Enter the mDNS port:",
                    default: "5353",
                    validate: input =>
                        !isNaN(input) && Number(input) > 0 ? true : "Enter a valid port number"
                }
            ]);

            const options = {
                mdns_address: responses.mdns_address,
                mdns_port: parseInt(responses.mdns_port),
                interface: responses.interface,
                service_query: responses.service_query,
                timeout: parseInt(responses.timeout)
            };

            const spinner = ora(`🔍 Searching for devices with '${responses.service_query}' on ${responses.interface}...`).start();
            const devices = await search_mdns_servicesmv1(options);
            spinner.stop();

            if (!devices.length) {
                console.log(chalk.yellow("\n⚠️ No smart_ip devices found.\n"));
            } else {
                console.log(chalk.green(`\n✅ Found ${devices.length} smart_ip device(s):\n`));
                devices.forEach((device, index) => {
                    console.log(chalk.magenta(`Device ${index + 1}:`));
                    console.log(`  • Name: ${device.name}`);
                    console.log(`  • IP Address(es): ${device.addresses && device.addresses.length ? device.addresses.join(", ") : "N/A"}`);
                    console.log(`  • Port: ${device.port}`);
                    console.log(`  • Properties: ${device.properties ? JSON.stringify(device.properties, null, 2) : "None"}`);
                    console.log("----------------------------");
                });
            }
        } catch (error) {
            // Check if the prompt was force-closed by the user (Ctrl+C)
            if (error?.message && error.message.includes("User force closed")) {
                console.log(chalk.yellow("\n❌ Process terminated by user. Exiting gracefully...\n"));
                process.exit(0);
            }
            console.log(chalk.red("❌ Error during mDNS search:"), error.message);
        }
    }

    // Start the CLI
    await mainMenu();
})();
