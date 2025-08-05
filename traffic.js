/* <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<canvas id="trafficPieChart" width="200" height="200"></canvas> */


    const ctx = document.getElementById('trafficPieChart').getContext('2d');

    // Initial Pie Chart
    const trafficChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Congestion', 'Free Flow'],
            datasets: [{
                data: [75, 25], // Initial values
                backgroundColor: ['#ff0000', '#00ff00'],
            }]
        },
        options: { responsive: false }
    });

    // Function to Update the Pie Chart
    function updateTrafficData() {
        // Simulating real-time traffic congestion percentage (Replace with API call)
        const congestionLevel = Math.floor(Math.random() * 100); // Random value for demo
        const freeFlow = 100 - congestionLevel;

        // Update chart data
        trafficChart.data.datasets[0].data = [congestionLevel, freeFlow];
        trafficChart.update();
    }

    // Update every 5 seconds (5000ms)
    setInterval(updateTrafficData, 5000);

