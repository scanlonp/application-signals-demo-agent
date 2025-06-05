const axios = require('axios');

// Configuration
const baseUrl = process.env.URL || 'http://your-application-endpoint';
const concurrentRequests = parseInt(process.env.CONCURRENT_REQUESTS, 10) || 50;
const reportIntervalSeconds = parseInt(process.env.REPORT_INTERVAL, 10) || 60;

// Metrics tracking
let successCount = 0;
let errorCount = 0;
let startTime = Date.now();
let lastReportTime = startTime;

// Define endpoints with their configurations
const ENDPOINTS = {
    GET: [
        {
            url: '/api/gateway/owners/1',
            weight: 15, // Higher weight means more frequent calls
            timeout: 10000
        },
        {
            url: '/api/payments/owners/1/pets/1',
            weight: 10,
            timeout: 10000
        },
        {
            url: '/api/vet/vets',
            weight: 5,
            timeout: 10000
        },
        {
            url: '/api/insurance/insurances',
            weight: 5,
            timeout: 10000
        },
        {
            url: '/api/billing/billings',
            weight: 5,
            timeout: 10000
        },
        {
            url: '/api/customer/diagnose/owners/1/pets/1',
            weight: 1,
            timeout: 30000 // Longer timeout for Bedrock
        },
        {
            url: '/api/gateway/owners/-1', // Invalid request
            weight: 1,
            timeout: 10000
        }
    ],
    POST: [
        {
            url: '/api/payments/owners/1/pets/1',
            weight: 5,
            timeout: 10000,
            getData: () => ({
                amount: Math.floor(Math.random() * 500) + 50,
                notes: `load-test-payment-${Date.now()}`
            })
        },
        {
            url: '/api/visit/owners/7/pets/9/visits',
            weight: 8,
            timeout: 10000,
            getData: () => ({
                date: new Date().toISOString().split('T')[0],
                description: `load-test-visit-${Date.now()}`
            })
        },
        {
            url: '/api/customer/owners',
            weight: 5,
            timeout: 10000,
            getData: () => ({
                firstName: "load-test",
                lastName: "user",
                address: "Test Address",
                city: "Test City",
                telephone: "1234567890"
            })
        },
        {
            url: '/api/customer/owners/7/pets',
            weight: 5,
            timeout: 10000,
            getData: () => ({
                id: 0,
                name: `Pet${Date.now()}`,
                birthDate: "2023-11-20T08:00:00.000Z",
                typeId: Math.random() > 0.5 ? "1" : "2"
            })
        }
    ],
    DELETE: [
        {
            url: '/api/payments/clean-db',
            weight: 1,
            timeout: 10000
        }
    ]
};

// Helper functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Add request tracking metrics
let requestMetrics = {
    GET: { success: 0, failed: 0 },
    POST: { success: 0, failed: 0 },
    DELETE: { success: 0, failed: 0 }
};

// Modified printStats function to include detailed metrics
function printStats() {
    const totalTime = (Date.now() - startTime) / 1000;
    const totalRequests = successCount + errorCount;
    const rps = totalRequests / totalTime;
    
    console.log("\n--- Traffic Generation Statistics ---");
    console.log(`Total requests: ${totalRequests}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log(`Success rate: ${((successCount / totalRequests) * 100).toFixed(2)}%`);
    console.log(`Time elapsed: ${Math.floor(totalTime / 3600)}h ${Math.floor((totalTime % 3600) / 60)}m ${Math.floor(totalTime % 60)}s`);
    console.log(`Average rate: ${rps.toFixed(2)} requests/second`);
    console.log("\nDetailed Metrics:");
    console.log("GET Requests:", requestMetrics.GET);
    console.log("POST Requests:", requestMetrics.POST);
    console.log("DELETE Requests:", requestMetrics.DELETE);
    console.log("----------------------------------------");
}

// Select endpoint based on weights
function selectEndpoint(endpoints) {
    const totalWeight = endpoints.reduce((sum, endpoint) => sum + endpoint.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of endpoints) {
        random -= endpoint.weight;
        if (random <= 0) return endpoint;
    }
    return endpoints[0];
}

// Make a single request
async function makeRequest() {
    let requestType;
    let url;
    let endpoint;

    try {
        // Determine request type (70% GET, 25% POST, 5% DELETE)
        const random = Math.random();

        if (random < 0.70) {
            requestType = 'GET';
            endpoint = selectEndpoint(ENDPOINTS.GET);
            url = `${baseUrl}${endpoint.url}`;
            await axios.get(url, { 
                timeout: endpoint.timeout,
                validateStatus: false 
            });
            requestMetrics.GET.success++;
        } else if (random < 0.95) {
            requestType = 'POST';
            endpoint = selectEndpoint(ENDPOINTS.POST);
            url = `${baseUrl}${endpoint.url}`;
            const data = endpoint.getData ? endpoint.getData() : {};
            await axios.post(url, data, { 
                timeout: endpoint.timeout,
                validateStatus: false 
            });
            requestMetrics.POST.success++;
        } else {
            requestType = 'DELETE';
            endpoint = selectEndpoint(ENDPOINTS.DELETE);
            url = `${baseUrl}${endpoint.url}`;
            await axios.delete(url, { 
                timeout: endpoint.timeout,
                validateStatus: false 
            });
            requestMetrics.DELETE.success++;
        }

        successCount++;

    } catch (err) {
        errorCount++;
        if (requestType) {
            requestMetrics[requestType].failed++;
        }

        // Detailed error logging
        const errorDetails = {
            timestamp: new Date().toISOString(),
            requestType: requestType || 'UNKNOWN',
            url: url || 'UNKNOWN',
            errorType: err.code || 'UNKNOWN',
            errorMessage: err.message,
            statusCode: err.response?.status,
            responseData: err.response?.data
        };

        // Format error message
        let errorMessage = [
            `\nRequest Failed:`,
            `Timestamp: ${errorDetails.timestamp}`,
            `Type: ${errorDetails.requestType}`,
            `URL: ${errorDetails.url}`,
            `Error Type: ${errorDetails.errorType}`,
            `Message: ${errorDetails.errorMessage}`
        ];

        if (errorDetails.statusCode) {
            errorMessage.push(`Status Code: ${errorDetails.statusCode}`);
        }

        if (errorDetails.responseData) {
            errorMessage.push(`Response Data: ${JSON.stringify(errorDetails.responseData, null, 2)}`);
        }

        console.error(errorMessage.join('\n'));
    }

    const currentTime = Date.now();
    if (currentTime - lastReportTime >= reportIntervalSeconds * 1000) {
        printStats();
        lastReportTime = currentTime;
    }
}

// Run batch of concurrent requests
async function runBatch(batchSize) {
    const promises = Array(batchSize).fill().map(() => makeRequest());
    await Promise.all(promises);
}

// Main function
async function generateTrafficContinuously() {
    console.log(`Starting continuous traffic generator targeting: ${baseUrl}`);
    console.log(`Using concurrency level of ${concurrentRequests}`);
    console.log(`Will report statistics every ${reportIntervalSeconds} seconds`);
    console.log("Press Ctrl+C to stop the traffic generator");
    console.log("----------------------------------------");

    while (true) {
        await runBatch(concurrentRequests);
        await sleep(100); // Small delay between batches
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log("\nReceived SIGINT. Shutting down gracefully...");
    printStats();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log("\nReceived SIGTERM. Shutting down gracefully...");
    printStats();
    process.exit(0);
});

// Start the traffic generator
generateTrafficContinuously().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});