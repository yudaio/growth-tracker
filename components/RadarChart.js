import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

export default function RadarChart({ scores, showIdol, axes }) {
  const datasets = [
    {
      label: '現在',
      data: axes.map(a => scores[a.k] || 5),
      borderColor: '#00D97E',
      backgroundColor: 'rgba(0,217,126,0.1)',
      borderWidth: 2,
      pointBackgroundColor: '#00D97E',
      pointRadius: 3,
    },
  ];

  if (showIdol) {
    datasets.push({
      label: 'アイドル理想',
      data: axes.map(a => a.idol),
      borderColor: '#FF6340',
      backgroundColor: 'rgba(255,99,64,0.05)',
      borderWidth: 1.5,
      pointBackgroundColor: '#FF6340',
      pointRadius: 2,
      borderDash: [5, 3],
    });
  }

  return (
    <Radar
      data={{ labels: axes.map(a => a.s), datasets }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          r: {
            min: 0, max: 10,
            ticks: { stepSize: 2, color: 'rgba(255,255,255,0.2)', backdropColor: 'transparent', font: { size: 9 } },
            grid: { color: 'rgba(255,255,255,0.08)' },
            angleLines: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: { color: '#71717A', font: { size: 11 } },
          },
        },
      }}
    />
  );
}
