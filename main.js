// This file contains all the JavaScript logic for the dashboard.

document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL CHART VARIABLES ---
    let collegeRadarChart, semesterBarChart, heatmapChart, collegePerformanceChart, subjectHeatmap, trainerPerformanceChart;

    // --- DATA INITIALIZATION ---
    // Ensure scores are numbers for calculations, handle non-numeric values gracefully.
    const allData = rawData.map(d => ({
        ...d,
        Sem: parseInt(d.Sem) || d.Sem,
        ContentScore: parseFloat(d.ContentScore) || null,
        TrainerScore: parseFloat(d.TrainerScore) || null
    }));

    // --- SETUP ---
    populateFilters();
    setupEventListeners();
    updateDashboard(); // Initial load
    feather.replace();
    AOS.init();

    // --- CORE FUNCTIONS ---

    function populateFilters() {
        // Find unique, non-null, and sorted values for filters
        const colleges = [...new Set(allData.map(d => d.College).filter(Boolean))].sort();
        const semesters = [...new Set(allData.map(d => d.Sem).filter(s => typeof s === 'number'))].sort((a, b) => a - b);
        
        const collegeFilter = document.getElementById('collegeFilter');
        const semesterFilter = document.getElementById('semesterFilter');

        colleges.forEach(college => {
            const option = document.createElement('option');
            option.value = college;
            option.textContent = college;
            collegeFilter.appendChild(option);
        });

        semesters.forEach(sem => {
            const option = document.createElement('option');
            option.value = sem;
            option.textContent = `Semester ${sem}`;
            semesterFilter.appendChild(option);
        });
    }

    function setupEventListeners() {
        document.querySelectorAll('.dashboard-filter').forEach(filter => {
            filter.addEventListener('change', updateDashboard);
        });
    }

    function getFilterValues() {
        return {
            college: document.getElementById('collegeFilter').value,
            semester: document.getElementById('semesterFilter').value,
            curriculum: document.getElementById('curriculumFilter').value,
            scoreRange: document.getElementById('scoreRangeFilter').value,
        };
    }

    function filterData() {
        const filters = getFilterValues();
        return allData.filter(d => {
            const collegeMatch = filters.college === 'All' || d.College === filters.college;
            const semesterMatch = filters.semester === 'All' || d.Sem == filters.semester;
            const curriculumMatch = filters.curriculum === 'All' || d.Curriculum === filters.curriculum;
            
            let scoreMatch = true;
            if (filters.scoreRange !== 'All' && d.ContentScore) {
                const [min, max] = filters.scoreRange.split('-').map(Number);
                scoreMatch = d.ContentScore >= min && d.ContentScore < (max || 11);
            }
            
            return collegeMatch && semesterMatch && curriculumMatch && scoreMatch;
        });
    }

    /**
     * Main function to update all components on the current page.
     * It checks for the existence of elements before trying to update them.
     */
    function updateDashboard() {
        const filteredData = filterData();
        
        // --- Components present on ALL pages ---
        updateDetailedTable(filteredData);

        // --- Components present on SOME pages ---
        if (document.getElementById('avgContentScore')) {
            updateSummaryCards(filteredData);
        }
        
        // --- Page-specific chart updates ---
        if (document.getElementById('collegeRadarChart')) {
            updateIndexCharts(filteredData);
        }
        if (document.getElementById('collegePerformanceChart')) {
            updateCollegePage(filteredData);
        }
        if (document.getElementById('subjectHeatmap')) {
            updateSubjectPage(filteredData);
        }
        if (document.getElementById('trainerPerformanceChart')) {
            updateTrainerPage(filteredData);
        }
    }

    // --- COMPONENT UPDATE FUNCTIONS ---

    function updateSummaryCards(data) {
        const contentScores = data.map(d => d.ContentScore).filter(Boolean);
        const trainerScores = data.map(d => d.TrainerScore).filter(Boolean);

        document.getElementById('avgContentScore').textContent = contentScores.length ? (contentScores.reduce((a, b) => a + b, 0) / contentScores.length).toFixed(2) : 'N/A';
        document.getElementById('avgTrainerScore').textContent = trainerScores.length ? (trainerScores.reduce((a, b) => a + b, 0) / trainerScores.length).toFixed(2) : 'N/A';
        document.getElementById('highestScore').textContent = contentScores.length ? Math.max(...contentScores).toFixed(2) : 'N/A';
        document.getElementById('lowestScore').textContent = contentScores.length ? Math.min(...contentScores).toFixed(2) : 'N/A';
    }

    function updateDetailedTable(data) {
        const tableBody = document.getElementById('detailedDataTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No data matches the selected filters.</td></tr>`;
            return;
        }

        data.slice(0, 50).forEach(row => { // Limiting to 50 rows for performance
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${row.Subject || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.College || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.Sem || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.ContentScore?.toFixed(2) || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.TrainerScore?.toFixed(2) || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.Curriculum || 'N/A'}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // --- INDEX PAGE CHARTS ---
    function updateIndexCharts(data) {
        updateCollegeRadar(data);
        updateSemesterBar(data);
        updateHeatmap(data);
        updateActionItems(data);
    }
    
    function updateCollegeRadar(data) {
        const colleges = [...new Set(data.map(d => d.College).filter(Boolean))].slice(0, 5); // Limit to 5 colleges for readability
        const datasets = colleges.map(college => {
            const collegeData = data.filter(d => d.College === college);
            const contentScores = collegeData.map(d => d.ContentScore).filter(Boolean);
            const trainerScores = collegeData.map(d => d.TrainerScore).filter(Boolean);
            const randomColor = `rgba(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}`;
            return {
                label: college,
                data: [
                    contentScores.length ? contentScores.reduce((a, b) => a + b, 0) / contentScores.length : 0,
                    trainerScores.length ? trainerScores.reduce((a, b) => a + b, 0) / trainerScores.length : 0,
                ],
                backgroundColor: `${randomColor}, 0.2)`,
                borderColor: `${randomColor}, 1)`,
                borderWidth: 2,
            };
        });

        const chartConfig = {
            type: 'radar',
            data: { labels: ['Avg Content Score', 'Avg Trainer Score'], datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { suggestedMin: 4, suggestedMax: 10, pointLabels: { font: { size: 12 } } } },
                plugins: { legend: { position: 'top' } },
            },
        };

        if (collegeRadarChart) {
            collegeRadarChart.data = chartConfig.data;
            collegeRadarChart.update();
        } else {
            collegeRadarChart = new Chart(document.getElementById('collegeRadarChart').getContext('2d'), chartConfig);
        }
    }

    function updateSemesterBar(data) {
        const semesters = [...new Set(data.map(d => d.Sem).filter(s => typeof s === 'number'))].sort((a,b)=>a-b);
        const contentData = semesters.map(sem => {
            const semData = data.filter(d => d.Sem === sem && d.ContentScore);
            return semData.length ? semData.reduce((acc, curr) => acc + curr.ContentScore, 0) / semData.length : 0;
        });
        const trainerData = semesters.map(sem => {
            const semData = data.filter(d => d.Sem === sem && d.TrainerScore);
            return semData.length ? semData.reduce((acc, curr) => acc + curr.TrainerScore, 0) / semData.length : 0;
        });

        const chartConfig = {
            type: 'bar',
            data: {
                labels: semesters.map(s => `Sem ${s}`),
                datasets: [
                    { label: 'Content Score', data: contentData, backgroundColor: 'rgba(79, 70, 229, 0.7)' },
                    { label: 'Trainer Score', data: trainerData, backgroundColor: 'rgba(16, 185, 129, 0.7)' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, min: 4, max: 10 } }, plugins: { legend: { position: 'top' } } }
        };

        if (semesterBarChart) {
            semesterBarChart.data = chartConfig.data;
            semesterBarChart.update();
        } else {
            semesterBarChart = new Chart(document.getElementById('semesterBarChart').getContext('2d'), chartConfig);
        }
    }

    function updateHeatmap(data) {
        const heatmapData = data.filter(d => d.Subject && d.ContentScore).map(d => ({ x: d.Subject.trim(), y: d.ContentScore }));
        const options = {
            series: [{ name: 'Content Score', data: heatmapData }],
            chart: { type: 'heatmap', height: '100%', toolbar: { show: false } },
            plotOptions: { heatmap: { colorScale: { ranges: [{ from: 0, to: 6.5, color: '#EF4444', name: 'Low' }, { from: 6.5, to: 8, color: '#F59E0B', name: 'Medium' }, { from: 8, to: 10, color: '#10B981', name: 'High' }] } } },
            dataLabels: { enabled: false },
            xaxis: { type: 'category', labels: { show: false } },
            tooltip: { y: { formatter: val => val.toFixed(2) } }
        };

        if (heatmapChart) {
            heatmapChart.updateSeries([{ data: heatmapData }]);
        } else {
            heatmapChart = new ApexCharts(document.querySelector("#heatmap"), options);
            heatmapChart.render();
        }
    }
    
    function updateActionItems(data) {
        const tableBody = document.getElementById('actionItemsTableBody');
        tableBody.innerHTML = '';
        const items = data.filter(d => d.ActionItems && d.ActionItems.trim() !== '');
        if (items.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">No priority action items for this selection.</td></tr>`;
            return;
        }
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 text-sm font-medium text-gray-900 break-words">${item.Subject}</td>
                <td class="px-6 py-4 text-sm text-gray-500 break-words">${item.College}</td>
                <td class="px-6 py-4 text-sm text-gray-500 break-words">${item.ActionItems}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // --- COLLEGES PAGE CHART ---
    function updateCollegePage(data) {
        const colleges = [...new Set(data.map(d => d.College).filter(Boolean))].sort();
        const contentScores = colleges.map(college => {
            const collegeData = data.filter(d => d.College === college && d.ContentScore);
            return collegeData.length ? (collegeData.reduce((sum, item) => sum + item.ContentScore, 0) / collegeData.length) : 0;
        });
        const trainerScores = colleges.map(college => {
            const collegeData = data.filter(d => d.College === college && d.TrainerScore);
            return collegeData.length ? (collegeData.reduce((sum, item) => sum + item.TrainerScore, 0) / collegeData.length) : 0;
        });
    
        const chartConfig = {
            type: 'bar',
            data: {
                labels: colleges,
                datasets: [
                    { label: 'Avg Content Score', data: contentScores, backgroundColor: 'rgba(79, 70, 229, 0.7)' },
                    { label: 'Avg Trainer Score', data: trainerScores, backgroundColor: 'rgba(16, 185, 129, 0.7)' }
                ]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: false, min: 4, max: 10 } }, plugins: { legend: { position: 'top' } } }
        };
    
        if (collegePerformanceChart) {
            collegePerformanceChart.data = chartConfig.data;
            collegePerformanceChart.update();
        } else {
            collegePerformanceChart = new Chart(document.getElementById('collegePerformanceChart').getContext('2d'), chartConfig);
        }
    }
    
    // --- SUBJECTS PAGE CHART ---
    function updateSubjectPage(data) {
        const subjectsData = [...new Set(data.map(d => d.Subject.trim()))]
            .map(subject => {
                const entries = data.filter(d => d.Subject.trim() === subject && d.ContentScore);
                return { x: subject, y: entries.length ? entries.reduce((sum, e) => sum + e.ContentScore, 0) / entries.length : 0 };
            })
            .filter(d => d.y > 0)
            .sort((a, b) => b.y - a.y); 

        const options = {
            series: [{ name: 'Average Score', data: subjectsData }],
            chart: { type: 'treemap', height: '100%', toolbar: { show: true } },
            plotOptions: { treemap: { distributed: true, enableShades: false } },
            title: { text: 'Subject Performance (by Average Content Score)', align: 'center'},
            legend: { show: false },
            dataLabels: {
                enabled: true,
                style: {
                    fontSize: '16px',
                },
                formatter: function(text, op) {
                    return [text, op.value.toFixed(1)]
                },
            },
            tooltip: { y: { formatter: val => val.toFixed(2) } }
        };

        const chartEl = document.getElementById('subjectHeatmap');
        chartEl.innerHTML = ''; 
        subjectHeatmap = new ApexCharts(chartEl, options);
        subjectHeatmap.render();
    }

    // --- TRAINERS PAGE CHART ---
    function updateTrainerPage(data) {
        const scoreRanges = { 'Below 6': 0, '6-7': 0, '7-8': 0, '8-9': 0, '9-10': 0 };
        data.forEach(d => {
            if (d.TrainerScore) {
                if (d.TrainerScore < 6) scoreRanges['Below 6']++;
                else if (d.TrainerScore < 7) scoreRanges['6-7']++;
                else if (d.TrainerScore < 8) scoreRanges['7-8']++;
                else if (d.TrainerScore < 9) scoreRanges['8-9']++;
                else scoreRanges['9-10']++;
            }
        });

        const chartConfig = {
            type: 'bar',
            data: {
                labels: Object.keys(scoreRanges),
                datasets: [{
                    label: 'Number of Sessions by Trainer Score',
                    data: Object.values(scoreRanges),
                    backgroundColor: ['#EF4444', '#F59E0B', '#FBBF24', '#A7F3D0', '#10B981']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        };

        if (trainerPerformanceChart) {
             trainerPerformanceChart.data = chartConfig.data;
             trainerPerformanceChart.update();
        } else {
             trainerPerformanceChart = new Chart(document.getElementById('trainerPerformanceChart').getContext('2d'), chartConfig);
        }
    }
});

