import { protectPage } from './utils/auth.js';
import { initializePageLayout } from './components/layout.js';
import { supabase } from './lib/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const session = await protectPage();
    if (!session) return;

     const pageContentHTML = `
        <div class="page-header">
            <h2>Reports & Analytics</h2>
        </div>
        <div class="reports-grid">
            <div class="chart-container">
                <h3>Monthly Revenue (Paid)</h3>
                <canvas id="revenue-chart"></canvas>
            </div>
            <div class="chart-container">
                <h3>Property Occupancy</h3>
                <canvas id="occupancy-chart"></canvas>
            </div>
            <div class="chart-container">
                <h3>Payment Status Overview</h3>
                <canvas id="payment-status-chart"></canvas>
            </div>
        </div>
    `;

    initializePageLayout({
        activeNav: 'reports',
        pageTitle: 'Reports',
        pageSubtitle: 'Visualize your rental management data',
        user: session.user,
        pageContentHTML
    });

    fetchDataAndRenderCharts();
});

async function fetchDataAndRenderCharts() {
    try {
        const [paymentsRes, propertiesRes] = await Promise.all([
            supabase.from('payments').select('status, amount, payment_date'),
            supabase.from('properties').select('status')
        ]);
        if (paymentsRes.error) throw paymentsRes.error;
        if (propertiesRes.error) throw propertiesRes.error;

        generateRevenueChart(paymentsRes.data);
        generateOccupancyChart(propertiesRes.data);
        generatePaymentStatusChart(paymentsRes.data);

    } catch (error) {
        console.error("Error fetching data for charts:", error);
    }
}

function generateRevenueChart(payments) {
    const revenueData = payments
        .filter(p => p.status === 'paid' && p.payment_date)
        .reduce((acc, p) => {
            const month = p.payment_date.slice(0, 7); // 'YYYY-MM'
            acc[month] = (acc[month] || 0) + p.amount;
            return acc;
        }, {});
    
    const sortedMonths = Object.keys(revenueData).sort();
    const chartData = sortedMonths.map(month => revenueData[month]);

    new Chart('revenue-chart', {
        type: 'line',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: 'Monthly Revenue',
                data: chartData,
                borderColor: '#4299e1',
                tension: 0.1
            }]
        }
    });
}

function generateOccupancyChart(properties) {
    const occupiedCount = properties.filter(p => p.status === 'occupied').length;
    const vacantCount = properties.length - occupiedCount;

    new Chart('occupancy-chart', {
        type: 'doughnut',
        data: {
            labels: ['Occupied', 'Vacant'],
            datasets: [{
                data: [occupiedCount, vacantCount],
                backgroundColor: ['#c53030', '#38a169']
            }]
        }
    });
}

function generatePaymentStatusChart(payments) {
    const paymentStatus = payments.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
    }, { paid: 0, pending: 0, overdue: 0 });

    new Chart('payment-status-chart', {
        type: 'bar',
        data: {
            labels: ['Paid', 'Pending', 'Overdue'],
            datasets: [{
                label: 'Number of Payments',
                data: [paymentStatus.paid, paymentStatus.pending, paymentStatus.overdue],
                backgroundColor: ['#38a169', '#d69e2e', '#c53030']
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            }
        }
    });
}