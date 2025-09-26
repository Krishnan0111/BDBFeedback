// This file contains all the JavaScript logic for the dashboard.

document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL VARIABLES ---
    let collegeRadarChart, semesterBarChart, heatmapChart;
    const allData = rawData.map(d => ({
        ...d,
        Sem: parseInt(d.Sem) || d.Sem // Ensure semester is a number where possible
    }));

    // --- INITIALIZATION ---
    populateFilters();
    setupEventListeners();
    updateDashboard();
    feather.replace();
    AOS.init();

    // --- FUNCTIONS ---

    function populateFilters() {
        const colleges = [...new Set(allData.map(d => d.College).filter(Boolean))].sort();
        const semesters = [...new Set(allData.map(d => d.Sem).filter(Boolean))].sort((a, b) => a - b);
        
        const collegeFilter = document.getElementById('collegeFilter');
        const semesterFilter = document.getElementById('semesterFilter');

        colleges.forEach(college => {
            const option = document.createElement('option');
            option.value = college;
            option.textContent = college;
            collegeFilter.appendChild(option);
        });

        semesters.forEach(sem => {
            if (typeof sem === 'number') {
                const option = document.createElement('option');
                option.value = sem;
                option.textContent = `Semester ${sem}`;
                semesterFilter.appendChild(option);
            }
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
                scoreMatch = d.ContentScore >= min && d.ContentScore < (max || 11); // Handle max range
            }
            
            return collegeMatch && semesterMatch && curriculumMatch && scoreMatch;
        });
    }

    function updateDashboard() {
        const filteredData = filterData();
        
        updateSummaryCards(filteredData);
        updateDetailedTable(filteredData);
        
        // Page-specific updates
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

    function updateSummaryCards(data) {
        const contentScores = data.map(d => d.ContentScore).filter(Boolean);
        const trainerScores = data.map(d => d.TrainerScore).filter(Boolean);

        const avgContentScore = contentScores.length ? (contentScores.reduce((a, b) => a + b, 0) / contentScores.length).toFixed(2) : 'N/A';
        const avgTrainerScore = trainerScores.length ? (trainerScores.reduce((a, b) => a + b, 0) / trainerScores.length).toFixed(2) : 'N/A';
        const highestScore = contentScores.length ? Math.max(...contentScores).toFixed(2) : 'N/A';
        const lowestScore = contentScores.length ? Math.min(...contentScores).toFixed(2) : 'N/A';

        document.getElementById('avgContentScore').textContent = avgContentScore;
        document.getElementById('avgTrainerScore').textContent = avgTrainerScore;
        document.getElementById('highestScore').textContent = highestScore;
        document.getElementById('lowestScore').textContent = lowestScore;
    }

    function updateDetailedTable(data) {
        const tableBody = document.getElementById('detailedDataTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = ''; // Clear existing rows
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4">No data matches the selected filters.</td></tr>`;
            return;
        }

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${row.Subject || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.College || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.Sem || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.ContentScore || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.TrainerScore || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.Curriculum || 'N/A'}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // --- INDEX PAGE SPECIFIC ---
    function updateIndexCharts(data) {
        updateCollegeRadar(data);
        updateSemesterBar(data);
        updateHeatmap(data);
        updateActionItems(data);
    }
    
    function updateCollegeRadar(data) {
        const colleges = [...new Set(data.map(d => d.College).filter(Boolean))];
        const datasets = colleges.map(college => {
            const collegeData = data.filter(d => d.College === college);
            const contentScores = collegeData.map(d => d.ContentScore).filter(Boolean);
            const trainerScores = collegeData.map(d => d.TrainerScore).filter(Boolean);
            return {
                label: college,
                data: [
                    contentScores.length ? contentScores.reduce((a, b) => a + b) / contentScores.length : 0,
                    trainerScores.length ? trainerScores.reduce((a, b) => a + b) / trainerScores.length : 0,
                ],
                 backgroundColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.2)`,
                 borderColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`,
                 borderWidth: 2,
            };
        });

        const chartConfig = {
            type: 'radar',
            data: {
                labels: ['Content Score', 'Trainer Score'],
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { suggestedMin: 5, suggestedMax: 10, pointLabels: { font: { size: 14 } } } },
                plugins: { legend: { position: 'top' } },
            },
        };

        if (collegeRadarChart) {
            collegeRadarChart.data.labels = chartConfig.data.labels;
            collegeRadarChart.data.datasets = chartConfig.data.datasets;
            collegeRadarChart.update();
        } else {
            collegeRadarChart = new Chart(document.getElementById('collegeRadarChart').getContext('2d'), chartConfig);
        }
    }

    function updateSemesterBar(data) {
        const semesters = [...new Set(data.map(d => d.Sem).filter(Boolean))].sort((a,b)=>a-b);
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
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: false, min: 5, max: 10 } },
                plugins: { legend: { position: 'top' } }
            }
        };

        if (semesterBarChart) {
            semesterBarChart.data.labels = chartConfig.data.labels;
            semesterBarChart.data.datasets = chartConfig.data.datasets;
            semesterBarChart.update();
        } else {
            semesterBarChart = new Chart(document.getElementById('semesterBarChart').getContext('2d'), chartConfig);
        }
    }

    function updateHeatmap(data) {
         const heatmapData = data
            .filter(d => d.Subject && d.ContentScore)
            .map(d => ({
                x: d.Subject.trim(),
                y: d.ContentScore
            }));
            
        const heatmapOptions = {
            series: [{ name: 'Content Score', data: heatmapData }],
            chart: { type: 'heatmap', height: '100%', toolbar: { show: false } },
            plotOptions: {
                heatmap: {
                    colorScale: {
                        ranges: [
                            { from: 0, to: 6.5, color: '#EF4444', name: 'Low' },
                            { from: 6.5, to: 8, color: '#F59E0B', name: 'Medium' },
                            { from: 8, to: 10, color: '#10B981', name: 'High' }
                        ]
                    }
                }
            },
            dataLabels: { enabled: false },
            xaxis: { type: 'category', labels: { show: false } },
            tooltip: { y: { formatter: val => val.toFixed(2) } }
        };

        if (heatmapChart) {
            heatmapChart.updateSeries([{ data: heatmapData }]);
        } else {
            heatmapChart = new ApexCharts(document.querySelector("#heatmap"), heatmapOptions);
            heatmapChart.render();
        }
    }
    
    function updateActionItems(data) {
        const tableBody = document.getElementById('actionItemsTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        const items = data.filter(d => d.ActionItems && d.ActionItems.trim() !== '');
        if (items.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4">No priority action items for this selection.</td></tr>`;
            return;
        }
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.Subject}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.College}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.ActionItems}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // --- COLLEGES PAGE SPECIFIC ---
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
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { beginAtZero: false, min: 5, max: 10 } },
                plugins: { legend: { position: 'top' } }
            }
        };
    
        if (window.collegePerformanceChart) {
            window.collegePerformanceChart.data.labels = chartConfig.data.labels;
            window.collegePerformanceChart.data.datasets = chartConfig.data.datasets;
            window.collegePerformanceChart.update();
        } else {
            window.collegePerformanceChart = new Chart(document.getElementById('collegePerformanceChart').getContext('2d'), chartConfig);
        }
    }
    
    // --- SUBJECTS PAGE SPECIFIC ---
    function updateSubjectPage(data) {
        const subjectsData = [...new Set(data.map(d => d.Subject.trim()))]
            .map(subject => {
                const subjectEntries = data.filter(d => d.Subject.trim() === subject && d.ContentScore);
                const avgScore = subjectEntries.length
                    ? subjectEntries.reduce((sum, entry) => sum + entry.ContentScore, 0) / subjectEntries.length
                    : 0;
                return { x: subject, y: avgScore };
            })
            .filter(d => d.y > 0)
            .sort((a, b) => b.y - a.y); 

        const heatmapOptions = {
            series: [{ name: 'Average Score', data: subjectsData }],
            chart: { type: 'heatmap', height: '100%', toolbar: { show: true } },
            plotOptions: {
                heatmap: {
                    colorScale: {
                        ranges: [
                            { from: 0, to: 6.5, color: '#EF4444', name: 'Low' },
                            { from: 6.5, to: 8, color: '#F59E0B', name: 'Medium' },
                            { from: 8, to: 10, color: '#10B981', name: 'High' }
                        ]
                    }
                }
            },
            dataLabels: { enabled: true, style: { colors: ['#000'] } },
            xaxis: { type: 'category', tickAmount: 10 },
            tooltip: { y: { formatter: val => val.toFixed(2) } }
        };

        const chartEl = document.getElementById('subjectHeatmap');
        chartEl.innerHTML = ''; // Clear previous chart
        const subjectHeatmap = new ApexCharts(chartEl, heatmapOptions);
        subjectHeatmap.render();
    }

    // --- TRAINERS PAGE SPECIFIC ---
    function updateTrainerPage(data) {
        // This is a placeholder as there's no trainer data in the provided dataset.
        // In a real scenario, you'd have trainer names to group by.
        // For now, let's simulate it based on score distribution.
        
        const scoreRanges = { '5-6': 0, '6-7': 0, '7-8': 0, '8-9': 0, '9-10': 0 };
        data.forEach(d => {
            if (d.TrainerScore) {
                if (d.TrainerScore < 6) scoreRanges['5-6']++;
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
                    backgroundColor: 'rgba(79, 70, 229, 0.7)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false } }
            }
        };

        const chartEl = document.getElementById('trainerPerformanceChart');
        if (window.trainerPerformanceChart) {
             window.trainerPerformanceChart.data.labels = chartConfig.data.labels;
             window.trainerPerformanceChart.data.datasets = chartConfig.data.datasets;
             window.trainerPerformanceChart.update();
        } else {
             window.trainerPerformanceChart = new Chart(chartEl.getContext('2d'), chartConfig);
        }
    }

});
