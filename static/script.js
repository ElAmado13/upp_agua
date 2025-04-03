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

    function actualizarDesdeServidor() {
        fetch('/ultimos_datos')
            .then(response => response.json())
            .then(data => {
                if (data.lecturas && data.lecturas.length > 0) {
                    const lecturas = data.lecturas;
                    const litrosTotales = lecturas.reduce((a, b) => a + b, 0);
                    inputConsumo.value = litrosTotales.toFixed(2);

                    const capacidadMaxima = 12;
                    const porcentaje = Math.min((litrosTotales / capacidadMaxima) * 100, 100);
                    barraAgua.style.width = `${porcentaje}%`;
                    barraAgua.classList.toggle('desbordando', litrosTotales > capacidadMaxima);

                    if (litrosTotales > capacidadMaxima) {
                        luzRoja.style.display = 'block';
                        luzVerde.style.display = 'none';
                    } else {
                        luzRoja.style.display = 'none';
                        luzVerde.style.display = 'block';
                    }

                    graficaConsumo.data.labels = lecturas.map((_, i) => `Lectura ${i + 1}`);
                    graficaConsumo.data.datasets[0].data = lecturas;
                    graficaConsumo.update();
                }
            })
            .catch(error => console.error('Error al obtener lecturas:', error));
    }

    // Ejecutar cada 5 segundos
    setInterval(actualizarDesdeServidor, 5000);

    // También puedes usar el botón calcular si lo deseas
    btnCalcular.addEventListener('click', actualizarDesdeServidor);
});
