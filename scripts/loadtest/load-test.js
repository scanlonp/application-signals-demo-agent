const axios = require('axios');

// Configuration - modify these values as needed
const baseUrl = process.env.URL || 'http://your-application-endpoint';
const concurrentRequests = parseInt(process.env.CONCURRENT_REQUESTS, 10) || 50;
const reportIntervalSeconds = parseInt(process.env.REPORT_INTERVAL, 10) || 60; // Report stats every minute

// Track metrics
let successCount = 0;
let errorCount = 0;
let startTime = Date.now();
let lastReportTime = startTime;

// Register signal handlers for graceful shutdown
process.on('SIGINT', () => {
  console.log("\n\nReceived SIGINT (Ctrl+C). Shutting down gracefully...");
  printStats();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("\n\nReceived SIGTERM. Shutting down gracefully...");
  printStats();
  process.exit(0);
});

// Helper function to sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to print statistics
function printStats() {
    const totalTime = (Date.now() - startTime) / 1000;
    const totalRequests = successCount + errorCount;
    const rps = totalRequests / totalTime;
    
    console.log("\n--- Traffic Generation Statistics ---");
    console.log(`Total requests: ${totalRequests}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log(`Success rate: ${((successCount / totalRequests) * 100).toFixed(2)}%`);
    console.log(`Time elapsed: ${formatTime(totalTime)}`);
    console.log(`Average rate: ${rps.toFixed(2)} requests/second`);
    console.log("----------------------------------------");
}

// Format seconds into a readable time string
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours}h ${minutes}m ${secs}s`;
}

// Function to make a single request
async function makeRequest() {
    try {
        // Randomly select one of several endpoints to hit
        const endpoints = [
            // Owner endpoints
            '/api/gateway/owners/1',
            '/api/customer/owners',
            
            // Visit endpoints
            '/api/visit/owners/7/pets/9/visits',
            
            // Pet endpoints
            '/api/customer/owners/7/pets',
            
            // Other services
            '/api/vet/vets',
            '/api/insurance/insurances',
            '/api/billing/billings',
            '/api/payments/owners/1/pets/1'
        ];
        
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const url = `${baseUrl}${endpoint}`;
        
        // Determine if this should be a GET or POST request
        const isPost = Math.random() > 0.7; // 30% chance of POST
        
        if (isPost) {
            let data = {};
            
            // Prepare appropriate data based on endpoint
            if (endpoint === '/api/visit/owners/7/pets/9/visits') {
                data = {
                    date: '2023-08-01',
                    description: `high-traffic-visit-${Date.now()}`
                };
            } else if (endpoint === '/api/customer/owners') {
                data = { 
                    firstName: "high-traffic", 
                    address: "Test Address", 
                    city: "Test City", 
                    telephone: "1234567890", 
                    lastName: "Generator" 
                };
            } else if (endpoint === '/api/customer/owners/7/pets') {
                data = {
                    id: 0,
                    name: "Pet" + Date.now(),
                    birthDate: "2023-11-20T08:00:00.000Z",
                    typeId: "1"
                };
            } else if (endpoint === '/api/payments/owners/1/pets/1') {
                data = {
                    amount: Math.floor(Math.random() * 500) + 50,
                    notes: `high-traffic-payment-${Date.now()}`
                };
            }
            
            await axios.post(url, data, { timeout: 10000 });
        } else {
            await axios.get(url, { timeout: 10000 });
        }
        
        successCount++;
    } catch (err) {
        errorCount++;
        console.error(`Error with request: ${err.message}`);
    }
    
    // Check if it's time to report statistics
    const currentTime = Date.now();
    if (currentTime - lastReportTime >= reportIntervalSeconds * 1000) {
        printStats();
        lastReportTime = currentTime;
    }
}

// Function to run a batch of concurrent requests
async function runBatch(batchSize) {
    const promises = [];
    for (let i = 0; i < batchSize; i++) {
        promises.push(makeRequest());
    }
    await Promise.all(promises);
}

// Main function to run the traffic generator continuously
async function generateTrafficContinuously() {
    console.log(`Starting continuous high traffic generator targeting: ${baseUrl}`);
    console.log(`Using concurrency level of ${concurrentRequests}`);
    console.log(`Will report statistics every ${reportIntervalSeconds} seconds`);
    console.log(`Press Ctrl+C to stop the traffic generator`);
    console.log("----------------------------------------");
    
    // Continue indefinitely until manually stopped
    while (true) {
        await runBatch(concurrentRequests);
        
        // Small delay between batches to avoid overwhelming the local machine
        await sleep(100);
    }
}

// Start the traffic generator
generateTrafficContinuously().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
