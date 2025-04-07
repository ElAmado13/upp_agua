document.addEventListener('DOMContentLoaded', function () {
    const inputConsumo = document.getElementById('input-consumo');
    const barraAgua = document.getElementById('barra-agua');
    const luzVerde = document.getElementById('verde');
    const luzRoja = document.getElementById('roja');
    const ctx = document.getElementById('grafica-consumo').getContext('2d');

    let datosPulsos = [];
    let flujoActivo = false;
    let tiempoFlujo = 0;
    let timer;
    const minutosMax = 5; // 5 minutos
    const segundosMax = minutosMax * 60;
    const capacidadMaxima = 100; // La barra ahora representa % del tiempo

    const graficaConsumo = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Datos de consumo',
                    data: [],
                    borderColor: 'blue',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3
                },
                {
                    label: 'Promedio acumulado',
                    data: [],
                    borderColor: 'brown',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3
                }
            ]
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
                        text: 'Muestras',
                    },
                    ticks: {
                        callback: function (val) {
                            return val + 1;
                        }
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

    function calcularPromediosBloques(datos) {
        const bloqueTamano = 3;
        let promedios = [];
        let bloque = [];
        let promedioAnterior = 0;

        for (let i = 0; i < datos.length; i++) {
            bloque.push(datos[i]);

            if (bloque.length === bloqueTamano || i === datos.length - 1) {
                let suma = bloque.reduce((a, b) => a + b, 0);
                if (promedioAnterior !== 0) {
                    suma += promedioAnterior;
                    promedioAnterior = suma / (bloque.length + 1);
                } else {
                    promedioAnterior = suma / bloque.length;
                }
                promedios.push(promedioAnterior);
                bloque = [];
            }
        }
        return promedios;
    }

    function actualizarGrafica() {
        graficaConsumo.data.labels = datosPulsos.map((_, i) => i + 1);
        graficaConsumo.data.datasets[0].data = datosPulsos;

        const promedios = calcularPromediosBloques(datosPulsos);
        graficaConsumo.data.datasets[1].data = Array.from({ length: datosPulsos.length }, (_, i) => {
            const bloqueIndex = Math.floor(i / 3);
            return promedios[bloqueIndex] || null;
        });

        graficaConsumo.update();
    }

    function actualizarDesdeServidor() {
        fetch('/ultimos_datos')
            .then(response => response.json())
            .then(data => {
                if (data.lecturas && data.lecturas.length > 0) {
                    if (!flujoActivo) {
                        flujoActivo = true;
                        tiempoFlujo = 0;
                        iniciarTemporizador();
                    }
                    datosPulsos = data.lecturas;

                    const litrosTotales = data.lecturas.reduce((a, b) => a + b, 0);
                    inputConsumo.value = litrosTotales.toFixed(2);

                    actualizarGrafica();
                }
            })
            .catch(error => console.error('Error al obtener lecturas:', error));
    }

    function iniciarTemporizador() {
        clearInterval(timer);
        timer = setInterval(() => {
            tiempoFlujo += 1;

            // Avance de barra
            const porcentaje = Math.min((tiempoFlujo / segundosMax) * 100, 100);
            barraAgua.style.width = `${porcentaje}%`;

            if (tiempoFlujo <= 240) { // Hasta 4 min (verde)
                luzVerde.style.display = 'block';
                luzRoja.style.display = 'none';
            } else { // Después de 4 min (rojo)
                luzVerde.style.display = 'none';
                luzRoja.style.display = 'block';
            }

            if (tiempoFlujo >= segundosMax) { // Reinicio a los 5 minutos
                flujoActivo = false;
                clearInterval(timer);
                datosPulsos = [];
                inputConsumo.value = '0.00';
                barraAgua.style.width = '0%';
                actualizarGrafica();
                luzVerde.style.display = 'none';
                luzRoja.style.display = 'none';
            }
        }, 1000);
    }

    // Revisar cada 5 segundos si hay nuevos datos
    setInterval(actualizarDesdeServidor, 5000);
});
