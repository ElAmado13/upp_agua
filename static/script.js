document.addEventListener('DOMContentLoaded', function () {
    const inputConsumo = document.getElementById('input-consumo');
    const btnCalcular = document.getElementById('btn-calcular');
    const barraAgua = document.getElementById('barra-agua');
    const luzVerde = document.getElementById('verde');
    const luzRoja = document.getElementById('roja');
    const datosPulsos = [2, 43, 69, 73, 74, 74, 76, 76, 77, 77, 77, 79, 79, 72, 64, 46, 3];
    const ctx = document.getElementById('grafica-consumo').getContext('2d');

    // Inicializar gráfica
    const graficaConsumo = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: datosPulsos.length }, (_, i) => `Lectura ${i + 1}`),
            datasets: [{
                label: 'Consumo de agua (litros)',
                data: datosPulsos.map(p => p * 0.0017),
                borderColor: 'blue',
                borderWidth: 2,
                fill: false,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Lecturas',
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Consumo (litros)',
                    },
                    beginAtZero: true,
                }
            }
        }
    });

    // Botón calcular
    btnCalcular.addEventListener('click', () => {
        // Calcular litros totales con la fórmula: Litros = 1.70 * pulsos
        const litrosTotales = datosPulsos.reduce((a, b) => a + b, 0) * 0.0017;

        // Mostrar litros registrados
        inputConsumo.value = litrosTotales.toFixed(2);

        // Actualizar barra de agua
        const capacidadMaxima = 12;
        const porcentaje = Math.min((litrosTotales / capacidadMaxima) * 100, 100);
        barraAgua.style.width = `${porcentaje}%`;

        if (litrosTotales > capacidadMaxima) {
            barraAgua.classList.add('desbordando'); // Simula desbordamiento
        } else {
            barraAgua.classList.remove('desbordando');
        }

        // Control de semáforo
        if (litrosTotales <= capacidadMaxima) {
            luzVerde.style.display = 'block';
            luzRoja.style.display = 'none';
        } else {
            luzVerde.style.display = 'none';
            luzRoja.style.display = 'block';
        }
    });
});
